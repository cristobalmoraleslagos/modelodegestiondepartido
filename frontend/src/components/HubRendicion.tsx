/**
 * HubRendicion — Panel central de rendición SERVEL.
 * Muestra todos los módulos exportables con selector de período prominente,
 * validación pre-rendición y botones de descarga directa.
 */
import { useState } from 'react'
import {
  Download, ShieldAlert, AlertTriangle, CheckCircle,
  FileText, Calendar, ChevronRight, Info,
} from 'lucide-react'
import {
  exportM6, exportM12, exportM13, exportM14, exportM16, exportM17,
  validarPrevio, periodoLabel, trimLabel,
  type Periodo, type Trimestre,
} from '../exporters/servel'
import { PRESTAMOS_BASE } from '../data/prestamos'
import type { Prestamo } from '../api'

// Carga préstamos base + los guardados por el formulario en localStorage
function cargarPrestamos(): Prestamo[] {
  try {
    const ls: Prestamo[] = JSON.parse(localStorage.getItem('fp_prestamos') ?? '[]')
    return [...PRESTAMOS_BASE, ...ls]
  } catch { return PRESTAMOS_BASE }
}

// ─── Definición de módulos ────────────────────────────────────────────────────

interface ModuloDef {
  id:          string
  num:         number
  label:       string
  desc:        string
  periodicidad:'trimestral' | 'anual'
  ley:         string
  exportar:    (p: Periodo, prestamos: Prestamo[]) => { filas: number }
}

const MODULOS_SERVEL: ModuloDef[] = [
  {
    id: 'M6', num: 6,
    label: 'Fuentes de Financiamiento',
    desc:  'Aportes estatales, cotizaciones, donaciones y otros ingresos del partido.',
    periodicidad: 'trimestral',
    ley:   'Art. 33 Ley 20.900 · DS 1174/2016 Módulo 6',
    exportar: (p) => exportM6(p),
  },
  {
    id: 'M12', num: 12,
    label: 'Gastos Detallados',
    desc:  'Todas las transacciones de egreso del período con proveedor, RUT, documento y monto.',
    periodicidad: 'trimestral',
    ley:   'DS 1174/2016 Módulo 12',
    exportar: (p) => exportM12(p),
  },
  {
    id: 'M13', num: 13,
    label: 'Donaciones Recibidas',
    desc:  'Detalle por donante: nombre, RUT, monto, fecha y tipo de donación.',
    periodicidad: 'trimestral',
    ley:   'Art. 13 Ley 19.884 · DS 1174/2016 Módulo 13',
    exportar: (p) => exportM13(p),
  },
  {
    id: 'M14', num: 14,
    label: 'Nómina de Personal',
    desc:  'Contratistas y empleados activos con calidad contractual y monto bruto.',
    periodicidad: 'trimestral',
    ley:   'DS 1174/2016 Módulo 14',
    exportar: (p) => exportM14(p),
  },
  {
    id: 'M16', num: 16,
    label: 'Inventario de Activos Fijos',
    desc:  'Código, descripción, valor, depreciación y valor libro de cada activo.',
    periodicidad: 'anual',
    ley:   'DS 1174/2016 Módulo 16',
    exportar: (p) => exportM16(p.año),
  },
  {
    id: 'M17', num: 17,
    label: 'Préstamos y Créditos',
    desc:  'Detalle de deudas con instituciones financieras autorizadas (solo legales).',
    periodicidad: 'trimestral',
    ley:   'Art. 14 Ley 20.900 · DS 1174/2016 Módulo 17',
    exportar: (p, pr) => exportM17(p, pr),
  },
]

// ─── Componente ───────────────────────────────────────────────────────────────

export default function HubRendicion() {
  const [trimestre, setTrimestre] = useState<Trimestre>('Q2')
  const [año,       setAño]       = useState(2026)
  const [resultados, setResultados] = useState<Record<string, number | null>>({})

  const periodo: Periodo  = { trimestre, año }
  const prestamos         = cargarPrestamos()
  const advertencias      = validarPrevio(periodo, prestamos)
  const errores           = advertencias.filter(a => a.nivel === 'error')
  const warnings          = advertencias.filter(a => a.nivel === 'warning')

  function exportar(m: ModuloDef) {
    const { filas } = m.exportar(periodo, prestamos)
    setResultados(prev => ({ ...prev, [m.id]: filas }))
    setTimeout(() => setResultados(prev => ({ ...prev, [m.id]: null })), 6000)
  }

  function exportarTodo() {
    MODULOS_SERVEL.forEach(m => exportar(m))
  }

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-indigo-600 rounded-2xl px-6 py-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Rendición SERVEL</h2>
            <p className="text-indigo-200 text-sm mt-0.5">
              Exporta los módulos en formato CSV oficial DS 1174/2016 · separador ;<br/>
              UTF-8 con BOM · fechas DD/MM/YYYY · RUT partido en cada fila
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <FileText size={32} className="text-indigo-300" />
          </div>
        </div>
      </div>

      {/* ── Selector de período ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm px-6 py-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={16} className="text-indigo-500" />
          <h3 className="text-sm font-semibold text-slate-800">Período de rendición</h3>
        </div>
        <div className="flex items-center gap-4">
          {/* Botones de trimestre */}
          <div className="flex gap-2">
            {(['Q1','Q2','Q3','Q4'] as Trimestre[]).map(t => (
              <button key={t} onClick={() => setTrimestre(t)}
                className={`w-16 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  trimestre === t
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}>
                {t}
              </button>
            ))}
          </div>
          {/* Selector de año */}
          <select value={año} onChange={e => setAño(Number(e.target.value))}
            className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400">
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {/* Label resultante */}
          <div className="flex-1 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5 text-center">
            <p className="text-xs text-indigo-500 font-medium">Período seleccionado</p>
            <p className="text-lg font-bold text-indigo-800">{trimLabel(periodo)}</p>
            <p className="text-xs text-indigo-400 font-mono">{periodoLabel(periodo)}</p>
          </div>
          {/* Exportar todo */}
          <button onClick={exportarTodo}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm shadow-indigo-200">
            <Download size={16} />
            Exportar todo
          </button>
        </div>
      </div>

      {/* ── Validación pre-rendición ────────────────────────────────────────── */}
      {advertencias.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm px-6 py-4 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            {errores.length > 0
              ? <ShieldAlert size={16} className="text-red-500" />
              : <AlertTriangle size={16} className="text-amber-500" />}
            <h3 className="text-sm font-semibold text-slate-800">
              Validación pre-rendición —
              {errores.length > 0 && <span className="text-red-600 ml-1">{errores.length} error(es)</span>}
              {warnings.length > 0 && <span className="text-amber-600 ml-1">{warnings.length} aviso(s)</span>}
            </h3>
          </div>
          {advertencias.map((a, i) => (
            <div key={i} className={`flex items-start gap-2.5 rounded-xl px-4 py-2.5 text-sm ${
              a.nivel === 'error'
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-amber-50 border border-amber-200 text-amber-800'
            }`}>
              {a.nivel === 'error'
                ? <ShieldAlert size={14} className="mt-0.5 shrink-0" />
                : <AlertTriangle size={14} className="mt-0.5 shrink-0" />}
              <div>
                <span className="font-bold">{a.modulo}: </span>{a.msg}
              </div>
            </div>
          ))}
          {errores.length === 0 && warnings.length > 0 && (
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
              <Info size={12} /> Los avisos no bloquean la exportación, pero deben corregirse antes de subir al portal SERVEL.
            </p>
          )}
        </div>
      )}

      {advertencias.length === 0 && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-5 py-3.5 text-green-800">
          <CheckCircle size={18} className="text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Sin problemas detectados para {trimLabel(periodo)}</p>
            <p className="text-xs text-green-700 mt-0.5">Todos los módulos están listos para exportar.</p>
          </div>
        </div>
      )}

      {/* ── Grid de módulos ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {MODULOS_SERVEL.map(m => {
          const filas = resultados[m.id]
          const exportado = filas !== null && filas !== undefined

          return (
            <div key={m.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-200 transition-colors overflow-hidden">
              {/* Cabecera del módulo */}
              <div className="bg-slate-50 px-5 py-3 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-sm">
                    {m.num}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{m.label}</p>
                    <p className="text-xs text-slate-400">{m.ley}</p>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  m.periodicidad === 'anual'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {m.periodicidad === 'anual' ? `Anual ${año}` : trimLabel(periodo)}
                </span>
              </div>

              {/* Cuerpo */}
              <div className="px-5 py-4">
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">{m.desc}</p>

                {/* Resultado exportación */}
                {exportado && (
                  <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs mb-3 ${
                    filas! > 0
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    {filas! > 0
                      ? <><CheckCircle size={12} /> <span><strong>{filas}</strong> fila(s) exportadas — revisa tu carpeta de descargas</span></>
                      : <><AlertTriangle size={12} /> <span>Sin datos para este período — ingresa datos primero</span></>
                    }
                  </div>
                )}

                {/* Botón de descarga */}
                <button onClick={() => exportar(m)}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors shadow-sm shadow-indigo-100">
                  <Download size={15} />
                  Descargar M{m.num} CSV
                  <ChevronRight size={14} className="ml-auto opacity-60" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Instrucciones ───────────────────────────────────────────────────── */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-xs text-slate-600 space-y-1.5">
        <p className="font-semibold text-slate-700 flex items-center gap-2">
          <Info size={13} className="text-indigo-500" />
          Cómo subir los archivos al portal SERVEL
        </p>
        <ol className="list-decimal list-inside space-y-1 ml-1">
          <li>Ingresar a <strong>portal.servel.cl</strong> → Partidos Políticos → Rendición de Cuentas</li>
          <li>Seleccionar el período y módulo correspondiente</li>
          <li>Subir el archivo CSV descargado desde aquí (verificar que no tenga errores pre-rendición)</li>
          <li>El portal valida automáticamente — revisar los errores que SERVEL reporta</li>
          <li>Repetir para cada módulo del trimestre: M6, M12, M13, M14, M17</li>
          <li>Módulo 15 (Balance) y M16 (Activos) se suben solo al cierre anual</li>
        </ol>
        <p className="text-slate-400 mt-2">Formato: UTF-8 BOM · separador ; · DS 1174/2016 SERVEL · RUT partido en cada fila</p>
      </div>
    </div>
  )
}
