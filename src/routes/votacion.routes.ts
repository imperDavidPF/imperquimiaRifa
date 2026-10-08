import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { obtenerVentanasAutomaticas, ventanaAbiertaPara } from "../utils/ventanasAutomaticas.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const votacionRouter = Router();

votacionRouter.get("/ventanas", (_req, res) => {
    res.json(obtenerVentanasAutomaticas());
});

votacionRouter.get("/votos",asyncHandler( async (_req, res) => {
    const votos = await prisma.votoHistorico.findMany({
        include: { nominaciones: { include: { participante: true } } },
        orderBy: { fechaEmision: "desc" },
    });
    res.json(votos);
}));

votacionRouter.post("/votos", asyncHandler( async (req, res) => {
    const { mesClave, votanteNumeroEmpleado, folios, nominaciones } = req.body as {
        mesClave?: string;
        votanteNumeroEmpleado?: string;
        folios?: string[];
        nominaciones?: { participanteId: string; boletos: number; justificacion: string }[];
    };

    if (!mesClave || !votanteNumeroEmpleado || !nominaciones?.length) {
        return res.status(400).json({ error: "mesClave, votanteNumeroEmpleado y nominaciones son requeridos" });
    }

    if (!ventanaAbiertaPara(mesClave)) {
        return res.status(409).json({ error: "La ventana de votación de este mes no está abierta" });
    }

    try {
        const voto = await prisma.votoHistorico.create({
            data: {
                mesClave,
                votanteNumeroEmpleado,
                folios: folios ?? [],
                nominaciones: {
                    create: nominaciones.map((n) => ({
                        participanteId: n.participanteId,
                        boletos: n.boletos,
                        justificacion: n.justificacion,
                    })),
                },
            },
            include: { nominaciones: { include: { participante: true } } },
        });
        res.status(201).json(voto);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2002") {
                return res.status(409).json({ error: "Ya existe un voto de este colaborador para este mes" });
            }
            if (error.code === "P2003") {
                return res.status(400).json({ error: "Uno de los colaboradores nominados no existe" });
            }
        }
        throw error;
    }
}));

votacionRouter.patch("/nominaciones/:id", asyncHandler( async (req, res) => {
    const { estado } = req.body as { estado?: "pendiente" | "aprobado" | "rechazado" };
    if (!estado || !["pendiente", "aprobado", "rechazado"].includes(estado)) {
        return res.status(400).json({ error: "estado debe ser pendiente, aprobado o rechazado" });
    }

    const nominacion = await prisma.nominacion.update({
        where: { id: req.params.id },
        data: { estado, fechaRevision: new Date() },
        include: { participante: true },
    });
    res.json(nominacion);
}));