/**
 * donaciones.ts — Fuente canónica de donaciones.
 * Importar desde aquí en ModuloDonaciones y en el exportador SERVEL (M13).
 *
 * FUENTE OFICIAL: Portal de Transparencia SERVEL — módulo 10 "Aportes, donaciones,
 * asignaciones y otros" (org=PP007), extraído con scraper_transparencia 2016-2026.
 *
 * IMPORTANTE: el portal entrega TOTALES ANUALES, no el detalle donante a donante.
 * El detalle (nombre, RUT, fecha de cada donante) solo existe en el formulario M13
 * que el partido presenta; mientras no se cargue, DONACIONES_BASE va vacío (antes
 * tenía datos de EJEMPLO ficticios — Roberto Fuentes, Constructora Del Valle, etc. —
 * que NO eran reales y se eliminaron).
 */

export interface Donacion {
  id:                  number
  fecha:               string   // YYYY-MM-DD
  donante:             string
  rut:                 string
  esPersonaJuridica:   boolean
  montoCLP:            number
  acumuladoAnualCLP:   number
  tipo:                'partido' | 'campana'
  metodoPago?:         string
  cuentaReceptora?:    string
  nroComprobante?:     string
}

/**
 * Donaciones reales declaradas por el PCCh a SERVEL (Transparencia, módulo 10).
 * Totales anuales en CLP. Las donaciones del partido son pequeñas y constantes
 * (~$2-6M/año); su financiamiento privado real son las cotizaciones de afiliados.
 *   2024: solo H1 (Q1+Q2) — el portal crasheó al extraer; Defontana confirma ≈$0.
 */
export const DONACIONES_ANUALES_SERVEL: Record<number, number> = {
  2016: 0,
  2017: 0,
  2018: 0,
  2019: 4_399_300,
  2020: 4_766_410,
  2021: 2_336_948,
  2022: 4_600_651,
  2023: 6_616_323,
  2024: 0,           // solo H1 extraído (portal crasheó); Defontana ≈$0
  2025: 2_274_670,
  2026: 0,           // Q1 $0; resto del año por declarar
}

/**
 * Detalle donante a donante. VACÍO hasta cargar el M13 real del partido.
 * (Reemplazó 7 registros de ejemplo ficticios de 2026 que no existían.)
 */
export const DONACIONES_BASE: Donacion[] = []
