import * as XLSX from "xlsx";


export interface FilaPersonal {
    numeroEmpleado: string;
    nombre: string;
    puesto: string;
    area: string;
    tipo: "comercial" | "no_comercial";
}

function normalizarEncabezado(valor: unknown): string {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

function encontrarIndiceColumna(encabezados: string[], coincidencias: string[]): number {
    return encabezados.findIndex((encabezado) => coincidencias.some((c) => encabezado.includes(c)));
}

function normalizarTipo(valor: unknown): "comercial" | "no_comercial" {
    const texto = String(valor ?? "").trim().toLowerCase();
    return texto === "comercial" ? "comercial" : "no_comercial";
}

export function parsearPersonalDesdeBuffer(buffer: Buffer): FilaPersonal[] {
    const libro = XLSX.read(buffer, { type: "buffer" });
    const hoja = libro.Sheets[libro.SheetNames[0]];
    const filas: unknown[][] = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: "", blankrows: false });

    if (filas.length < 2) {
        throw new Error("El archivo no tiene filas de datos debajo del encabezado.");
    }

    const encabezados = filas[0].map(normalizarEncabezado);
    const idxId = encontrarIndiceColumna(encabezados, ["id de colaborador", "id colaborador", "numero de empleado", "no. empleado", "id"]);
    const idxNombre = encontrarIndiceColumna(encabezados, ["nombre"]);
    const idxApellidos = encontrarIndiceColumna(encabezados, ["apellido"]);
    const idxPuesto = encontrarIndiceColumna(encabezados, ["puesto"]);
    const idxArea = encontrarIndiceColumna(encabezados, ["area"]);
    const idxTipo = encontrarIndiceColumna(encabezados, ["tipo"]);

    if (idxId === -1 || idxNombre === -1 || idxArea === -1) {
        throw new Error(
            "No se reconocieron las columnas esperadas. Verifica que el archivo tenga al menos: ID de colaborador, Nombre y Área."
        );
    }

    return filas
        .slice(1)
        .map((fila): FilaPersonal | null => {
            const numeroEmpleado = String(fila[idxId] ?? "").trim();
            if (!numeroEmpleado) return null;

            const nombre = [fila[idxNombre], idxApellidos !== -1 ? fila[idxApellidos] : ""]
                .map((v) => String(v ?? "").trim())
                .filter(Boolean)
                .join(" ");

            return {
                numeroEmpleado,
                nombre,
                puesto: idxPuesto !== -1 ? String(fila[idxPuesto] ?? "").trim() : "",
                area: String(fila[idxArea] ?? "").trim(),
                tipo: idxTipo !== -1 ? normalizarTipo(fila[idxTipo]) : "no_comercial",
            };
        })
        .filter((fila): fila is FilaPersonal => fila !== null);
}