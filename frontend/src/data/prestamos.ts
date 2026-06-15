/**
 * prestamos.ts — Fuente canónica de préstamos y créditos.
 * Importar desde aquí en ModuloDeuda y en HubRendicion (exportador M17).
 *
 * FUENTE: Crédito real Banco Estado nov-2025 (según contabilidad Defontana 2025).
 * Reemplazó los 5 registros ficticios que existían antes de 2026-06-14.
 *
 * TODO (completar con estado de cuenta / contrato Banco Estado):
 *   - fecha_inicio exacta del desembolso
 *   - numero_contrato
 *   - tasa_interes anual pactada
 *   - plazo_meses
 *   - monto_pendiente actual (saldo capital)
 *   - fecha_vencimiento
 *
 * Última actualización: 2026-06-14
 */
import type { Prestamo } from '../api'

export const PRESTAMOS_BASE: Prestamo[] = [
  {
    id: 1,
    // Fecha exacta de desembolso pendiente de confirmar con cartola/contrato.
    // Se usa 2025-11-01 como placeholder del mes registrado en Defontana.
    fecha_inicio: '2025-11-01',
    acreedor_rut: '97.036.000-K',
    acreedor_nombre: 'Banco Estado',
    tipo_acreedor: 'banco',
    // $480.000.000 — monto confirmado en contabilidad Defontana 2025
    monto_original: 480_000_000,
    // TODO: confirmar tasa en el contrato o estado de cuenta Banco Estado
    tasa_interes: null,
    // TODO: confirmar plazo pactado (meses)
    plazo_meses: null,
    // TODO: reemplazar con saldo real según última cartola Banco Estado
    monto_pendiente: 480_000_000,
    estado: 'vigente',
    // TODO: confirmar número de contrato/operación Banco Estado
    numero_contrato: null,
    // TODO: confirmar fecha de vencimiento según tabla de amortización
    fecha_vencimiento: null,
    es_legal: true,
    alerta_legal:
      'DATOS INCOMPLETOS — Confirmar condiciones del crédito (tasa, plazo, saldo, ' +
      'contrato) con estado de cuenta Banco Estado o escritura del crédito nov-2025.',
  },
]
