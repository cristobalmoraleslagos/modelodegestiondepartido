import { useState } from 'react'
import { BarChart3, FolderOutput, AlertCircle, CheckCircle2 } from 'lucide-react'
import { authGet, authSend, ApiError } from '../api'
import { fmt } from '../utils'

interface Informe {
  periodo: string | null; boletas_total: number; boletas_vigentes: number; boletas_anuladas: number
  honorario_bruto: number; retencion: number; liquido: number; emisores: number
}
interface Manifiesto { carpeta: string; manifiesto: { boletas_vigentes: number; emisores: number; honorario_bruto: number; retencion: number; archivos: string[] } }

export default function ModuloInformes() {
  const [periodo, setPeriodo] = useState('')
  const [inf, setInf] = useState<Informe | null>(null)
  const [rend, setRend] = useState<Manifiesto | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  async function generarInforme() {
    setMsg(null); setRend(null)
    try { setInf(await authGet<Informe>(`/api/informes/honorarios${periodo ? `?periodo=${periodo}` : ''}`)) }
    catch (e) { setMsg(e instanceof ApiError ? e.message : 'Error') }
  }

  async function generarRendicion() {
    if (!periodo) { setMsg('Indica el período (YYYY-MM) para generar la carpeta.'); return }
    setCargando(true); setMsg(null)
    try {
      const r = await authSend<Manifiesto>(`/api/rendicion/generar?periodo=${periodo}`, {}, 'POST')
      setRend(r)
    } catch (e) { setMsg(e instanceof ApiError ? e.message : 'Error') }
    finally { setCargando(false) }
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800 mb-1">Informes y rendición</h2>
        <p className="text-xs text-slate-500 mb-4">Genera el informe de honorarios y vuelca la nómina M14 a la carpeta de rendición del servidor.</p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Período (YYYY-MM)</label>
            <input value={periodo} onChange={e => setPeriodo(e.target.value)} placeholder="2026-05"
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-36" />
          </div>
          <button onClick={generarInforme} className="bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg px-4 py-2 flex items-center gap-2">
            <BarChart3 size={15} />Generar informe
          </button>
          <button onClick={generarRendicion} disabled={cargando} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 flex items-center gap-2">
            <FolderOutput size={15} />{cargando ? 'Generando…' : 'Generar carpeta de rendición'}
          </button>
        </div>
        {msg && <div className="mt-3 flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2"><AlertCircle size={15} />{msg}</div>}
      </div>

      {inf && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Informe de honorarios {inf.periodo ?? '(todos)'}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { l: 'Boletas vigentes', v: String(inf.boletas_vigentes) },
              { l: 'Anuladas', v: String(inf.boletas_anuladas) },
              { l: 'Emisores', v: String(inf.emisores) },
              { l: 'Honorario bruto', v: fmt(inf.honorario_bruto) },
              { l: 'Retención', v: fmt(inf.retencion) },
              { l: 'Líquido pagado', v: fmt(inf.liquido) },
            ].map((k, i) => (
              <div key={i}><p className="text-xs text-slate-500">{k.l}</p><p className="text-lg font-semibold text-slate-800">{k.v}</p></div>
            ))}
          </div>
        </div>
      )}

      {rend && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm mb-2"><CheckCircle2 size={16} />Carpeta de rendición generada</div>
          <p className="text-xs text-emerald-900">Ruta servidor: <code className="bg-white/60 px-1 rounded">{rend.carpeta}</code></p>
          <p className="text-xs text-emerald-900 mt-1">
            {rend.manifiesto.boletas_vigentes} boletas · {rend.manifiesto.emisores} emisores · bruto {fmt(rend.manifiesto.honorario_bruto)} · retención {fmt(rend.manifiesto.retencion)}
          </p>
          <p className="text-xs text-emerald-900 mt-1">Archivos: {rend.manifiesto.archivos.join(', ')} + manifiesto.json</p>
        </div>
      )}
    </div>
  )
}
