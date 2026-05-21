export const fmt = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

export const fmtUF = (n: number) => `${n.toFixed(2)} UF`

export const VALOR_UF = 41_500 // CLP por UF — Mayo 2026
export const APORTE_ESTATAL_ANUAL = 222_000_000
export const MES_ACTUAL = 5 // Mayo
