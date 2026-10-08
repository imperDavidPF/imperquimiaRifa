import { Router } from "express";
import multer from "multer";
import { prisma } from "../lib/prisma.js";
import { parsearPersonalDesdeBuffer } from "../utils/parseExcelPersonal.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const participantesRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

function normalizarTipo(valor: unknown): "comercial" | "no_comercial" {
    return valor === "comercial" ? "comercial" : "no_comercial";
}

participantesRouter.get("/",asyncHandler(async (_req, res) => {
    const lista = await prisma.participante.findMany({ orderBy: { nombre: "asc" } });
    res.json(lista);
}));

participantesRouter.post("/", asyncHandler(async (req, res) => {
    const { numeroEmpleado, nombre, departamento, puesto, area, tipo } = req.body as {
        numeroEmpleado?: string; nombre?: string; departamento?: string; puesto?: string; area?: string; tipo?: string;
    };
    if (!numeroEmpleado?.trim() || !nombre?.trim() || !area?.trim()) {
        return res.status(400).json({ error: "numeroEmpleado, nombre y area son requeridos" });
    }

    const existente = await prisma.participante.findUnique({ where: { numeroEmpleado: numeroEmpleado.trim() } });
    if (existente) {
        return res.status(409).json({ error: "Ya existe un participante con ese numero de empleado" });
    }

    const participante = await prisma.participante.create({
        data: {
            numeroEmpleado: numeroEmpleado.trim(),
            nombre: nombre.trim(),
            departamento: departamento?.trim() ?? "",
            puesto: puesto?.trim() ?? "",
            area: area.trim(),
            tipo: normalizarTipo(tipo),
        },
    });

    await prisma.empleado.upsert({
        where: { numeroEmpleado: participante.numeroEmpleado },
        update: { nombre: participante.nombre, participanteId: participante.id },
        create: { numeroEmpleado: participante.numeroEmpleado, nombre: participante.nombre, rol: "votante", participanteId: participante.id },
    });

    res.status(201).json(participante);
}));

participantesRouter.patch("/:id", asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { nombre, departamento, puesto, area, tipo } = req.body as {
        nombre?: string; departamento?: string; puesto?: string; area?: string; tipo?: string;
    };

    const participante = await prisma.participante.update({
        where: { id },
        data: {
            ...(nombre !== undefined ? { nombre } : {}),
            ...(departamento !== undefined ? { departamento } : {}),
            ...(puesto !== undefined ? { puesto } : {}),
            ...(area !== undefined ? { area } : {}),
            ...(tipo !== undefined ? { tipo: normalizarTipo(tipo) } : {}),
        },
    });

    if (nombre !== undefined) {
        await prisma.empleado.updateMany({ where: { participanteId: id }, data: { nombre } });
    }

    res.json(participante);
}));

participantesRouter.post("/:id/desactivar", asyncHandler(async (req, res) => {
    const participante = await prisma.participante.update({
        where: { id: req.params.id },
        data: { estatus: "inactivo", fechaBaja: new Date() },
    });
    res.json(participante);
}));

participantesRouter.post("/:id/reactivar", asyncHandler( async (req, res) => {
    const participante = await prisma.participante.update({
        where: { id: req.params.id },
        data: { estatus: "activo", fechaBaja: null },
    });
    res.json(participante);
}));

participantesRouter.post("/importar-excel", upload.single("archivo"), asyncHandler( async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "Debes adjuntar un archivo con el campo \"archivo\"" });
    }

    let filas;
    try {
        filas = parsearPersonalDesdeBuffer(req.file.buffer);
    } catch (error) {
        return res.status(400).json({ error: error instanceof Error ? error.message : "No se pudo leer el archivo" });
    }

    const existentes = new Set((await prisma.participante.findMany({ select: { numeroEmpleado: true } })).map((p) => p.numeroEmpleado));
    const omitidosPorDuplicado: string[] = [];
    let agregados = 0;

    for (const fila of filas) {
        if (existentes.has(fila.numeroEmpleado)) {
            omitidosPorDuplicado.push(fila.numeroEmpleado);
            continue;
        }
        existentes.add(fila.numeroEmpleado);

        const participante = await prisma.participante.create({
            data: { numeroEmpleado: fila.numeroEmpleado, nombre: fila.nombre, departamento: "", puesto: fila.puesto, area: fila.area, tipo: fila.tipo },
        });

        await prisma.empleado.upsert({
            where: { numeroEmpleado: participante.numeroEmpleado },
            update: { nombre: participante.nombre, participanteId: participante.id },
            create: { numeroEmpleado: participante.numeroEmpleado, nombre: participante.nombre, rol: "votante", participanteId: participante.id },
        });

        agregados++;
    }

    res.json({ agregados, omitidosPorDuplicado });
}));

participantesRouter.post("/reemplazar-excel", upload.single("archivo"), asyncHandler( async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "Debes adjuntar un archivo con el campo \"archivo\"" });
    }

    let filas;
    try {
        filas = parsearPersonalDesdeBuffer(req.file.buffer);
    } catch (error) {
        return res.status(400).json({ error: error instanceof Error ? error.message : "No se pudo leer el archivo" });
    }

    const numerosEnExcel = filas.map((f) => f.numeroEmpleado);

    let creados = 0;
    let actualizados = 0;

    for (const fila of filas) {
        const existente = await prisma.participante.findUnique({ where: { numeroEmpleado: fila.numeroEmpleado } });

        const participante = await prisma.participante.upsert({
            where: { numeroEmpleado: fila.numeroEmpleado },
            update: {
                nombre: fila.nombre,
                puesto: fila.puesto,
                area: fila.area,
                tipo: fila.tipo,
                estatus: "activo",
                fechaBaja: null,
            },
            create: {
                numeroEmpleado: fila.numeroEmpleado,
                nombre: fila.nombre,
                departamento: "",
                puesto: fila.puesto,
                area: fila.area,
                tipo: fila.tipo,
            },
        });

        if (existente) actualizados++; else creados++;

        await prisma.empleado.upsert({
            where: { numeroEmpleado: fila.numeroEmpleado },
            update: { nombre: fila.nombre, participanteId: participante.id },
            create: { numeroEmpleado: fila.numeroEmpleado, nombre: fila.nombre, rol: "votante", participanteId: participante.id },
        });
    }

    const obsoletos = await prisma.participante.findMany({
        where: { numeroEmpleado: { notIn: numerosEnExcel } },
    });

    let eliminados = 0;
    const inactivadosPorHistorial: string[] = [];

    for (const obsoleto of obsoletos) {
        try {
            await prisma.empleado.deleteMany({ where: { participanteId: obsoleto.id } });
            await prisma.participante.delete({ where: { id: obsoleto.id } });
            eliminados++;
        } catch {
            await prisma.participante.update({
                where: { id: obsoleto.id },
                data: { estatus: "inactivo", fechaBaja: new Date() },
            });
            inactivadosPorHistorial.push(obsoleto.numeroEmpleado);
        }
    }

    res.json({ creados, actualizados, eliminados, inactivadosPorHistorial });
}));