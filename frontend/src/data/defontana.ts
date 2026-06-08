/**
 * defontana.ts — Datos contables OFICIALES extraídos de Defontana (ERP del partido).
 * Fuente: Estado de Situación Financiera IFRS + Balance de Comprobación y Saldos
 *         exportados desde Defontana (visionary.defontana.com) — junio 2026.
 *
 * Estado de contabilización por año:
 *   2022, 2023 → NO contabilizados (balances vacíos / partidas de prueba)
 *   2024, 2025 → COMPLETOS, cuadran, en formato IFRS-PYME (listos para SERVEL)
 *
 * Cifras en PESOS (los EEFF están en M$/miles — aquí ya convertidos).
 */

export interface BalanceDefontana {
  anio:               number
  contabilizado:      boolean
  totalActivos:       number | null
  bancos:             number | null   // Efectivo y equivalentes — BANCOS
  deudoresLargoPlazo: number | null   // "Progreso por cobrar LP" — entidad relacionada
  pasivosFinancieros: number | null   // Obligaciones con bancos (incl. mandato SERVEL)
  capital:            number | null
  resultadoEjercicio: number | null   // (+) superávit / (−) déficit
  aporteEstatal:      number | null   // null = sin dato; ver nota aporte 2024
  fuente:             string
}

/** Balances oficiales Defontana por año */
export const BALANCE_DEFONTANA: Record<number, BalanceDefontana> = {
  2023: {
    anio: 2023, contabilizado: false,
    totalActivos: 214_000, bancos: -850_000, deudoresLargoPlazo: 0,
    pasivosFinancieros: 0, capital: 0, resultadoEjercicio: null,
    aporteEstatal: null,
    fuente: 'Defontana EEFF 2023 — VACÍO (no contabilizado, solo partidas de prueba)',
  },
  2024: {
    anio: 2024, contabilizado: true,
    totalActivos: 6_784_503_000, bancos: 415_636_000, deudoresLargoPlazo: 4_370_021_000,
    pasivosFinancieros: 8_122_000, capital: 1_542_831_000, resultadoEjercicio: 169_572_869,
    // ⚠️ POR VERIFICAR: los libros muestran aporte trimestral DFL N°4 = $549.691.607.
    // Confirmar con SERVEL/Tesorería antes de darlo por recibido.
    aporteEstatal: 549_691_607,
    fuente: 'Defontana EEFF + Balance Comprobación 2024 — COMPLETO (IFRS, cuadra)',
  },
  2025: {
    anio: 2025, contabilizado: true,
    totalActivos: 6_185_202_000, bancos: 5_596_000, deudoresLargoPlazo: 4_262_217_000,
    pasivosFinancieros: 467_020_000, capital: 1_542_831_000, resultadoEjercicio: -1_278_221_363,
    aporteEstatal: 0,  // confirmado: cuenta de aporte no existe en el balance 2025
    fuente: 'Defontana EEFF + Balance Comprobación 2025 — COMPLETO (IFRS, cuadra)',
  },
}

/**
 * "Progreso por cobrar" — cuenta por cobrar a EMPRESAS RELACIONADAS con fines de lucro.
 * Identificadas en Defontana (Lista de Ficha Contable):
 *   - SOC. DE INV. PROGRESO SPA (RUT 76.452.615-5) — sociedad de inversiones
 *   - RADIO PROGRESO SPA       (RUT 76.825.989-5) — medio de comunicación
 * Es el mayor activo del partido (~69% del total). Riesgo crítico de rendición:
 * un partido no puede financiar empresas con fines de lucro; IFRS exige revelar
 * partes relacionadas. Pendiente: ficha de la cuenta 1.2.1050.10.02 para ver
 * cada traspaso (fecha, monto, contracuenta) y confirmar recuperabilidad.
 */
export const PROGRESO_POR_COBRAR = {
  cuenta:    '1.2.1050.10.02 — Deudores a Largo Plazo (PROGRESO)',
  monto2024: 4_370_021_000,
  monto2025: 4_262_217_000,
  pctDelActivo2025: 0.69,   // ~69% del activo total 2025
  entidades: [
    { rut: '76.452.615-5', nombre: 'SOC. DE INV. PROGRESO SPA', tipo: 'Sociedad de inversiones' },
    { rut: '76.825.989-5', nombre: 'RADIO PROGRESO SPA',        tipo: 'Medio de comunicación' },
  ],
  nota: 'Empresas relacionadas con fines de lucro. Verificar naturaleza, contrato y recuperabilidad.',
} as const

/** Honorarios contabilizados en Defontana (cuenta 4.5.1030.10.01) — para cruce con BHE */
export const HONORARIOS_DEFONTANA: Record<number, number> = {
  2024: 208_968_974,
  2025: 275_435_191,   // = BHE SII exacto
}
