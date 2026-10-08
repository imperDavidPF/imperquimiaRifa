import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authRouter = Router();

authRouter.post("/login", asyncHandler(async (req, res) => {
    const { numeroEmpleado } = req.body as { numeroEmpleado?: string };
    if (!numeroEmpleado || !numeroEmpleado.trim()) {
        return res.status(400).json({ error: "numeroEmpleado es requerido" });
    }

    const empleado = await prisma.empleado.findUnique({
        where: { numeroEmpleado: numeroEmpleado.trim() },
    });

    if (!empleado) {
        return res.status(404).json({ error: "No encontramos ese numero de empleado." });
    }

    res.json({
        numeroEmpleado: empleado.numeroEmpleado,
        nombre: empleado.nombre,
        rol: empleado.rol,
        participanteId: empleado.participanteId ?? undefined,
    });
}));