import type { FilaVendedorExcel } from "./parseVendedoresExcel.js";

export interface CanalResultado {
    canal: string;
    meta: number;
    venta: number;
    cumplimiento: number;
}

export interface ResultadoVendedor {
    numeroEmpleado: string;
    nombre: string;
    canales: CanalResultado[];
    cuotaCumplida: boolean;
}

const UMBRAL_PRINCIPAL = 100;
const UMBRAL_SECUNDARIO = 90;

export function evaluarCuotaPorCanal(filas: FilaVendedorExcel[]): ResultadoVendedor[] {
    const porEmpleado = new Map<string, FilaVendedorExcel[]>();
    for (const fila of filas) {
        const lista = porEmpleado.get(fila.numeroEmpleado) ?? [];
        lista.push(fila);
        porEmpleado.set(fila.numeroEmpleado, lista);
    }

    const resultados: ResultadoVendedor[] = [];
    for (const [numeroEmpleado, filasEmpleado] of porEmpleado) {
        const canales: CanalResultado[] = filasEmpleado.map((f) => ({
            canal: f.canal,
            meta: f.meta,
            venta: f.venta,
            cumplimiento: f.meta > 0 ? (f.venta / f.meta) * 100 : 0,
        }));

        const ordenados = [...canales].sort((a, b) => b.cumplimiento - a.cumplimiento);
        const cuotaCumplida =
            ordenados.length === 1
                ? ordenados[0].cumplimiento >= UMBRAL_PRINCIPAL
                : ordenados[0].cumplimiento >= UMBRAL_PRINCIPAL && ordenados[1].cumplimiento >= UMBRAL_SECUNDARIO;

        resultados.push({ numeroEmpleado, nombre: filasEmpleado[0].nombre, canales, cuotaCumplida });
    }

    return resultados;
}

export function formatearDetalleCuota(canales: CanalResultado[]): string {
    return canales.map((c) => `${c.canal}: ${c.cumplimiento.toFixed(1)}%`).join(" | ");
}