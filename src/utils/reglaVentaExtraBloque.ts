import type { FilaVendedorExcel } from "./parseVendedoresExcel.js";
import { umbralDeBloque } from "./bloquesVentas.js";

export interface BaseBloqueInfo {
    bloque: string;
    baseMensual: number;
}

export interface ResultadoVentaExtra {
    numeroEmpleado: string;
    ventaTotalMes: number;
    bloque: string;
    baseMensual: number;
    ventaExtra: number;
    boletos: number;
}

export function evaluarVentaExtraPorBloque(
    filas: FilaVendedorExcel[],
    bases: Map<string, BaseBloqueInfo>
): ResultadoVentaExtra[] {
    const ventaPorEmpleado = new Map<string, number>();
    for (const fila of filas) {
        ventaPorEmpleado.set(fila.numeroEmpleado, (ventaPorEmpleado.get(fila.numeroEmpleado) ?? 0) + fila.venta);
    }

    const resultados: ResultadoVentaExtra[] = [];
    for (const [numeroEmpleado, info] of bases) {
        const ventaTotalMes = ventaPorEmpleado.get(numeroEmpleado) ?? 0;
        const ventaExtra = Math.max(0, ventaTotalMes - info.baseMensual);
        const umbral = umbralDeBloque(info.bloque);
        const boletos = umbral ? Math.floor(ventaExtra / umbral) : 0;

        resultados.push({
            numeroEmpleado,
            ventaTotalMes,
            bloque: info.bloque,
            baseMensual: info.baseMensual,
            ventaExtra,
            boletos,
        });
    }

    return resultados;
}
