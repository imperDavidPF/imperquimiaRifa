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

        const filas = parsearVendedoresDesdeBuffer(req.file.buffer);

        // Regla 1 · Cuota por canal
        const resultadosCuota = evaluarCuotaPorCanal(filas);
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

        const resultadosBloque = evaluarVentaExtraPorBloque(filas, basesPorNumeroEmpleado);
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
