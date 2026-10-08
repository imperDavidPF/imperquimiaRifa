

export type EstadoVentana = 'proxima' | 'abierta' | 'cerrada';

export interface VentanaAutomatica {

    mesClave: string;
    mesEtiqueta: string;
    fechaInicio: Date;
    estado: EstadoVentana;

}

const ANIO_CAMPANA = 2026;
const MESES_CAMPANA = [9, 10, 11];

const ETIQUETAS_MES = [
    "Enero", 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function obtenerVentanasAutomaticas(ahora: Date = new Date()): VentanaAutomatica[] {
    return MESES_CAMPANA.map((mesIndice) => {
        const fechaInicio = new Date(ANIO_CAMPANA, mesIndice, 1, 0, 0, 0, 0);
        const fechaFin = new Date(ANIO_CAMPANA, mesIndice + 1, 0, 23, 59, 59, 999);
        const estado: EstadoVentana = ahora < fechaInicio ? 'proxima' : ahora > fechaFin ? 'cerrada' : 'abierta';

        return {
            mesClave: `${ANIO_CAMPANA}-${mesIndice + 1}`,
            mesEtiqueta: `${ETIQUETAS_MES[mesIndice]} ${ANIO_CAMPANA}`,
            fechaInicio,
            fechaFin,
            estado,
        };
    });
}

export function ventanaAbiertaPara(mesClave: string, ahora: Date = new Date()): boolean {
    return obtenerVentanasAutomaticas(ahora).find((v) => v.mesClave === mesClave)?.estado === 'abierta';
}