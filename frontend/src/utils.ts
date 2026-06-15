export const fmt = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

export const fmtUF = (n: number) => `${n.toFixed(2)} UF`

export const VALOR_UF = 40_442 // CLP por UF — 21 May 2026 (mindicador.cl)

// Aportes estatales reales por año (fuente: Balances SERVEL + Transparencia módulo 11 + Defontana)
// 2023: $345.788.634 — confirmado en Transparencia módulo 11 (Ingresos Art.34, mensual) y módulo 10
// 2024: $549.691.607 — confirmado en contabilidad Defontana (calza exacto con módulo 11)
// 2025: $0 — confirmado por módulo 11 + Defontana (la cuenta de aporte no existe)
export const APORTES_ESTATALES: Record<number, number> = {
  2017: 800_000_000,
  2018: 900_000_000,
  2019: 950_000_000,
  2020: 950_000_000,
  2021: 1_370_047_598, // fuente: Balance SERVEL 2021 aprobado
  2022: 1_240_127_041, // fuente: Balance Clasificado SERVEL 2022
  2023: 345_788_634,   // = aporte art. 33 bis (Transparencia módulo 11, Ingresos Art.34 mensual).
                       //    MÉTRICA: esto es SOLO el aporte estatal. NO confundir con el ingreso
                       //    bruto total 2023 del módulo 10 (~$1.364.291.311, suma de TODOS los ítems:
                       //    cotizaciones, reembolsos electorales, transferencias…) — es otra métrica,
                       //    no una discrepancia. Monto exacto del aporte a reconfirmar con cartola
                       //    Banco Estado (la línea "Aportes del Estado" del m10 trimestral indica $512M).
  2024: 549_691_607,   // CONFIRMADO en contabilidad oficial Defontana 2024 (cuenta 3.1.1010.10.01
                       //    "INGRESOS PROCEDENTES DE APORTES TRIMESTRAL") = Transparencia módulo 11.
  2025: 0,             // SIN APORTE — confirmado por módulo 11 + Defontana (no existe la cuenta)
  2026: 134_400_000,   // Q1 2026 parcial — actualizar cuando SERVEL publique aporte aprobado
}
export const APORTE_ESTATAL_ANUAL = APORTES_ESTATALES[2026] ?? 1_200_000_000

// MES_ACTUAL dinámico — se calcula al cargar la app (no hardcodeado)
export const MES_ACTUAL = new Date().getMonth() + 1
