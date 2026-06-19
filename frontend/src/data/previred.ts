/**
 * previred.ts — Cotizaciones previsionales de los trabajadores DEPENDIENTES.
 *
 * FUENTE: comprobantes Previred (PREVIRED/PREVIRED/<año>/CtrlPdf*.pdf), procesados
 * por procesadores/gen_previred.py → procesadores/output/Previred_cotizaciones.csv.
 *
 * Cierra parte de la brecha de "Gastos de Personal" del SII (el resto son honorarios
 * no-BHE). El partido tiene ~5 trabajadores dependientes (Código del Trabajo); el
 * resto de la nómina son honorarios (BHE).
 *
 * HALLAZGO CRÍTICO: las cotizaciones se DECLARARON Y NO PAGARON (DNP) en plazo de
 * forma sistemática, y se pagaron meses después (atraso promedio 54 días, máximo 180).
 */

/** N° de trabajadores dependientes informados a Previred. */
export const DEPENDIENTES_PREVIRED: Record<number, number> = {
  2023: 4, 2024: 5, 2025: 5, 2026: 5,
}

/** Renta imponible anual de los dependientes (suma mensual, Previred). */
export const IMPONIBLE_DEPENDIENTES: Record<number, number> = {
  2023: 52_060_112,
  2024: 58_297_419,
  2025: 75_261_412,
}

/** Resumen del cumplimiento de cotizaciones (2023-2026). */
export const COTIZACIONES_RESUMEN = {
  periodos:          39,
  conDNP:            22,   // períodos declarados y NO pagados en plazo
  conAtraso:         27,   // períodos pagados después del vencimiento legal
  atrasoMaxDias:     180,
  atrasoPromedioDias: 54,
  fuente:            'Comprobantes Previred 2023-2026 (PREVIRED/PREVIRED/)',
  // Vencimiento legal: ~día 13 del mes siguiente (pago electrónico).
} as const

/** Peores atrasos detectados (período → días de atraso). */
export const PEORES_ATRASOS = [
  { periodo: '09/2024', imponible: 4_762_537, atrasoDias: 180, fechaPago: '2025-04-11' },
  { periodo: '06/2024', imponible: 5_392_537, atrasoDias: 137, fechaPago: '2024-11-27' },
  { periodo: '09/2025', imponible: 6_687_500, atrasoDias: 115, fechaPago: '2026-02-05' },
  { periodo: '07/2024', imponible: 5_392_537, atrasoDias: 111, fechaPago: '2024-12-02' },
  { periodo: '10/2025', imponible: 6_362_500, atrasoDias: 105, fechaPago: '2026-02-26' },
] as const
