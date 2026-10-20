import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Base fija de la Regla 2 (venta extra por bloque), vigente para todo el concurso
// (octubre-diciembre 2026). nombreReferencia es solo para auditar el origen del dato.
const BASES: { numeroEmpleado: string; nombreReferencia: string; bloque: string; baseMensual: number }[] = [
    { numeroEmpleado: '32009637', nombreReferencia: 'Armando Quintana', bloque: 'Bloque 1', baseMensual: 637339 },
    { numeroEmpleado: '32009500', nombreReferencia: 'Israel Almanza', bloque: 'Bloque 1', baseMensual: 74850 },
    { numeroEmpleado: '32000129', nombreReferencia: 'Ivonne Reyna', bloque: 'Bloque 1', baseMensual: 679807 },
    { numeroEmpleado: '32004927', nombreReferencia: 'Cancun', bloque: 'Bloque 1', baseMensual: 494034 },
    { numeroEmpleado: '32007633', nombreReferencia: 'Chihuahua', bloque: 'Bloque 1', baseMensual: 348230 },
    { numeroEmpleado: '32047378', nombreReferencia: 'Culiacan', bloque: 'Bloque 1', baseMensual: 474369 },
    { numeroEmpleado: '32008542', nombreReferencia: 'Ecatepec', bloque: 'Bloque 1', baseMensual: 489167 },
    { numeroEmpleado: '32093828', nombreReferencia: 'Hermosillo', bloque: 'Bloque 1', baseMensual: 223570 },
    { numeroEmpleado: '32997388', nombreReferencia: 'Leon', bloque: 'Bloque 1', baseMensual: 597660 },
    { numeroEmpleado: '3298482', nombreReferencia: 'Merida', bloque: 'Bloque 1', baseMensual: 395201 },
    { numeroEmpleado: '32099482', nombreReferencia: 'Mérida II', bloque: 'Bloque 1', baseMensual: 326696 },
    { numeroEmpleado: '32008728', nombreReferencia: 'Queretaro', bloque: 'Bloque 1', baseMensual: 488115 },
    { numeroEmpleado: '320993828', nombreReferencia: 'Tijuana', bloque: 'Bloque 1', baseMensual: 505933 },
    { numeroEmpleado: '3298483', nombreReferencia: 'Veracruz', bloque: 'Bloque 1', baseMensual: 710586 },
    { numeroEmpleado: '32009257', nombreReferencia: 'Edwin Villareal', bloque: 'Bloque 2', baseMensual: 1520478 },
    { numeroEmpleado: '32005564', nombreReferencia: 'Esmeralda Zárate', bloque: 'Bloque 2', baseMensual: 1354748 },
    { numeroEmpleado: '32005599', nombreReferencia: 'Jose Rodriguez', bloque: 'Bloque 2', baseMensual: 1672721 },
    { numeroEmpleado: '32009674', nombreReferencia: 'Oscar Marquez', bloque: 'Bloque 2', baseMensual: 951114 },
    { numeroEmpleado: '32005664', nombreReferencia: 'Hugo Aguilar', bloque: 'Bloque 2', baseMensual: 1870773 },
    { numeroEmpleado: '32005634', nombreReferencia: 'Mauricio Perez', bloque: 'Bloque 2', baseMensual: 1254357 },
    { numeroEmpleado: '32009388', nombreReferencia: 'Yareni Morgado', bloque: 'Bloque 2', baseMensual: 1972033 },
    { numeroEmpleado: '32005357', nombreReferencia: 'Carla Yessica Romero N.', bloque: 'Bloque 2', baseMensual: 1124680 },
    { numeroEmpleado: '32005518', nombreReferencia: 'Diego Villalta', bloque: 'Bloque 2', baseMensual: 1700006 },
    { numeroEmpleado: '32005588', nombreReferencia: 'Jorge Luis Muñoz', bloque: 'Bloque 2', baseMensual: 1121670 },
    { numeroEmpleado: '32005633', nombreReferencia: 'Mauricio Galindo', bloque: 'Bloque 2', baseMensual: 760511 },
    { numeroEmpleado: '32005477', nombreReferencia: 'Santiago Miranda', bloque: 'Bloque 2', baseMensual: 1038474 },
    { numeroEmpleado: '32005626', nombreReferencia: 'Sergio Quiroz', bloque: 'Bloque 2', baseMensual: 1740092 },
    { numeroEmpleado: '32008976', nombreReferencia: 'Acapulco', bloque: 'Bloque 2', baseMensual: 1327189 },
    { numeroEmpleado: '32007487', nombreReferencia: 'Cuernavaca', bloque: 'Bloque 2', baseMensual: 1498445 },
    { numeroEmpleado: '32984839', nombreReferencia: 'Ermita', bloque: 'Bloque 2', baseMensual: 1112992 },
    { numeroEmpleado: '3298424', nombreReferencia: 'Guadalajara', bloque: 'Bloque 2', baseMensual: 906138 },
    { numeroEmpleado: '320084834', nombreReferencia: 'La Raza', bloque: 'Bloque 2', baseMensual: 1724661 },
    { numeroEmpleado: '32008482', nombreReferencia: 'Mixcoac', bloque: 'Bloque 2', baseMensual: 1652618 },
    { numeroEmpleado: '320098482', nombreReferencia: 'Monterrey', bloque: 'Bloque 2', baseMensual: 952078 },
    { numeroEmpleado: '320037473', nombreReferencia: 'Perisur', bloque: 'Bloque 2', baseMensual: 1260601 },
    { numeroEmpleado: '3200038298', nombreReferencia: 'Satelite', bloque: 'Bloque 2', baseMensual: 1272864 },
    { numeroEmpleado: '32098282', nombreReferencia: 'Villahermosa', bloque: 'Bloque 2', baseMensual: 1023345 },
    { numeroEmpleado: '32009707', nombreReferencia: 'Francisco Gomez', bloque: 'Bloque 3', baseMensual: 2639930 },
    { numeroEmpleado: '32009308', nombreReferencia: 'Juan Pablo Guzman', bloque: 'Bloque 3', baseMensual: 4743402 },
    { numeroEmpleado: '32009638', nombreReferencia: 'Karla Mora', bloque: 'Bloque 3', baseMensual: 2522754 },
    { numeroEmpleado: '32005573', nombreReferencia: 'Francisco Granados', bloque: 'Bloque 3', baseMensual: 2844573 },
    { numeroEmpleado: '32005465', nombreReferencia: 'Jorge Roman', bloque: 'Bloque 3', baseMensual: 2633136 },
    { numeroEmpleado: '32005663', nombreReferencia: 'Jose Alberto Sanchez', bloque: 'Bloque 3', baseMensual: 3807479 },
    { numeroEmpleado: '32005422', nombreReferencia: 'Mathias Pech Ulac', bloque: 'Bloque 3', baseMensual: 4086510 },
    { numeroEmpleado: '32005109', nombreReferencia: 'Luis E. Orta', bloque: 'Bloque 3', baseMensual: 3109494 },
    { numeroEmpleado: '32005311', nombreReferencia: 'Victor Ivan Gonzalez', bloque: 'Bloque 3', baseMensual: 2279216 },
    { numeroEmpleado: '32005522', nombreReferencia: 'Alexis Salinas', bloque: 'Bloque 3', baseMensual: 2886039 },
    { numeroEmpleado: '32005598', nombreReferencia: 'Ricardo Rubio', bloque: 'Bloque 3', baseMensual: 4191581 },
    { numeroEmpleado: '32009676', nombreReferencia: 'Alfonso González', bloque: 'Bloque 3', baseMensual: 3000000 },
    { numeroEmpleado: '32009680', nombreReferencia: 'Javier Salas', bloque: 'Bloque 3', baseMensual: 3000000 },
    { numeroEmpleado: '32005636', nombreReferencia: 'Yessenia Zamudio', bloque: 'Bloque 3', baseMensual: 3800000 },
    { numeroEmpleado: '32009017', nombreReferencia: 'Mario Rodriguez', bloque: 'Bloque 4', baseMensual: 5754105 },
    { numeroEmpleado: '32009190', nombreReferencia: 'Monica Angel', bloque: 'Bloque 4', baseMensual: 8947173 },
];

async function main() {
    let creados = 0;
    let actualizados = 0;
    const noEncontrados: string[] = [];

    for (const b of BASES) {
        const participante = await prisma.participante.findUnique({ where: { numeroEmpleado: b.numeroEmpleado } });
        if (!participante) {
            noEncontrados.push(`${b.numeroEmpleado} (${b.nombreReferencia})`);
            continue;
        }

        const existente = await prisma.baseBloqueVentas.findUnique({ where: { participanteId: participante.id } });
        await prisma.baseBloqueVentas.upsert({
            where: { participanteId: participante.id },
            update: { bloque: b.bloque, baseMensual: b.baseMensual },
            create: { participanteId: participante.id, bloque: b.bloque, baseMensual: b.baseMensual },
        });

        if (existente) actualizados++; else creados++;
    }

    console.log(`Creados: ${creados}, actualizados: ${actualizados}, no encontrados: ${noEncontrados.length}`);
    if (noEncontrados.length) console.log("No encontrados:", noEncontrados.join(", "));
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
