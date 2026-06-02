/**
 * ExportadorSERVEL — Panel de exportación de módulos SERVEL.
 * Incluye: selector de período, validación previa, botones por módulo.
 *
 * Uso: agregar a cada Hub o como panel flotante en HubEgresos, HubIngresos, etc.
 * Pasarle `modulos` para mostrar solo los relevantes al contexto.
 */
import { useState } from 'react'
import {
  Download, AlertTriangle, CheckCircle, ShieldAlert,
  FileText, ChevronDown,
} from 'lucide-react'
import {
  exportM6, exportM12, exportM13, exportM14, exportM16, exportM17,
  validarPrevio, periodoLabel, trimLabel,
  type Periodo, type Trimestre, type AdvertenciaExport,
} from '../exporters/servel'
import type { Prestamo } from '../api'

// ─── Tipos ───────────────────────────────────────────────────────────────────

type ModuloId = 'M6' | 'M12' | 'M13' | 'M14' | 'M16' | 'M17'

interface ModuloDef {
  id:          ModuloId
  num:         number
  label:       string
  desc:        string
  periodicidad:'trimestral' | 'anual'
}

const MODULOS: ModuloDef[] = [
  { id: 'M6',  num:  6, label: 'Fuentes de Financiamiento', desc: 'Aportes estatales, cotizaciones, donaciones, otros ingresos', periodicidad: 'trimestral' },
  { id: 'M12', num: 12, label: 'Gastos Detallados',          desc: 'Todas las transacciones de egreso del período',              periodicidad: 'trimestral' },
  { id: 'M13', num: 13, label: 'Donaciones Recibidas',       desc: 'Detalle por donante: nombre, RUT, monto, fecha',             periodicidad: 'trimestral' },
  { id: 'M14', num: 14, label: 'Nómina de Personal',         desc: 'Contratistas y empleados activos del período',               periodicidad: 'trimestral' },
  { id: 'M16', num: 16, label: 'Inventario Activos Fijos',   desc: 'Código, valor, depreciación y valor libro de cada activo',   periodicidad: 'anual'       },
  { id: 'M17', num: 17, label: 'Préstamos y Créditos',       desc: 'Detalle de deudas vigentes con instituciones financieras',   periodicidad: 'trimestral' },
]

interface Props {
  /** Cuáles módulos mostrar. Si se omite, muestra todos. */
  modulos?:       ModuloId[]
  /** Préstamos para M17 (pasados desde ModuloDeuda). */
  prestamos?:     Prestamo[]
  /** Clase extra para el contenedor */
  className?:     string
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function ExportadorSERVEL({ modulos, prestamos = [], className = '' }: Props) {
  const [trimestre, setTrimestre] = useState<Trimestre>('Q2')
  const [año,       setAño]       = useState(2026)
  const [abierto,   setAbierto]   = useState(false)
  const [resultado, setResultado] = useState<{ modulo: string; filas: number } | null>(null)

  const periodo: Periodo = { trimestre, año }
  const lista = modulos ? MODULOS.filter(m => modulos.includes(m.id)) : MODULOS
  const advertencias: AdvertenciaExport[] = validarPrevio(periodo, prestamos)
  const errores   = advertencias.filter(a => a.nivel === 'error')
  const warnings  = advertencias.filter(a => a.nivel === 'warning')

  function exportar(m: ModuloDef) {
    let res: { filas: number }
    switch (m.id) {
      case 'M6':  res = exportM6(periodo);               break
      case 'M12': res = exportM12(periodo);              break
      case 'M13': res = exportM13(periodo);              break
      case 'M14': res = exportM14(periodo);              break
      case 'M16': res = exportM16(año);                  break
      case 'M17': res = exportM17(periodo, prestamos);   break
      default:    return
    }
    setResultado({ modulo: `M${m.num} — ${m.label}`, filas: res.filas })
    setTimeout(() => setResultado(null), 5000)
  }

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl shadow-sm ${className}`}>
      {/* Header colapsable */}
      <button
        onClick={() => setAbierto(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 rounded-2xl transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Download size={16} className="text-indigo-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-800">Exportar para SERVEL</p>
            <p className="text-xs text-slate-500">
              CSV formato DS 1174/2016 · período {trimLabel(periodo)}
              {errores.length > 0 && (
                <span className="ml-2 text-red-600 font-medium">· {errores.length} error(es) pre-rendición</span>
              )}
            </p>
          </div>
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && (
        <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-4">

          {/* Selector de período */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 flex-1">
              {(['Q1','Q2','Q3','Q4'] as Trimestre[]).map(t => (
                <button key={t} onClick={() => setTrimestre(t)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    trimestre === t ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
            <select value={año} onChange={e => setAño(Number(e.target.value))}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400">
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <div className="text-xs text-slate-500 whitespace-nowrap">
              <span className="font-mono bg-slate-100 px-2 py-1 rounded">{periodoLabel(periodo)}</span>
            </div>
          </div>

          {/* Advertencias pre-rendición */}
          {advertencias.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Validación pre-rendición</p>
              {advertencias.map((a, i) => (
                <div key={i} className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
                  a.nivel === 'error' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'
                }`}>
                  {a.nivel === 'error'
                    ? <ShieldAlert size={13} className="mt-0.5 shrink-0" />
                    : <AlertTriangle size={13} className="mt-0.5 shrink-0" />}
                  <span><strong>{a.modulo}:</strong> {a.msg}</span>
                </div>
              ))}
            </div>
          )}

          {/* Grid de módulos */}
          <div className="grid grid-cols-2 gap-2">
            {lista.map(m => (
              <button key={m.id}
                onClick={() => exportar(m)}
                className="flex items-start gap-3 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 rounded-xl px-3.5 py-3 text-left transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-100 group-hover:bg-indigo-200 flex items-center justify-center shrink-0 transition-colors">
                  <FileText size={14} className="text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-700 group-hover:text-indigo-700">
                    Módulo {m.num}
                    <span className="ml-1 text-xs font-normal text-slate-400">
                      {m.periodicidad === 'anual' ? '(anual)' : `(${trimestre} ${año})`}
                    </span>
                  </p>
                  <p className="text-xs font-medium text-slate-600">{m.label}</p>
                  <p className="text-xs text-slate-400 truncate">{m.desc}</p>
                </div>
                <Download size={13} className="text-slate-300 group-hover:text-indigo-400 shrink-0 mt-1 transition-colors" />
              </button>
            ))}
          </div>

          {/* Resultado última exportación */}
          {resultado && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-xs text-green-800">
              <CheckCircle size={14} className="shrink-0 text-green-600" />
              <span>
                <strong>{resultado.modulo}</strong> exportado —
                {resultado.filas > 0
                  ? ` ${resultado.filas} fila(s) en CSV formato SERVEL`
                  : ' sin datos para este período (el CSV está vacío — ingresar datos primero)'}
              </span>
            </div>
          )}

          <p className="text-xs text-slate-400">
            Formato: UTF-8 con BOM · separador &#59; · fechas DD/MM/YYYY · DS 1174/2016 SERVEL
          </p>
        </div>
      )}
    </div>
  )
}
