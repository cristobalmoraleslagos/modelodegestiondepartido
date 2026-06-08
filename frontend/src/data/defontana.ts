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
    // CONFIRMADO: cuenta 3.1.1010.10.01 "INGRESOS PROCEDENTES DE APORTES TRIMESTRAL"
    // (Libro Mayor Defontana 2024) = $549.691.607. El partido SÍ recibió aporte en 2024.
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
  // Hallazgos del Libro Mayor 2024/2025:
  esSaldoApertura:   true,   // saldo de arrastre — origen en años NO contabilizados (≤2023)
  tieneConvenio:     true,   // glosas "Abono cuota 32/338 convenio" → convenio de 338 cuotas
  cuentaPuente:      'Puente Progreso',  // abonos ~$5M pasan por aquí y netean a ~0
  reduccionAnual:    170_000_000,  // ~$170M/año → recuperación ~25 años
  nota: 'Saldo de apertura histórico (origen ≤2023, sin documentar en libros actuales). ' +
        'Existe convenio de 338 cuotas con Soc. de Inv. Progreso SpA, pero la cuenta LP casi no se mueve. ' +
        'CONSEGUIR: el convenio firmado + reconstruir el origen de la deuda. Evaluar provisión por incobrabilidad.',
} as const

/** Honorarios contabilizados en Defontana (cuenta 4.5.1030.10.01) — para cruce con BHE */
export const HONORARIOS_DEFONTANA: Record<number, number> = {
  2024: 208_968_974,
  2025: 275_435_191,   // = BHE SII exacto
}

/**
 * Crédito electoral Banco Estado — identificado en el Libro Mayor 2025.
 * 07/11/2025: $480M ingresados a BANCO BCI 29355508 contra "Obligaciones con Bancos".
 * Préstamo electoral tomado días antes de la elección presidencial/parlamentaria.
 * Es el origen de los pasivos financieros 2025 ($467-480M).
 */
export const CREDITO_ELECTORAL_2025 = {
  fecha:    '2025-11-07',
  monto:    480_000_000,
  acreedor: 'Banco Estado',
  cuenta:   'BANCO BCI 29355508',
  glosa:    'CRÉDITO ELECTORAL BANCO ESTADO',
} as const

/**
 * Flujo de caja proyectado (Defontana) — revela crisis estructural de liquidez.
 * Sin ingreso proyectado y ~$28M/mes de costos fijos, la caja cae a −$753M a
 * fin de 2025. Solo el crédito electoral $480M + financiamiento electoral
 * evitaron la insolvencia (caja real Dic-2025 = +$5,6M).
 */
export const FLUJO_CAJA_PROYECTADO = {
  ingresoMensualProyectado: 0,
  egresoFijoMensual:        28_000_000,   // sueldos + honorarios + impuestos
  cajaInicialJun2025:       101_963_056,
  cajaProyectadaDic2025:    -752_893_650, // sin el crédito/financiamiento electoral
  cajaRealDic2025:          5_596_000,    // EEFF — gracias al crédito $480M
  nota: 'Crisis estructural: costos fijos ~$340M/año sin ingreso estable. ' +
        'El aporte estatal cubría esto; suspendido, el partido depende de créditos puntuales.',
} as const
