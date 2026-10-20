import * as XLSX from "xlsx";

export interface FilaVendedorExcel {
    cebe: string;
    numeroEmpleado: string;
    nombre: string;
    canal: string;
    meta: number;
    venta: number;
}

export function parsearVendedoresDesdeBuffer(buffer: Buffer): FilaVendedorExcel[] {
    const libro = XLSX.read(buffer, { type: "buffer" });
    const hoja = libro.Sheets[libro.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { defval: null, raw: true });

    return filas
        .filter((f) => f.NUMERO_EMPLEADO != null)
        .map((f) => ({
            cebe: String(f.CEBE ?? "").trim(),
            numeroEmpleado: String(f.NUMERO_EMPLEADO).trim(),
            nombre: String(f.NOMBRE ?? "").trim(),
            canal: String(f.CANAL ?? "").trim(),
            meta: Number(f.META ?? 0),
            venta: Number(f.VENTA ?? 0),
        }));
}