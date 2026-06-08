/**
 * gastos_historico.ts — Serie histórica de Gastos del Partido PCCh
 * Generado automáticamente por procesadores/generar_ts_frontend.py
 * Fuente: finanzas/Gastos/*.csv (Módulo 12 SERVEL)
 *
 * NO EDITAR MANUALMENTE — regenerar con: python procesadores/generar_ts_frontend.py
 */

export interface DatoAnualGasto {
  anio:          number
  aporteEstatal: number | null
  gastoTotal:    number | null
  personal:      number | null
  bienes:        number | null
  admin:         number | null
  genero:        number | null
  juvenil:       number | null
  educacion:     number | null
  militantes:    number | null
  candidatos:    number | null
  fuente:        string
}

/** Serie M12 Gastos 2022-2026 — fuente SERVEL (procesada desde Gastos/*.csv) */
export const GASTOS_HISTORICO: DatoAnualGasto[] = [
  {
    anio:          2022,
    aporteEstatal: 1240127041,
    gastoTotal:    973778142,
    personal:      376069986,
    bienes:        355302145,
    admin:         42986534,
    genero:        73041520,
    juvenil:       null,
    educacion:     null,
    militantes:    null,
    candidatos:    null,
    fuente:        'M12 Gastos SERVEL 2022 — procesado desde finanzas/Gastos/2022-4.csv',
  },
  {
    anio:          2023,
    aporteEstatal: 345788634,    // CONFIRMADO — Transparencia SERVEL módulo 11 (Ingresos Art.34)
    gastoTotal:    1529513388,
    personal:      320242826,
    bienes:        478788165,
    admin:         54714309,
    genero:        22151105,
    juvenil:       13115836,
    educacion:     null,
    militantes:    null,
    candidatos:    null,
    fuente:        'M12 Gastos SERVEL 2023 — procesado desde finanzas/Gastos/2023-4.csv',
  },
  {
    anio:          2024,
    aporteEstatal: 549691607,    // CONFIRMADO — Defontana (cta 3.1.1010) = Transparencia módulo 11
    gastoTotal:    2097378556,
    personal:      380302102,
    bienes:        267591847,
    admin:         72699022,
    genero:        45925715,
    juvenil:       19568570,
    educacion:     null,
    militantes:    null,
    candidatos:    null,
    fuente:        'M12 Gastos SERVEL 2024 — procesado desde finanzas/Gastos/2024-4.csv',
  },
  {
    anio:          2025,
    aporteEstatal: 0,            // SIN APORTE — confirmado (módulo 11 + Defontana: la cuenta no existe)
    gastoTotal:    2133101285,
    personal:      458549897,
    bienes:        266451121,
    admin:         170782136,
    genero:        6337464,
    juvenil:       7400020,
    educacion:     null,
    militantes:    null,
    candidatos:    null,
    fuente:        'M12 Gastos SERVEL 2025 — procesado desde finanzas/Gastos/2025-4.csv',
  },
]

/** Lookup rápido: GASTOS_HISTORICO_MAP[año] → DatoAnualGasto */
export const GASTOS_HISTORICO_MAP = Object.fromEntries(
  GASTOS_HISTORICO.map(d => [d.anio, d])
)
