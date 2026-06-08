export const fmt = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

export const fmtUF = (n: number) => `${n.toFixed(2)} UF`

export const VALOR_UF = 40_442 // CLP por UF — 21 May 2026 (mindicador.cl)

// Aportes estatales reales por año (fuente: Balances Clasificados SERVEL)
// 2023-2025: $0 — partido NO recibió aporte público (rendiciones pendientes / suspensión SERVEL)
export const APORTES_ESTATALES: Record<number, number> = {
  2017: 800_000_000,
  2018: 900_000_000,
  2019: 950_000_000,
  2020: 950_000_000,
  2021: 1_370_047_598, // fuente: Balance SERVEL 2021 aprobado
  2022: 1_240_127_041, // fuente: Balance Clasificado SERVEL 2022
  2023: 0,             // SIN APORTE — rendiciones pendientes / suspensión SERVEL
  2024: 0,             // ⚠️ POR VERIFICAR: libros Defontana 2024 muestran "Ingresos por aportes
                       //    trimestrales DFL N°4" = $549.691.607. Confirmar con SERVEL/Tesorería si
                       //    se recibió. Si se confirma, cambiar a 549_691_607.
  2025: 0,             // SIN APORTE — confirmado en balance Defontana 2025 (no existe la cuenta)
  2026: 134_400_000,   // Q1 2026 parcial — actualizar cuando SERVEL publique aporte aprobado
}
export const APORTE_ESTATAL_ANUAL = APORTES_ESTATALES[2026] ?? 1_200_000_000

// MES_ACTUAL dinámico — se calcula al cargar la app (no hardcodeado)
export const MES_ACTUAL = new Date().getMonth() + 1
