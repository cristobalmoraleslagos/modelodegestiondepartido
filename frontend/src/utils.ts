export const fmt = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

export const fmtUF = (n: number) => `${n.toFixed(2)} UF`

export const VALOR_UF = 40_442 // CLP por UF — 21 May 2026 (mindicador.cl)
// Aporte estatal real 2022: $1.240.127.041 (fuente: Balance Clasificado SERVEL 2022)
// Aporte 2021: $1.370.047.598 — Estimado 2025-2026: ~$1.200.000.000
// Actualizar cuando SERVEL publique balance 2025 aprobado
export const APORTE_ESTATAL_ANUAL = 1_200_000_000
export const MES_ACTUAL = 5 // Mayo
