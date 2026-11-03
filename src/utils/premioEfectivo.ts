export interface TramoPremio {
    desde: number;
    hasta: number | null;
    tasa: number;
}

export interface ConfigPremioEfectivo {
    presupuestoBase: number;
    umbralActivacion: number;
    topeMensual: number;
    tramos: TramoPremio[];
}

export const TRAMOS_DEFAULT: TramoPremio[] = [
    { desde: 5_000_000, hasta: 10_000_000, tasa: 0.02 },
    { desde: 10_000_000, hasta: 15_000_000, tasa: 0.0225 },
    { desde: 15_000_000, hasta: 20_000_000, tasa: 0.025 },
    { desde: 20_000_000, hasta: null, tasa: 0.03 },
];

export const UMBRAL_ACTIVACION_DEFAULT = 5_000_000;
export const TOPE_MENSUAL_DEFAULT = 500_000;

// CEBEs de Scaling Up: se calculan aparte, así que sus filas se excluyen por completo
// (venta de compañía, elegibilidad y reparto) antes de cualquier otro cálculo.
export const CEBES_SCALING_UP_DEFAULT = ['Kam Norte', 'Kam Sureste', 'Kam Centro'];

function normalizarCebe(valor: string): string {
    return valor.trim().toLowerCase();
}

export function esCebeScalingUp(cebe: string, cebesScalingUp: string[]): boolean {
    const normalizado = normalizarCebe(cebe);
    return cebesScalingUp.some((c) => normalizarCebe(c) === normalizado);
}

export interface ResultadoBolsaCompania {
    ventaReal: number;
    presupuestoBase: number;
    excedente: number;
    activa: boolean;
    tramo: TramoPremio | null;
    bolsaBruta: number;
    bolsaTotal: number;
}

// La bolsa aplica una tasa plana (no progresiva) sobre el excedente total, según el tramo
// en el que caiga ese excedente, y se recorta al tope mensual. Confirmado contra los montos
// de ejemplo de la imagen de referencia: 5M*2%=$100k, 10M*2.25%=$225k, 15M*2.5%=$375k.
export function calcularBolsaCompania(ventaReal: number, config: ConfigPremioEfectivo): ResultadoBolsaCompania {
    const excedente = ventaReal - config.presupuestoBase;
    const activa = excedente >= config.umbralActivacion;

    if (!activa) {
        return { ventaReal, presupuestoBase: config.presupuestoBase, excedente, activa, tramo: null, bolsaBruta: 0, bolsaTotal: 0 };
    }

    const tramo = config.tramos.find((t) => excedente >= t.desde && (t.hasta === null || excedente < t.hasta)) ?? null;
    const bolsaBruta = tramo ? excedente * tramo.tasa : 0;
    const bolsaTotal = Math.min(bolsaBruta, config.topeMensual);

    return { ventaReal, presupuestoBase: config.presupuestoBase, excedente, activa, tramo, bolsaBruta, bolsaTotal };
}

export interface VendedorPremio {
    participanteId: string;
    nombre: string;
    ventaTotal: number;
    metaTotal: number;
    excedente: number;
    elegible: boolean;
    detalleCuota: string;
    supervisorId: string | null;
    premioEjecutivo: number;
    premioSupervisor: number;
    premioTotal: number;
}

const PORCENTAJE_EJECUTIVO = 0.8;
const PORCENTAJE_SUPERVISOR = 0.2;

// Reparte la bolsa entre los vendedores elegibles, ponderado por su excedente en importe
// (no por % de alcance), y divide cada premio individual 80/20 entre ejecutivo y supervisor.
export function repartirBolsaEntreVendedores(
    vendedores: {
        participanteId: string;
        nombre: string;
        ventaTotal: number;
        metaTotal: number;
        elegible: boolean;
        detalleCuota: string;
        supervisorId: string | null;
    }[],
    bolsaTotal: number
): VendedorPremio[] {
    const conExcedente = vendedores.map((v) => ({
        ...v,
        excedente: Math.max(0, v.ventaTotal - v.metaTotal),
    }));

    const sumaExcedentesElegibles = conExcedente
        .filter((v) => v.elegible)
        .reduce((acc, v) => acc + v.excedente, 0);

    return conExcedente.map((v) => {
        const premioTotal =
            v.elegible && bolsaTotal > 0 && sumaExcedentesElegibles > 0
                ? bolsaTotal * (v.excedente / sumaExcedentesElegibles)
                : 0;

        return {
            ...v,
            premioEjecutivo: premioTotal * PORCENTAJE_EJECUTIVO,
            premioSupervisor: premioTotal * PORCENTAJE_SUPERVISOR,
            premioTotal,
        };
    });
}

export interface SupervisorPremio {
    supervisorId: string;
    nombre: string;
    totalRecibido: number;
    vendedores: { nombre: string; aporte: number }[];
}

export function consolidarPorSupervisor(
    vendedores: VendedorPremio[],
    nombrePorSupervisorId: Map<string, string>
): SupervisorPremio[] {
    const mapa = new Map<string, SupervisorPremio>();

    for (const v of vendedores) {
        if (!v.supervisorId || v.premioSupervisor <= 0) continue;

        const existente = mapa.get(v.supervisorId) ?? {
            supervisorId: v.supervisorId,
            nombre: nombrePorSupervisorId.get(v.supervisorId) ?? 'Supervisor desconocido',
            totalRecibido: 0,
            vendedores: [],
        };
        existente.totalRecibido += v.premioSupervisor;
        existente.vendedores.push({ nombre: v.nombre, aporte: v.premioSupervisor });
        mapa.set(v.supervisorId, existente);
    }

    return [...mapa.values()].sort((a, b) => b.totalRecibido - a.totalRecibido);
}
