/**
 * donaciones.ts — Fuente canónica de donaciones (2026).
 * Importar desde aquí en ModuloDonaciones y en el exportador SERVEL (M13).
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
  metodoPago?:         string   // transferencia | cheque | efectivo
  cuentaReceptora?:    string   // número de cuenta bancaria receptora
  nroComprobante?:     string
}

/** Donaciones PCCh 2026 — requieren verificación y completar metodoPago + cuentaReceptora */
export const DONACIONES_BASE: Donacion[] = [
  { id: 1, fecha: '2026-01-15', donante: 'Roberto Fuentes Araya',     rut: '8.234.567-8',  esPersonaJuridica: false, montoCLP: 1_500_000, acumuladoAnualCLP:  4_800_000, tipo: 'partido', metodoPago: 'Transferencia' },
  { id: 2, fecha: '2026-02-10', donante: 'Constructora Del Valle SpA', rut: '77.123.456-9', esPersonaJuridica: true,  montoCLP: 3_000_000, acumuladoAnualCLP:  3_000_000, tipo: 'partido' },
  { id: 3, fecha: '2026-03-05', donante: 'Carmen Leal Moreno',         rut: '12.987.654-3', esPersonaJuridica: false, montoCLP:   900_000, acumuladoAnualCLP:  2_100_000, tipo: 'partido', metodoPago: 'Transferencia' },
  { id: 4, fecha: '2026-04-01', donante: 'Patricio Reyes Soto',        rut: '15.432.100-7', esPersonaJuridica: false, montoCLP: 4_200_000, acumuladoAnualCLP: 18_600_000, tipo: 'partido', metodoPago: 'Transferencia' },
  { id: 5, fecha: '2026-04-22', donante: 'Luisa Contreras Vidal',      rut: '9.876.543-2',  esPersonaJuridica: false, montoCLP:   400_000, acumuladoAnualCLP:    400_000, tipo: 'partido' },
  { id: 6, fecha: '2026-05-12', donante: 'Fundación Progreso Chile',   rut: '65.432.100-K', esPersonaJuridica: true,  montoCLP: 5_000_000, acumuladoAnualCLP:  5_000_000, tipo: 'partido' },
  { id: 7, fecha: '2026-05-18', donante: 'Marcos Ibáñez Pino',         rut: '16.100.200-4', esPersonaJuridica: false, montoCLP:   600_000, acumuladoAnualCLP:    600_000, tipo: 'partido' },
]
