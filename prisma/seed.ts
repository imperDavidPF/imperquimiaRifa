import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { parsearPersonalDesdeBuffer } from "../src/utils/parseExcelPersonal.js";

const prisma = new PrismaClient();

const ADMINS_GENERICOS = [
    { numeroEmpleado: "9001", nombre: "Admin Comercial", rol: "admin_comercial" },
    { numeroEmpleado: "9002", nombre: "Dirección General", rol: "direccion_general" },
    { numeroEmpleado: "9003", nombre: "Recursos Humanos", rol: "rh" },
];

async function main() {
    const rutaExcel = process.env.PERSONAL_XLSX_PATH;
    if (!rutaExcel) {
        throw new Error("Define PERSONAL_XLSX_PATH en tu .env apuntando al Excel de listado de personal.");
    }

    const filas = parsearPersonalDesdeBuffer(readFileSync(rutaExcel));
    console.log(`Leídas ${filas.length} filas del Excel.`);

    for (const fila of filas) {
        const participante = await prisma.participante.upsert({
            where: { numeroEmpleado: fila.numeroEmpleado },
            update: { nombre: fila.nombre, puesto: fila.puesto, area: fila.area, tipo: fila.tipo },
            create: {
                numeroEmpleado: fila.numeroEmpleado,
                nombre: fila.nombre,
                departamento: "",
                puesto: fila.puesto,
                area: fila.area,
                tipo: fila.tipo,
            },
        });

        await prisma.empleado.upsert({
            where: { numeroEmpleado: fila.numeroEmpleado },
            update: { nombre: fila.nombre, participanteId: participante.id },
            create: {
                numeroEmpleado: fila.numeroEmpleado,
                nombre: fila.nombre,
                rol: "votante",
                participanteId: participante.id,
            },
        });
    }

    for (const admin of ADMINS_GENERICOS) {
        await prisma.empleado.upsert({
            where: { numeroEmpleado: admin.numeroEmpleado },
            update: { nombre: admin.nombre, rol: admin.rol },
            create: admin,
        });
    }

    console.log(`Seed completado: ${filas.length} participantes/empleados + ${ADMINS_GENERICOS.length} admins genéricos.`);
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });