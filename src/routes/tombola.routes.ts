import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const tombolaRouter = Router();

tombolaRouter.get("/premios", asyncHandler(async (_req, res) => {
    const premios = await prisma.premio.findMany({ orderBy: { orden: "asc" } });
    res.json(premios);
}));

tombolaRouter.post("/premios", asyncHandler(async (req, res) => {
    const { nombre, categoria, orden, imagenUrl } = req.body as {
        nombre?: string; categoria?: "mayor" | "menor"; orden?: number; imagenUrl?: string;
    };
    if (!nombre?.trim() || (categoria !== "mayor" && categoria !== "menor") || typeof orden !== "number") {
        return res.status(400).json({ error: "nombre, categoria ('mayor'|'menor') y orden son requeridos" });
    }

    const premio = await prisma.premio.create({
        data: { nombre: nombre.trim(), categoria, orden, imagenUrl: imagenUrl?.trim() || null },
    });
    res.status(201).json(premio);
}));

tombolaRouter.get("/ganadores", asyncHandler(async (_req, res) => {
    const ganadores = await prisma.ganadorPremio.findMany({ orderBy: { fechaSorteo: "asc" } });
    res.json(ganadores);
}));

tombolaRouter.post("/premios/:id/sortear", asyncHandler(async (req, res) => {
    const premioId = req.params.id;
    const { elegibles } = req.body as { elegibles?: { participanteId: string; boletos: number }[] };

    if (!elegibles?.length) {
        return res.status(400).json({ error: "Debes enviar la lista de participantes elegibles con sus boletos" });
    }

    const premio = await prisma.premio.findUnique({ where: { id: premioId } });
    if (!premio) {
        return res.status(404).json({ error: "El premio no existe" });
    }

    // Reclamo atómico: si dos requests llegan al mismo tiempo, solo una actualiza una fila (count=1); la otra ve count=0.
    const reclamo = await prisma.premio.updateMany({
        where: { id: premioId, sorteado: false },
        data: { sorteado: true },
    });
    if (reclamo.count === 0) {
        return res.status(409).json({ error: "Este premio ya fue sorteado" });
    }

    try {
        let bolsaParticipantes = elegibles;

        if (premio.categoria === "mayor") {
            const ganadoresDeMayores = await prisma.ganadorPremio.findMany({
                where: { premio: { categoria: "mayor" } },
                select: { participanteId: true },
            });
            const idsExcluidos = new Set(ganadoresDeMayores.map((g) => g.participanteId));
            bolsaParticipantes = elegibles.filter((e) => !idsExcluidos.has(e.participanteId));
        }

        const bolsa: string[] = [];
        for (const e of bolsaParticipantes) {
            for (let i = 0; i < e.boletos; i++) bolsa.push(e.participanteId);
        }

        if (bolsa.length === 0) {
            await prisma.premio.update({ where: { id: premioId }, data: { sorteado: false } });
            return res.status(400).json({ error: "No hay participantes elegibles para este premio" });
        }

        const participanteGanadorId = bolsa[Math.floor(Math.random() * bolsa.length)];

        const ganador = await prisma.ganadorPremio.create({
            data: {
                premioId,
                participanteId: participanteGanadorId,
                folioGanador: `BOLETO-${Date.now()}`,
            },
        });

        res.status(201).json(ganador);
    } catch (error) {
        await prisma.premio.update({ where: { id: premioId }, data: { sorteado: false } });
        throw error;
    }
}));