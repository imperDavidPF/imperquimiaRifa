export interface DefinicionBloque {
    nombre: string;
    umbralExtra: number;
}

export const BLOQUES_VENTAS: DefinicionBloque[] = [
    { nombre: 'Bloque 1', umbralExtra: 50_000 },
    { nombre: 'Bloque 2', umbralExtra: 100_000 },
    { nombre: 'Bloque 3', umbralExtra: 250_000 },
    { nombre: 'Bloque 4', umbralExtra: 500_000 },
];

export function umbralDeBloque(bloque: string): number | undefined {
    return BLOQUES_VENTAS.find((b) => b.nombre === bloque)?.umbralExtra;
}
