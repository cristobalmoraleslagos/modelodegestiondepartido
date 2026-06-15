/**
 * bancos.ts — Cuentas bancarias REALES del PCCh.
 *
 * FUENTE: Libro Mayor Defontana 2025 (cuentas contables 1.1.1010.20.xx).
 * Los saldos son CONTABLES (lo que registra Defontana). El saldo SEGÚN BANCO
 * (cartola) está pendiente: sin cartola no se puede completar la conciliación.
 *
 * VALIDACIÓN: la suma de saldos contables = $5.595.157, que cuadra con el
 * Estado de Situación Financiera 2025 (bancos $5.596.000 en M$, redondeado).
 *
 * Reemplazó los datos ficticios anteriores ("Cuenta Operacional $28,4M", etc.).
 */
export type Banco = 'BCI' | 'Banco Estado'
export type PropositoCuenta = 'Operacional' | 'Electoral'

export interface CuentaBancaria {
  codigo:            string   // cuenta contable Defontana
  numero:            string   // número de cuenta bancaria
  banco:             Banco
  proposito:         PropositoCuenta
  glosa:             string
  saldoContable2025: number
  movimientos2025:   number
}

/** Cuentas con saldo y movimiento real en 2025 (Libro Mayor Defontana). */
export const CUENTAS_BANCARIAS: CuentaBancaria[] = [
  { codigo: '1.1.1010.20.05', numero: '29355508', banco: 'BCI',          proposito: 'Operacional', glosa: 'Cuenta operacional principal (recibió el crédito electoral $480M)', saldoContable2025: 3_346_395, movimientos2025: 2359 },
  { codigo: '1.1.1010.20.07', numero: '61775355', banco: 'BCI',          proposito: 'Operacional', glosa: 'Cuenta operacional',                                                  saldoContable2025: 2_019_809, movimientos2025:   78 },
  { codigo: '1.1.1010.20.04', numero: '13950223', banco: 'BCI',          proposito: 'Operacional', glosa: 'Cuenta operacional',                                                  saldoContable2025:    65_824, movimientos2025:  375 },
  { codigo: '1.1.1010.20.13', numero: 's/n',      banco: 'Banco Estado', proposito: 'Electoral',   glosa: 'Cuenta electoral — Primaria Presidencial',                            saldoContable2025:   101_095, movimientos2025:   34 },
  { codigo: '1.1.1010.20.14', numero: 's/n',      banco: 'Banco Estado', proposito: 'Electoral',   glosa: 'Cuenta electoral — Senador',                                          saldoContable2025:    44_578, movimientos2025:   15 },
  { codigo: '1.1.1010.20.15', numero: 's/n',      banco: 'Banco Estado', proposito: 'Electoral',   glosa: 'Cuenta electoral — Diputado',                                         saldoContable2025:    17_456, movimientos2025:   91 },
]

export const BANCOS_RESUMEN = {
  totalContable2025: 5_595_157,   // suma de saldos contables (Libro Mayor)
  totalEEFF2025:     5_596_000,   // Estado de Situación Defontana 2025 (M$ redondeado) — CUADRA
  fuente:            'Libro Mayor Defontana 2025 — cuentas 1.1.1010.20.xx',
  // Banco Estado abre una cuenta por campaña electoral. En 2024 (municipales)
  // hubo además cuentas Concejal, Consejero Regional, Gobernador Regional,
  // Plebiscito y Primarias Alcalde; en 2025 quedaron con saldo ~$0.
  nota:              'Saldos CONTABLES (Defontana). La conciliación contra cartola bancaria está pendiente.',
} as const
