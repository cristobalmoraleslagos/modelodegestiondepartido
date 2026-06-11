import { useEffect, useState } from 'react'
import { Upload, Ban, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import { authGet, authUpload, authSend, ApiError } from '../api'
import { fmt } from '../utils'

interface BHE {
  id: number; folio: string; rut_emisor: string; nombre_emisor: string
  fecha: string | null; periodo: string; bruto: number; retencion: number
  liquido: number; anulada: boolean; motivo_anulacion: string | null
}

const periodoActual = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function ModuloCargaBHE() {
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [archivo, setArchivo] = useState<File | null>(null)
  const [filtro, setFiltro] = useState('')
  const [lista, setLista] = useState<BHE[]>([])
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null)
  const [cargando, setCargando] = useState(false)

  async function cargar() {
    try {
      const data = await authGet<BHE[]>(`/api/bhe${filtro ? `?periodo=${filtro}` : ''}`)
      setLista(data)
    } catch (e) { setMsg({ tipo: 'err', texto: e instanceof ApiError ? e.message : 'Error al listar' }) }
  }
  useEffect(() => { cargar() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  async function subir() {
    if (!archivo) return
    setCargando(true); setMsg(null)
    try {
      const fd = new FormData()
      fd.append('anio', String(anio))
      fd.append('archivo', archivo)
      const r = await authUpload<{ insertadas: number; duplicadas: number; anuladas: number; total_detectadas: number }>('/api/bhe/upload', fd)
      setMsg({ tipo: 'ok', texto: `${r.insertadas} cargadas (${r.anuladas} anuladas, ${r.duplicadas} duplicadas) de ${r.total_detectadas} detectadas.` })
      setArchivo(null)
      await cargar()
    } catch (e) { setMsg({ tipo: 'err', texto: e instanceof ApiError ? e.message : 'Error al subir' }) }
    finally { setCargando(false) }
  }

  async function anular(b: BHE) {
    const motivo = window.prompt(`Motivo de anulación de la boleta ${b.folio}:`)
    if (!motivo || motivo.trim().length < 3) return
    try {
      await authSend(`/api/bhe/${b.id}/anular`, { motivo: motivo.trim() }, 'PATCH')
      await cargar()
    } catch (e) { setMsg({ tipo: 'err', texto: e instanceof ApiError ? e.message : 'Error al anular' }) }
  }

  const vig = lista.filter(b => !b.anulada)
  const totBruto = vig.reduce((s, b) => s + (b.bruto || 0), 0)
  const totRet = vig.reduce((s, b) => s + (b.retencion || 0), 0)

  return (
    <div className="space-y-5">
      {/* Carga */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800 mb-1">Cargar BHE</h2>
        <p className="text-xs text-slate-500 mb-4">Sube el archivo mensual de Boletas de Honorarios del SII (.xls). Las boletas anuladas se conservan marcadas.</p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Año</label>
            <input type="number" value={anio} min={2017} max={2035} onChange={e => setAnio(Number(e.target.value))}
              className="w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs text-slate-500 mb-1">Archivo BHE (.xls)</label>
            <input type="file" accept=".xls,.xlsx,.html,.htm" onChange={e => setArchivo(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:text-sm" />
          </div>
          <button onClick={subir} disabled={!archivo || cargando}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 flex items-center gap-2">
            <Upload size={15} />{cargando ? 'Subiendo…' : 'Subir'}
          </button>
        </div>
        {msg && (
          <div className={`mt-3 flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${msg.tipo === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {msg.tipo === 'ok' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}{msg.texto}
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Boletas vigentes', value: String(vig.length) },
          { label: 'Honorario bruto', value: fmt(totBruto) },
          { label: 'Retención', value: fmt(totRet) },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-slate-500">{k.label}</p>
            <p className="text-xl font-semibold text-slate-800">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Boletas cargadas</h2>
          <div className="flex items-center gap-2">
            <input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="Período YYYY-MM"
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-36" />
            <button onClick={cargar} className="text-slate-500 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-50" title="Filtrar/Refrescar">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100">
                {['Folio', 'RUT', 'Emisor', 'Fecha', 'Bruto', 'Retención', 'Líquido', 'Estado', ''].map(h => (
                  <th key={h} className="text-left py-3 px-3 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map(b => (
                <tr key={b.id} className={`border-b border-slate-50 last:border-0 ${b.anulada ? 'bg-red-50/60' : 'hover:bg-slate-50'}`}>
                  <td className="py-2.5 px-3 font-mono text-xs text-slate-500">{b.folio}</td>
                  <td className="py-2.5 px-3 text-slate-500 text-xs">{b.rut_emisor}</td>
                  <td className="py-2.5 px-3 text-slate-700">{b.nombre_emisor}</td>
                  <td className="py-2.5 px-3 text-slate-500 text-xs">{b.fecha ?? '—'}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">{fmt(b.bruto)}</td>
                  <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{fmt(b.retencion)}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">{fmt(b.liquido)}</td>
                  <td className="py-2.5 px-3">
                    {b.anulada
                      ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full" title={b.motivo_anulacion ?? ''}>Anulada</span>
                      : <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Vigente</span>}
                  </td>
                  <td className="py-2.5 px-3">
                    {!b.anulada && (
                      <button onClick={() => anular(b)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50" title="Marcar anulada">
                        <Ban size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {lista.length === 0 && (
                <tr><td colSpan={9} className="py-8 text-center text-slate-400 text-sm">Sin boletas. Sube un archivo BHE para empezar.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
