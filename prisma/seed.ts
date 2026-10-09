import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";
import { parsearPersonalDesdeBuffer } from "../src/utils/parseExcelPersonal.js";

const prisma = new PrismaClient();

const ADMINS_GENERICOS = [
    { numeroEmpleado: "9001", nombre: "Admin Comercial", rol: "admin_comercial" },
    { numeroEmpleado: "9002", nombre: "Dirección General", rol: "direccion_general" },
    { numeroEmpleado: "9003", nombre: "Recursos Humanos", rol: "rh" },
];

async function main() {
    // Los admins genéricos se siembran siempre, sin depender del Excel: son el acceso
    // inicial para entrar a la pantalla de administración y subir el Excel desde ahí.
    for (const admin of ADMINS_GENERICOS) {
        await prisma.empleado.upsert({
            where: { numeroEmpleado: admin.numeroEmpleado },
            update: { nombre: admin.nombre, rol: admin.rol },
            create: admin,
        });
    }
    console.log(`Admins genéricos listos: ${ADMINS_GENERICOS.map((a) => a.numeroEmpleado).join(", ")}`);

    const rutaExcel = process.env.PERSONAL_XLSX_PATH;
    if (!rutaExcel || !existsSync(rutaExcel)) {
        console.log("PERSONAL_XLSX_PATH no está definido o el archivo no existe: se omite la carga del Excel.");
        return;
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

    console.log(`Seed completado: ${filas.length} participantes/empleados del Excel.`);
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });