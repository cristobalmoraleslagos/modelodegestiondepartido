/**
 * prestamos.ts — Fuente canónica de préstamos y créditos.
 * Importar desde aquí en ModuloDeuda y en HubRendicion (exportador M17).
 */
import type { Prestamo } from '../api'

export const PRESTAMOS_BASE: Prestamo[] = [
  {
    id: 1,
    fecha_inicio: '2022-03-15', acreedor_rut: '97.036.000-K',
    acreedor_nombre: 'Banco Estado', tipo_acreedor: 'banco',
    monto_original: 500_000_000, tasa_interes: 7.5, plazo_meses: 48,
    monto_pendiente: 180_000_000, estado: 'vigente',
    numero_contrato: 'CRE-2022-0341', fecha_vencimiento: '2026-03-15',
    es_legal: true, alerta_legal: null,
  },
  {
    id: 2,
    fecha_inicio: '2023-08-01', acreedor_rut: '97.030.000-7',
    acreedor_nombre: 'Banco de Chile', tipo_acreedor: 'banco',
    monto_original: 300_000_000, tasa_interes: 8.2, plazo_meses: 36,
    monto_pendiente: 195_000_000, estado: 'vigente',
    numero_contrato: 'CRE-2023-1187', fecha_vencimiento: '2026-08-01',
    es_legal: true, alerta_legal: null,
  },
  {
    id: 3,
    fecha_inicio: '2024-01-10', acreedor_rut: '97.004.000-5',
    acreedor_nombre: 'Banco Santander', tipo_acreedor: 'banco',
    monto_original: 200_000_000, tasa_interes: 9.1, plazo_meses: 24,
    monto_pendiente: 87_000_000, estado: 'vencido',
    numero_contrato: 'CRE-2024-0055', fecha_vencimiento: '2026-01-10',
    es_legal: true,
    alerta_legal: 'Préstamo vencido el 10/01/2026 — regularizar con el banco o renegociar plazo.',
  },
  {
    id: 4,
    fecha_inicio: '2023-06-01', acreedor_rut: '97.036.000-K',
    acreedor_nombre: 'Scotiabank Chile — Mutuo Hipotecario (sede central)',
    tipo_acreedor: 'banco',
    monto_original: 280_000_000, tasa_interes: 5.8, plazo_meses: 120,
    monto_pendiente: 220_000_000, estado: 'vigente',
    numero_contrato: 'MH-SCO-2023-0089', fecha_vencimiento: '2033-06-01',
    es_legal: true, alerta_legal: null,
  },
  {
    id: 5,
    fecha_inicio: '2026-01-01', acreedor_rut: '—',
    acreedor_nombre: 'Préstamos a militantes (Eric Olivares y otros)',
    tipo_acreedor: 'otro',
    monto_original: 4_942_000, tasa_interes: null, plazo_meses: null,
    monto_pendiente: 4_942_000, estado: 'vigente',
    numero_contrato: null, fecha_vencimiento: null,
    es_legal: false,
    alerta_legal: 'ALERTA: Préstamos a personas naturales requieren aprobación Directiva — Art. 33 Ley 18.603.',
  },
]
