import { Router } from "express";
import multer from "multer";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { parsearVendedoresDesdeBuffer } from "../utils/parseVendedoresExcel.js";
import { evaluarCuotaPorCanal, formatearDetalleCuota } from "../utils/reglaCuotaCanal.js";
import { evaluarVentaExtraPorBloque, type BaseBloqueInfo } from "../utils/reglaVentaExtraBloque.js";

export const cierreMesRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

cierreMesRouter.get("/", asyncHandler(async (_req, res) => {
    const cierres = await prisma.cierreMesVentas.findMany({
        include: { filas: true },
        orderBy: { mesClave: "asc" },
    });
    res.json(cierres);
}));


cierreMesRouter.get("/:mesClave/ventas-canal", asyncHandler(async (req, res) => {
    const { mesClave } = req.params;
    const filas = await prisma.ventaCanalMes.findMany({
        where: { mesClave },
        select: { participanteId: true, cebe: true, canal: true, meta: true, venta: true },
    });
    res.json(filas);
}))


cierreMesRouter.put("/:mesClave", asyncHandler(async (req, res) => {
    const { mesClave } = req.params;
    const { mesEtiqueta, filas, aprobado, fechaAprobacion } = req.body as {
        mesEtiqueta: string;
        filas: {
            participanteId: string;
            cuotaCumplida: boolean;
            detalleCuota?: string | null;
            bloque: string | null;
            ventaExtra: number;
            ventaExtraCastigada: number;
            especificaciones: number;
        }[];
        aprobado: boolean;
        fechaAprobacion: string | null;
    };

    await prisma.cierreMesVentas.upsert({
        where: { mesClave },
        update: { mesEtiqueta, aprobado, fechaAprobacion: fechaAprobacion ? new Date(fechaAprobacion) : null },
        create: { mesClave, mesEtiqueta, aprobado, fechaAprobacion: fechaAprobacion ? new Date(fechaAprobacion) : null },
    });

    await prisma.$transaction([
        prisma.filaMatriz.deleteMany({ where: { cierreMesClave: mesClave } }),
        prisma.filaMatriz.createMany({
            data: filas.map((f) => ({
                cierreMesClave: mesClave,
                participanteId: f.participanteId,
                cuotaCumplida: f.cuotaCumplida,
                detalleCuota: f.detalleCuota ?? null,
                bloque: f.bloque,
                ventaExtra: f.ventaExtra,
                ventaExtraCastigada: f.ventaExtraCastigada,
                especificaciones: f.especificaciones,
            })),
        }),
    ]);

    const cierreFinal = await prisma.cierreMesVentas.findUnique({
        where: { mesClave },
        include: { filas: true },
    });
    res.json(cierreFinal);
}));

cierreMesRouter.post(
    "/:mesClave/procesar-excel-ventas",
    upload.single("archivo"),
    asyncHandler(async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: "Debes adjuntar el archivo de vendedores" });
        }
        const { mesClave } = req.params;

        const filas = parsearVendedoresDesdeBuffer(req.file.buffer);

        // Premio Efectivo usa el mismo detalle de venta/meta por canal que este Excel trae;
        // se refresca por completo en cada reproceso del mes para no dejar canales obsoletos.
        const participantesPorNumero = await prisma.participante.findMany({
            where: { numeroEmpleado: { in: filas.map((f) => f.numeroEmpleado) } },
        });
        const participanteIdPorNumero = new Map(participantesPorNumero.map((p) => [p.numeroEmpleado, p.id]));
        const numerosExcluidosBoletos = new Set(
            participantesPorNumero.filter((p) => p.excluidoBoletos).map((p) => p.numeroEmpleado)
        );

        const gerentePorNumeroEmpleado = new Map<string, {numeroGerente: string; gerente: string}>();
        for(const f of filas){
            if(!f.numeroGerente || f.numeroGerente === f.numeroEmpleado) continue;
            gerentePorNumeroEmpleado.set(f.numeroEmpleado, {numeroGerente: f.numeroGerente, gerente: f.gerente ?? ""});
        }

        const numerosGerenteDistintos = [...new Set([...gerentePorNumeroEmpleado.values()].map((g) => g.numeroGerente))];
        const nombrePorNumeroGerente = new Map(
            [...gerentePorNumeroEmpleado.values()].map((g) => [g.numeroGerente, g.gerente])
        );

        if (numerosGerenteDistintos.length > 0) {
            const gerentesExistentes = await prisma.participante.findMany({
                where: { numeroEmpleado: { in: numerosGerenteDistintos } },
            });
            const gerenteIdPorNumero = new Map(gerentesExistentes.map((p) => [p.numeroEmpleado, p.id]));

            const numerosGerenteFaltantes = numerosGerenteDistintos.filter((n) => !gerenteIdPorNumero.has(n));
            for(const numeroGerente of numerosGerenteFaltantes){
                const nuevo = await prisma.participante.create({
                    data: {
                        numeroEmpleado: numeroGerente,
                        nombre: nombrePorNumeroGerente.get(numeroGerente) ?? numeroGerente,
                        area: "",
                        tipo: "no_comercial"
                    },
                });
                gerenteIdPorNumero.set(numeroGerente, nuevo.id);

                //Igual que el resto del sistema (alta manual, importar excel): todo participante 
                //nuevo necesita su empleado (rol votante) para poder loguearse

                await prisma.empleado.upsert({
                    where: {numeroEmpleado: nuevo.numeroEmpleado},
                    update: {nombre: nuevo.nombre, participanteId: nuevo.id},
                    create: {numeroEmpleado: nuevo.numeroEmpleado, nombre: nuevo.numeroEmpleado, rol: "votante", participanteId: nuevo.id}
                });

                console.warn(

                    `[cierre-mes] Gerente numeroEmpleados=${numeroGerente} nombre="${nuevo.nombre}" no existia como Participante - se creo automaticamente desde el excel (con su Empleado de login), mesClave=${mesClave}.`
                )
                
            }

            for (const [numeroEmpleado, { numeroGerente }] of gerentePorNumeroEmpleado) {
                const vendedorId = participanteIdPorNumero.get(numeroEmpleado);
                const gerenteId = gerenteIdPorNumero.get(numeroGerente);
                if (!vendedorId || !gerenteId || vendedorId === gerenteId) continue;
                await prisma.participante.update({
                    where: { id: vendedorId },
                    data: { supervisorId: gerenteId },
                });
            }

        }

        // El mismo numeroEmpleado puede aparecer dos veces en el Excel para el mismo canal
        // (p.ej. cubre dos CEBEs bajo el mismo canal); se agregan en vez de romper el
        // createMany, que exige (mesClave, participanteId, canal) unico.
        const ventaCanalPorClave = new Map<string, { participanteId: string; cebe: string; canal: string; meta: number; venta: number }>();
        let ventaSinParticipante = 0;
        for (const f of filas) {
            const participanteId = participanteIdPorNumero.get(f.numeroEmpleado);
            if (!participanteId) {
                ventaSinParticipante += f.venta;
                console.warn(
                    `[cierre-mes] numeroEmpleado=${f.numeroEmpleado} nombre="${f.nombre}" canal="${f.canal}" venta=${f.venta} no tiene Participante dado de alta — se descarta de VentaCanalMes y Regla 1/2, mesClave=${mesClave}.`
                );
                continue;
            }

            const clave = `${participanteId}|${f.canal}`;
            const existente = ventaCanalPorClave.get(clave);
            if (existente) {
                console.warn(
                    `[cierre-mes] Fila duplicada en Excel: numeroEmpleado=${f.numeroEmpleado} nombre="${f.nombre}" canal="${f.canal}" mesClave=${mesClave} — se suman venta/meta en vez de crear dos filas.`
                );
                existente.meta += f.meta;
                existente.venta += f.venta;
            } else {
                ventaCanalPorClave.set(clave, { participanteId, cebe: f.cebe, canal: f.canal, meta: f.meta, venta: f.venta });
            }
        }

        if (ventaSinParticipante > 0) {
            console.warn(
                `[cierre-mes] mesClave=${mesClave}: venta total descartada por numeroEmpleado sin Participante = ${ventaSinParticipante}`
            );
        }

        await prisma.$transaction([
            prisma.ventaCanalMes.deleteMany({ where: { mesClave } }),
            prisma.ventaCanalMes.createMany({
                data: [...ventaCanalPorClave.values()].map((v) => ({ mesClave, ...v })),
            }),
        ]);

        // numeroEmpleado marcados como excluidoBoletos no participan ni en Regla 1 ni en Regla 2
        // (p.ej. Ventas Planta, E-Commerce, Desarrollo de Negocios no son vendedores de rifa).
        const filasParaBoletos = filas.filter((f) => !numerosExcluidosBoletos.has(f.numeroEmpleado));

        // Regla 1 · Cuota por canal
        const resultadosCuota = evaluarCuotaPorCanal(filasParaBoletos);
        const noEncontradosCuota: string[] = [];
        const aplicadosCuota: {
            participanteId: string;
            numeroEmpleado: string;
            nombre: string;
            cuotaCumplida: boolean;
            detalleCuota: string;
        }[] = [];

        for (const r of resultadosCuota) {
            const participante = await prisma.participante.findUnique({ where: { numeroEmpleado: r.numeroEmpleado } });
            if (!participante) {
                noEncontradosCuota.push(r.numeroEmpleado);
                continue;
            }
            aplicadosCuota.push({
                participanteId: participante.id,
                numeroEmpleado: r.numeroEmpleado,
                nombre: r.nombre,
                cuotaCumplida: r.cuotaCumplida,
                detalleCuota: formatearDetalleCuota(r.canales),
            });
        }

        // Regla 2 · Venta extra por bloque (solo aplica a quien tiene una base fija asignada)
        const basesConParticipante = await prisma.baseBloqueVentas.findMany({ include: { participante: true } });
        const basesPorNumeroEmpleado = new Map<string, BaseBloqueInfo>(
            basesConParticipante.map((b) => [b.participante.numeroEmpleado, { bloque: b.bloque, baseMensual: b.baseMensual }])
        );
        const participantePorNumero = new Map(basesConParticipante.map((b) => [b.participante.numeroEmpleado, b.participante]));

        const resultadosBloque = evaluarVentaExtraPorBloque(filasParaBoletos, basesPorNumeroEmpleado);
        const aplicadosBloque = resultadosBloque.map((r) => {
            const participante = participantePorNumero.get(r.numeroEmpleado)!;
            return {
                participanteId: participante.id,
                numeroEmpleado: r.numeroEmpleado,
                nombre: participante.nombre,
                bloque: r.bloque,
                baseMensual: r.baseMensual,
                ventaTotalMes: r.ventaTotalMes,
                ventaExtra: r.ventaExtra,
                boletos: r.boletos,
            };
        });

        res.json({
            cuotaCanal: { aplicados: aplicadosCuota, noEncontrados: noEncontradosCuota },
            ventaExtraBloque: { aplicados: aplicadosBloque },
        });
    })
);
