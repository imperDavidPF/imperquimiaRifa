import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { evaluarCuotaPorCanal, formatearDetalleCuota } from "../utils/reglaCuotaCanal.js";
import type { FilaVendedorExcel } from "../utils/parseVendedoresExcel.js";
import {
    calcularBolsaCompania,
    repartirBolsaEntreVendedores,
    consolidarPorSupervisor,
    esCebeScalingUp,
    TRAMOS_DEFAULT,
    UMBRAL_ACTIVACION_DEFAULT,
    TOPE_MENSUAL_DEFAULT,
    CEBES_SCALING_UP_DEFAULT,
    type TramoPremio,
} from "../utils/premioEfectivo.js";

export const premioEfectivoRouter = Router();

async function obtenerOCrearConfig(mesClave: string) {
    const existente = await prisma.premioEfectivoConfig.findUnique({ where: { mesClave } });
    if (existente) return existente;

    return prisma.premioEfectivoConfig.create({
        data: {
            mesClave,
            presupuestoBase: 0,
            umbralActivacion: UMBRAL_ACTIVACION_DEFAULT,
            topeMensual: TOPE_MENSUAL_DEFAULT,
            tramos: TRAMOS_DEFAULT as unknown as object,
            cebesScalingUp: CEBES_SCALING_UP_DEFAULT as unknown as object,
        },
    });
}

premioEfectivoRouter.get("/:mesClave", asyncHandler(async (req, res) => {
    const { mesClave } = req.params;

    const config = await obtenerOCrearConfig(mesClave);
    const tramos = config.tramos as unknown as TramoPremio[];
    const cebesScalingUp = config.cebesScalingUp as unknown as string[];

    const [filasVenta, todosParticipantes] = await Promise.all([
        prisma.ventaCanalMes.findMany({ where: { mesClave }, include: { participante: true } }),
        prisma.participante.findMany(),
    ]);

    const nombrePorSupervisorId = new Map(todosParticipantes.map((p) => [p.id, p.nombre]));
    const supervisorIdPorParticipanteId = new Map(todosParticipantes.map((p) => [p.id, p.supervisorId]));

    // Scaling Up sí se saca de la venta de compañía (su venta no cuenta ni para el
    // acumulable ni para el reparto). excluidoPremioEfectivo es distinto: su venta SI sigue
    // contando para la venta real/acumulable de compañía, solo que no participa en el
    // reparto individual (no recibe boletos ni dinero).
    const filasExcluidasDeCompania = filasVenta.filter((f) => esCebeScalingUp(f.cebe, cebesScalingUp));
    const filasVentaReal = filasVenta.filter((f) => !esCebeScalingUp(f.cebe, cebesScalingUp));
    const filasParaReparto = filasVentaReal.filter((f) => !f.participante.excluidoPremioEfectivo);

    const ventaReal = filasVentaReal.reduce((acc, f) => acc + f.venta, 0);
    const compania = calcularBolsaCompania(ventaReal, {
        presupuestoBase: config.presupuestoBase,
        umbralActivacion: config.umbralActivacion,
        topeMensual: config.topeMensual,
        tramos,
    });

    const scalingUpExcluido = (() => {
        const mapa = new Map<string, number>();
        for (const f of filasExcluidasDeCompania) {
            mapa.set(f.cebe, (mapa.get(f.cebe) ?? 0) + f.venta);
        }
        return [...mapa.entries()].map(([cebe, venta]) => ({ cebe, venta }));
    })();

    const filasParaCuota: FilaVendedorExcel[] = filasParaReparto.map((f) => ({
        cebe: f.cebe,
        numeroEmpleado: f.participanteId,
        nombre: f.participante.nombre,
        canal: f.canal,
        meta: f.meta,
        venta: f.venta,
    }));
    const resultadosCuota = evaluarCuotaPorCanal(filasParaCuota);

    const vendedoresBase = resultadosCuota.map((r) => ({
        participanteId: r.numeroEmpleado,
        nombre: r.nombre,
        ventaTotal: r.canales.reduce((acc, c) => acc + c.venta, 0),
        metaTotal: r.canales.reduce((acc, c) => acc + c.meta, 0),
        elegible: r.cuotaCumplida,
        detalleCuota: formatearDetalleCuota(r.canales),
        supervisorId: supervisorIdPorParticipanteId.get(r.numeroEmpleado) ?? null,
    }));

    const porVendedor = repartirBolsaEntreVendedores(vendedoresBase, compania.bolsaTotal)
        .sort((a, b) => b.excedente - a.excedente);

    const porSupervisor = consolidarPorSupervisor(porVendedor, nombrePorSupervisorId);

    res.json({
        mesClave,
        config: {
            presupuestoBase: config.presupuestoBase,
            umbralActivacion: config.umbralActivacion,
            topeMensual: config.topeMensual,
            tramos,
            cebesScalingUp,
        },
        compania,
        porVendedor,
        porSupervisor,
        scalingUpExcluido,
        sinDatos: filasVenta.length === 0,
    });
}));

premioEfectivoRouter.put("/:mesClave/config", asyncHandler(async (req, res) => {
    const { mesClave } = req.params;
    const { presupuestoBase, umbralActivacion, topeMensual, tramos, cebesScalingUp } = req.body as {
        presupuestoBase?: number;
        umbralActivacion?: number;
        topeMensual?: number;
        tramos?: TramoPremio[];
        cebesScalingUp?: string[];
    };

    if (
        presupuestoBase == null ||
        umbralActivacion == null ||
        topeMensual == null ||
        !tramos?.length ||
        !Array.isArray(cebesScalingUp)
    ) {
        return res.status(400).json({
            error: "presupuestoBase, umbralActivacion, topeMensual, tramos y cebesScalingUp son requeridos",
        });
    }

    const config = await prisma.premioEfectivoConfig.upsert({
        where: { mesClave },
        update: {
            presupuestoBase,
            umbralActivacion,
            topeMensual,
            tramos: tramos as unknown as object,
            cebesScalingUp: cebesScalingUp as unknown as object,
        },
        create: {
            mesClave,
            presupuestoBase,
            umbralActivacion,
            topeMensual,
            tramos: tramos as unknown as object,
            cebesScalingUp: cebesScalingUp as unknown as object,
        },
    });

    res.json(config);
}));
