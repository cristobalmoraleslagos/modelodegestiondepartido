/**
 * exporters/servel.ts — Generador de CSV para rendición SERVEL
 *
 * Formato oficial DS 1174/2016:
 *  - Separador: punto y coma (;)
 *  - Codificación: UTF-8 con BOM (para que Excel lo abra correctamente)
 *  - Fechas: DD/MM/YYYY
 *  - Montos: enteros, sin puntos ni comas de miles
 *  - Todas las celdas entre comillas dobles
 *
 * Cada función retorna { filas: number } para que el UI muestre cuántos
 * registros se exportarán antes de descargar.
 */

import { EGRESOS_BASE, type EgresoBase }  from '../data/egresos'
import { DONACIONES_BASE, type Donacion } from '../data/donaciones'
import { ACTIVOS_BASE, type Activo }      from '../data/activos'
import { FUNCIONARIOS_CANON }             from '../data/personal'
import { BHE_HISTORICO }                  from '../data/bhe_historico'
import { APORTES_ESTATALES }              from '../utils'
import type { Prestamo }                  from '../api'

// ════════════════════════════════════════════════════════════════════════
// CONSTANTES DEL PARTIDO
// ════════════════════════════════════════════════════════════════════════

export const RUT_PARTIDO    = '71.701.800-1'
export const NOMBRE_PARTIDO = 'Partido Comunista de Chile'
const BOM = '﻿'

// ════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════

export type Trimestre = 'Q1' | 'Q2' | 'Q3' | 'Q4'

export interface Periodo {
  trimestre: Trimestre
  año:       number
}

const RANGO_MESES: Record<Trimestre, [number, number]> = {
  Q1: [1, 3], Q2: [4, 6], Q3: [7, 9], Q4: [10, 12],
}

export function periodoLabel(p: Periodo): string {
  const [ini, fin] = RANGO_MESES[p.trimestre]
  return `${String(ini).padStart(2,'0')}-${String(fin).padStart(2,'0')}/${p.año}`
}

export function trimLabel(p: Periodo): string {
  return `${p.trimestre} ${p.año}`
}

// ════════════════════════════════════════════════════════════════════════
// UTILIDADES INTERNAS
// ════════════════════════════════════════════════════════════════════════

function fmt_fecha(iso: string): string {
  if (!iso || iso === '—') return ''
  const parts = iso.split('-')
  if (parts.length < 3) return iso
  const [y, m, d] = parts
  return `${d}/${m}/${y}`
}

function enPeriodo(fechaISO: string, p: Periodo): boolean {
  if (!fechaISO || fechaISO === '—') return false
  const [mesIni, mesFin] = RANGO_MESES[p.trimestre]
  const d = new Date(fechaISO)
  return (
    d.getFullYear() === p.año &&
    d.getMonth() + 1 >= mesIni &&
    d.getMonth() + 1 <= mesFin
  )
}

function cel(v: string | number | null | undefined): string {
  return `"${String(v ?? '').replace(/"/g, '""')}"`
}

function construirCSV(headers: string[], filas: string[][]): string {
  const cabecera = headers.map(h => cel(h)).join(';')
  const cuerpo   = filas.map(f => f.join(';')).join('\r\n')
  return BOM + cabecera + '\r\n' + cuerpo
}

function descargar(csv: string, nombre: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: nombre })
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function loadLS<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) ?? '[]') as T[] }
  catch { return [] }
}

// ════════════════════════════════════════════════════════════════════════
// MÓDULO 6 — FUENTES DE FINANCIAMIENTO (trimestral)
// ════════════════════════════════════════════════════════════════════════

interface IngresoLS {
  id: number; tipo: string; monto: number
  descripcion: string; rut_origen: string; doc_ref: string; fecha: string; year: number
}

export function exportM6(p: Periodo): { filas: number } {
  const headers = [
    'RUT_PARTIDO', 'NOMBRE_PARTIDO', 'AÑO', 'PERÍODO',
    'TIPO_INGRESO', 'DESCRIPCION', 'MONTO_CLP', 'FECHA',
    'RUT_ORIGEN', 'N_DOCUMENTO',
  ]

  const lsData = loadLS<IngresoLS>('fp_ingresos')
  const filtrados = lsData.filter(i => enPeriodo(i.fecha, p))

  const filas = filtrados.map(i => [
    cel(RUT_PARTIDO), cel(NOMBRE_PARTIDO), cel(p.año), cel(periodoLabel(p)),
    cel(i.tipo), cel(i.descripcion), cel(i.monto),
    cel(fmt_fecha(i.fecha)), cel(i.rut_origen), cel(i.doc_ref),
  ])

  // Fila base: aporte público estatal trimestral (Art. 40 DFL N°4/2017).
  // El aporte anual se distribuye en 4 pagos trimestrales iguales.
  // Para 2023-2025 el aporte fue $0 (suspendido por rendiciones pendientes).
  const aporteAnual = APORTES_ESTATALES[p.año]
  if (aporteAnual !== undefined && aporteAnual > 0) {
    const [, mesFin] = RANGO_MESES[p.trimestre]
    filas.unshift([
      cel(RUT_PARTIDO), cel(NOMBRE_PARTIDO), cel(p.año), cel(periodoLabel(p)),
      cel('Aporte Estatal'),
      cel('Aporte público trimestral — Art. 40 DFL N°4/2017'),
      cel(Math.round(aporteAnual / 4)),
      cel(fmt_fecha(`${p.año}-${String(mesFin).padStart(2, '0')}-01`)),
      cel('60.806.000-0'),  // RUT SERVEL
      cel('—'),
    ])
  }

  const csv = construirCSV(headers, filas)
  descargar(csv, `M06_${p.año}_${p.trimestre}_SERVEL.csv`)
  return { filas: filas.length }
}

// ════════════════════════════════════════════════════════════════════════
// MÓDULO 12 — GASTOS DETALLADOS (trimestral)
// ════════════════════════════════════════════════════════════════════════

interface EgresoNuevoLS {
  id: number; proveedor: string; rut: string; nroDoc: string
  monto: number; categoria: string; fecha: string; docsCompletos: string[]
}

export function exportM12(p: Periodo): { filas: number } {
  const headers = [
    'RUT_PARTIDO', 'NOMBRE_PARTIDO', 'AÑO', 'PERÍODO',
    'ITEM_SERVEL', 'PROVEEDOR', 'RUT_PROVEEDOR',
    'N_DOCUMENTO', 'TIPO_DOCUMENTO', 'FECHA', 'MONTO_CLP',
    'CUENTA_BANCARIA', 'RESPONSABLE',
  ]

  // Fuente 1: datos base (hardcoded → shared data file)
  const base    = EGRESOS_BASE.filter(e => enPeriodo(e.fecha, p))
  // Fuente 2: egresos nuevos del formulario (localStorage)
  const nuevos  = loadLS<EgresoNuevoLS>('fp_egresos_nuevos').filter(e => enPeriodo(e.fecha, p))
  // Fuente 3: tabla de Carga de Datos (cfp_egresos)
  const cfp     = loadLS<Record<string,string>>('cfp_egresos').filter(r => {
    try { return enPeriodo(r.fecha ?? '', p) } catch { return false }
  })

  const filasBase = base.map((e: EgresoBase) => [
    cel(RUT_PARTIDO), cel(NOMBRE_PARTIDO), cel(p.año), cel(periodoLabel(p)),
    cel(e.categoriaSERVEL), cel(e.proveedor), cel(e.rut),
    cel(e.nroDoc), cel(e.tipoDoc), cel(fmt_fecha(e.fecha)), cel(e.monto),
    cel(e.cuenta), cel(e.responsable),
  ])

  const filasNuevos = nuevos.map((e: EgresoNuevoLS) => [
    cel(RUT_PARTIDO), cel(NOMBRE_PARTIDO), cel(p.año), cel(periodoLabel(p)),
    cel(e.categoria), cel(e.proveedor), cel(e.rut),
    cel(e.nroDoc), cel('Factura'), cel(fmt_fecha(e.fecha)), cel(e.monto),
    cel('—'), cel('—'),
  ])

  const filasCFP = cfp.map(r => [
    cel(RUT_PARTIDO), cel(NOMBRE_PARTIDO), cel(p.año), cel(periodoLabel(p)),
    cel(r.categoria ?? r.item ?? ''), cel(r.proveedor ?? ''), cel(r.rut ?? ''),
    cel(r.nroDoc ?? r.documento ?? ''), cel(r.tipoDoc ?? 'Factura'),
    cel(fmt_fecha(r.fecha ?? '')), cel(r.monto ?? ''),
    cel(r.cuenta ?? ''), cel(r.responsable ?? ''),
  ])

  const todasFilas = [...filasBase, ...filasNuevos, ...filasCFP]
  const csv = construirCSV(headers, todasFilas)
  descargar(csv, `M12_${p.año}_${p.trimestre}_SERVEL.csv`)
  return { filas: todasFilas.length }
}

// ════════════════════════════════════════════════════════════════════════
// MÓDULO 13 — DONACIONES RECIBIDAS (trimestral)
// ════════════════════════════════════════════════════════════════════════

export function exportM13(p: Periodo): { filas: number } {
  const headers = [
    'RUT_PARTIDO', 'NOMBRE_PARTIDO', 'AÑO', 'PERÍODO',
    'DONANTE', 'RUT_DONANTE', 'TIPO_PERSONA',
    'MONTO_CLP', 'FECHA_RECEPCION', 'TIPO_DONACION',
    'METODO_PAGO', 'CUENTA_RECEPTORA', 'N_COMPROBANTE',
  ]

  // Fuente 1: base hardcoded — EXCLUIR personas jurídicas (Art. 39 DFL N°4/2017 + Art. 2 Ley 20.900)
  // Las jurídicas se detectan en validarPrevio() y NO deben aparecer en M13 SERVEL
  const base    = DONACIONES_BASE.filter(d => enPeriodo(d.fecha, p) && !d.esPersonaJuridica)
  // Fuente 2: tabla CargaDatos — excluir jurídicas también
  const cfp     = loadLS<Record<string,string>>('cfp_donaciones').filter(r => {
    try { return enPeriodo(r.fecha ?? '', p) && (r.tipo_persona ?? 'Natural') !== 'Jurídica' } catch { return false }
  })

  const filasBase = base.map((d: Donacion) => [
    cel(RUT_PARTIDO), cel(NOMBRE_PARTIDO), cel(p.año), cel(periodoLabel(p)),
    cel(d.donante), cel(d.rut),
    cel(d.esPersonaJuridica ? 'Jurídica' : 'Natural'),
    cel(d.montoCLP), cel(fmt_fecha(d.fecha)),
    cel(d.tipo === 'partido' ? 'Al partido' : 'A campaña'),
    cel(d.metodoPago ?? ''), cel(d.cuentaReceptora ?? ''), cel(d.nroComprobante ?? ''),
  ])

  const filasCFP = cfp.map(r => [
    cel(RUT_PARTIDO), cel(NOMBRE_PARTIDO), cel(p.año), cel(periodoLabel(p)),
    cel(r.nombre ?? ''), cel(r.rut ?? ''),
    cel(r.tipo_persona ?? 'Natural'),
    cel(r.monto ?? ''), cel(fmt_fecha(r.fecha ?? '')),
    cel(r.tipo_donacion ?? 'Al partido'),
    cel(r.metodo_pago ?? ''), cel(r.cuenta_receptora ?? ''), cel(r.comprobante ?? ''),
  ])

  const todasFilas = [...filasBase, ...filasCFP]
  const csv = construirCSV(headers, todasFilas)
  descargar(csv, `M13_${p.año}_${p.trimestre}_SERVEL.csv`)
  return { filas: todasFilas.length }
}

// ════════════════════════════════════════════════════════════════════════
// MÓDULO 14 — NÓMINA DE PERSONAL (trimestral)
// ════════════════════════════════════════════════════════════════════════

export function exportM14(p: Periodo): { filas: number } {
  const headers = [
    'RUT_PARTIDO', 'NOMBRE_PARTIDO', 'AÑO', 'PERÍODO',
    'NOMBRE', 'RUT', 'CALIDAD_CONTRACTUAL',
    'MONTO_BRUTO_CLP', 'BANCO', 'TIPO_CUENTA', 'N_CUENTA',
    'AREA', 'FECHA_INICIO_CONTRATO', 'FECHA_FIN_CONTRATO',
  ]

  let filas: string[][]

  // Años de backlog (2022-2025): usar la nómina REAL de honorarios (BHE SII),
  // contratistas con honorario bruto anual ≥ 20 UTM procesados desde los XLS del SII.
  const contratistasAnio = BHE_HISTORICO.filter(c => c.anio === p.año)
  if (contratistasAnio.length > 0) {
    filas = contratistasAnio.map(c => [
      cel(RUT_PARTIDO), cel(NOMBRE_PARTIDO), cel(p.año), cel(periodoLabel(p)),
      cel(c.nombre), cel(c.rut), cel('Honorarios'),
      cel(c.bruto), cel('—'), cel('—'), cel('—'),
      cel('—'),
      cel(''),  // fechaInicio — no disponible en BHE
      cel(''),  // fechaFin    — no disponible en BHE
    ])
  } else {
    // Año actual sin BHE procesado (2026+): usar nómina canónica vigente
    const extras = loadLS<typeof FUNCIONARIOS_CANON[0]>('fp_personal')
    const todos  = [...FUNCIONARIOS_CANON, ...extras].filter(f => f.activo)
    filas = todos.map(f => [
      cel(RUT_PARTIDO), cel(NOMBRE_PARTIDO), cel(p.año), cel(periodoLabel(p)),
      cel(f.nombre), cel(f.rut), cel(f.calidad),
      cel(f.sueldo), cel(f.banco), cel(f.tipoCuenta), cel(f.numeroCuenta),
      cel(f.area),
      cel(''),  // fechaInicio — pendiente agregar al modelo
      cel(''),  // fechaFin    — pendiente agregar al modelo
    ])
  }

  const csv = construirCSV(headers, filas)
  descargar(csv, `M14_${p.año}_${p.trimestre}_SERVEL.csv`)
  return { filas: filas.length }
}

// ════════════════════════════════════════════════════════════════════════
// MÓDULO 16 — INVENTARIO DE ACTIVOS FIJOS (anual)
// ════════════════════════════════════════════════════════════════════════

// Depreciación lineal acumulada al CIERRE del año de rendición (31-dic-añoCierre),
// no a la fecha actual — el balance retroactivo debe reflejar el cierre del período.
function calcDepreciacion(a: Activo, añoCierre: number): number {
  const [anio, mes] = a.fechaAdquisicion.split('-').map(Number)
  // años transcurridos desde adquisición hasta 31-dic del año de cierre
  const años = (añoCierre - anio) + (12 - mes + 1) / 12
  return Math.min(a.valorAdquisicion / a.vidaUtilAnios * Math.max(años, 0), a.valorAdquisicion)
}

export function exportM16(año: number): { filas: number } {
  const headers = [
    'RUT_PARTIDO', 'NOMBRE_PARTIDO', 'AÑO',
    'CODIGO', 'DESCRIPCION', 'CATEGORIA',
    'VALOR_ADQUISICION_CLP', 'FECHA_ADQUISICION',
    'VIDA_UTIL_ANOS', 'DEPRECIACION_ACUMULADA_CLP',
    'VALOR_LIBRO_CLP', 'UBICACION', 'ESTADO', 'N_FACTURA_COMPRA',
  ]

  const cfpActivos = loadLS<Record<string,string>>('cfp_activos')
  const todosActivos = [
    ...ACTIVOS_BASE,
    ...cfpActivos.map(r => ({
      codigo:           r.codigo ?? '',
      descripcion:      r.descripcion ?? '',
      categoria:        (r.categoria ?? 'Mobiliario') as Activo['categoria'],
      valorAdquisicion: Number(r.valor ?? 0),
      fechaAdquisicion: r.fecha ?? '2020-01-01',
      vidaUtilAnios:    Number(r.vida_util ?? 5),
      ubicacion:        r.ubicacion ?? '',
      estado:           (r.estado ?? 'Operativo') as Activo['estado'],
      nroFactura:       r.nro_factura,
    })),
  ]

  const filas = todosActivos.map(a => {
    const dep = Math.round(calcDepreciacion(a, año))
    const vl  = Math.max(a.valorAdquisicion - dep, 0)
    return [
      cel(RUT_PARTIDO), cel(NOMBRE_PARTIDO), cel(año),
      cel(a.codigo), cel(a.descripcion), cel(a.categoria),
      cel(a.valorAdquisicion), cel(fmt_fecha(a.fechaAdquisicion)),
      cel(a.vidaUtilAnios), cel(dep), cel(vl),
      cel(a.ubicacion), cel(a.estado), cel(a.nroFactura ?? ''),
    ]
  })

  const csv = construirCSV(headers, filas)
  descargar(csv, `M16_${año}_SERVEL.csv`)
  return { filas: filas.length }
}

// ════════════════════════════════════════════════════════════════════════
// MÓDULO 17 — PRÉSTAMOS Y CRÉDITOS (trimestral)
// ════════════════════════════════════════════════════════════════════════

export function exportM17(p: Periodo, prestamosBase: Prestamo[]): { filas: number } {
  const headers = [
    'RUT_PARTIDO', 'NOMBRE_PARTIDO', 'AÑO', 'PERÍODO',
    'ACREEDOR', 'RUT_ACREEDOR', 'TIPO_ACREEDOR',
    'MONTO_ORIGINAL_CLP', 'MONTO_PENDIENTE_CLP',
    'TASA_INTERES_ANUAL', 'PLAZO_MESES',
    'FECHA_INICIO', 'FECHA_VENCIMIENTO',
    'N_CONTRATO', 'ESTADO', 'ES_LEGAL',
  ]

  const lsPrestamos = loadLS<Prestamo>('fp_prestamos')
  // Solo exportar préstamos legales para la rendición
  const todos = [...prestamosBase, ...lsPrestamos].filter(pr => pr.es_legal)

  const filas = todos.map(pr => [
    cel(RUT_PARTIDO), cel(NOMBRE_PARTIDO), cel(p.año), cel(periodoLabel(p)),
    cel(pr.acreedor_nombre), cel(pr.acreedor_rut), cel(pr.tipo_acreedor),
    cel(pr.monto_original), cel(pr.monto_pendiente),
    cel(pr.tasa_interes ?? ''), cel(pr.plazo_meses ?? ''),
    cel(fmt_fecha(pr.fecha_inicio)), cel(fmt_fecha(pr.fecha_vencimiento ?? '')),
    cel(pr.numero_contrato ?? ''), cel(pr.estado),
    cel(pr.es_legal ? 'Sí' : 'No — Verificar Art. 39 letra f) DFL N°4/2017'),
  ])

  const csv = construirCSV(headers, filas)
  descargar(csv, `M17_${p.año}_${p.trimestre}_SERVEL.csv`)
  return { filas: filas.length }
}

// ════════════════════════════════════════════════════════════════════════
// FUNCIÓN DE VALIDACIÓN PRE-RENDICIÓN
// Verifica que los datos estén completos antes de exportar.
// ════════════════════════════════════════════════════════════════════════

export interface AdvertenciaExport {
  modulo: string
  nivel:  'error' | 'warning'
  msg:    string
}

export function validarPrevio(p: Periodo, prestamosBase: Prestamo[]): AdvertenciaExport[] {
  const adv: AdvertenciaExport[] = []

  // M12: egresos sin documento
  const sinDoc = EGRESOS_BASE.filter(e => enPeriodo(e.fecha, p) && e.tipoDoc === 'Sin documento')
  if (sinDoc.length > 0)
    adv.push({ modulo: 'M12', nivel: 'error', msg: `${sinDoc.length} egresos sin documento tributario — no rendibles ante SERVEL.` })

  // M13: donaciones de personas jurídicas (prohibidas)
  const juridicas = DONACIONES_BASE.filter(d => enPeriodo(d.fecha, p) && d.esPersonaJuridica)
  if (juridicas.length > 0)
    adv.push({ modulo: 'M13', nivel: 'error', msg: `${juridicas.length} donación(es) de personas jurídicas — Art. 39 DFL N°4/2017 + Art. 2 Ley 20.900: prohibición absoluta con pena penal.` })

  // M13: donaciones sin método de pago
  const sinMetodo = DONACIONES_BASE.filter(d => enPeriodo(d.fecha, p) && !d.metodoPago)
  if (sinMetodo.length > 0)
    adv.push({ modulo: 'M13', nivel: 'warning', msg: `${sinMetodo.length} donación(es) sin método de pago — campo requerido en M13.` })

  // M14: funcionarios sin número de cuenta o sin banco
  const sinCuenta = FUNCIONARIOS_CANON.filter(f =>
    f.activo && (f.numeroCuenta === '—' || !f.numeroCuenta || f.banco === '—' || !f.banco)
  )
  if (sinCuenta.length > 0)
    adv.push({ modulo: 'M14', nivel: 'warning', msg: `${sinCuenta.length} funcionario(s) sin datos bancarios completos (banco o número de cuenta) — completar en Módulo Personal para exportación M14.` })

  // M17: préstamos vencidos no regularizados
  const vencidos = prestamosBase.filter(pr => pr.estado === 'vencido' && pr.es_legal)
  if (vencidos.length > 0)
    adv.push({ modulo: 'M17', nivel: 'error', msg: `${vencidos.length} préstamo(s) vencidos sin regularizar — SERVEL puede observar el incumplimiento.` })

  // M17: préstamos ilegales
  const ilegales = prestamosBase.filter(pr => !pr.es_legal)
  if (ilegales.length > 0)
    adv.push({ modulo: 'M17', nivel: 'error', msg: `${ilegales.length} préstamo(s) con acreedor no permitido por Art. 39 letra f) DFL N°4/2017 — excluidos del CSV.` })

  return adv
}
