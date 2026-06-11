import { useEffect, useState } from 'react'
import { Upload, Download, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import { authGet, authUpload, ApiError, BASE, getToken } from '../api'

interface Contrato {
  id: number; funcionario_rut: string; funcionario_nombre: string; tipo_contrato: string
  fecha_inicio: string | null; fecha_termino: string | null; archivo_nombre: string; vigente: boolean
}

export default function ModuloContratos() {
  const [lista, setLista] = useState<Contrato[]>([])
  const [form, setForm] = useState({ rut: '', nombre: '', tipo: 'honorarios', inicio: '', termino: '' })
  const [archivo, setArchivo] = useState<File | null>(null)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null)
  const [cargando, setCargando] = useState(false)

  async function cargar() {
    try { setLista(await authGet<Contrato[]>('/api/contratos')) }
    catch (e) { setMsg({ tipo: 'err', texto: e instanceof ApiError ? e.message : 'Error' }) }
  }
  useEffect(() => { cargar() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  async function subir() {
    if (!archivo || !form.rut || !form.nombre) {
      setMsg({ tipo: 'err', texto: 'RUT, nombre y archivo PDF son obligatorios.' }); return
    }
    setCargando(true); setMsg(null)
    try {
      const fd = new FormData()
      fd.append('funcionario_rut', form.rut)
      fd.append('funcionario_nombre', form.nombre)
      fd.append('tipo_contrato', form.tipo)
      if (form.inicio) fd.append('fecha_inicio', form.inicio.split('-').reverse().join('/'))
      if (form.termino) fd.append('fecha_termino', form.termino.split('-').reverse().join('/'))
      fd.append('archivo', archivo)
      await authUpload('/api/contratos/upload', fd)
      setMsg({ tipo: 'ok', texto: 'Contrato cargado y resguardado en el servidor.' })
      setArchivo(null); setForm({ rut: '', nombre: '', tipo: 'honorarios', inicio: '', termino: '' })
      await cargar()
    } catch (e) { setMsg({ tipo: 'err', texto: e instanceof ApiError ? e.message : 'Error al subir' }) }
    finally { setCargando(false) }
  }

  async function descargar(c: Contrato) {
    try {
      const res = await fetch(`${BASE}/api/contratos/${c.id}/download`, { headers: { Authorization: `Bearer ${getToken()}` } })
      if (!res.ok) throw new Error('No se pudo descargar')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = c.archivo_nombre; a.click()
      URL.revokeObjectURL(url)
    } catch (e) { setMsg({ tipo: 'err', texto: e instanceof Error ? e.message : 'Error' }) }
  }

  const inp = 'border border-slate-300 rounded-lg px-3 py-2 text-sm'

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800 mb-1">Cargar contrato</h2>
        <p className="text-xs text-slate-500 mb-4">Solo PDF. El archivo se guarda en el servidor con su hash SHA-256 y queda auditado.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <input className={inp} placeholder="RUT funcionario" value={form.rut} onChange={e => setForm({ ...form, rut: e.target.value })} />
          <input className={inp} placeholder="Nombre funcionario" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
          <select className={inp} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
            <option value="honorarios">Honorarios</option>
            <option value="planta">Planta</option>
            <option value="codigo_trabajo">Código del Trabajo</option>
          </select>
          <div><label className="block text-xs text-slate-400 mb-1">Inicio</label><input type="date" className={inp + ' w-full'} value={form.inicio} onChange={e => setForm({ ...form, inicio: e.target.value })} /></div>
          <div><label className="block text-xs text-slate-400 mb-1">Término (opcional)</label><input type="date" className={inp + ' w-full'} value={form.termino} onChange={e => setForm({ ...form, termino: e.target.value })} /></div>
          <div><label className="block text-xs text-slate-400 mb-1">Contrato (PDF)</label>
            <input type="file" accept="application/pdf" onChange={e => setArchivo(e.target.files?.[0] ?? null)}
              className="block w-full text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:text-sm" /></div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={subir} disabled={cargando} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 flex items-center gap-2">
            <Upload size={15} />{cargando ? 'Subiendo…' : 'Subir contrato'}
          </button>
          {msg && (
            <span className={`flex items-center gap-1.5 text-sm ${msg.tipo === 'ok' ? 'text-emerald-700' : 'text-red-700'}`}>
              {msg.tipo === 'ok' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}{msg.texto}
            </span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-5 border-b border-slate-100"><h2 className="text-base font-semibold text-slate-800">Contratos cargados</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-slate-500 border-b border-slate-100">
              {['RUT', 'Funcionario', 'Tipo', 'Inicio', 'Término', 'Archivo', ''].map(h => <th key={h} className="text-left py-3 px-3 font-medium">{h}</th>)}
            </tr></thead>
            <tbody>
              {lista.map(c => (
                <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="py-2.5 px-3 text-xs text-slate-500">{c.funcionario_rut}</td>
                  <td className="py-2.5 px-3 text-slate-700">{c.funcionario_nombre}</td>
                  <td className="py-2.5 px-3 capitalize text-slate-600">{c.tipo_contrato.replace('_', ' ')}</td>
                  <td className="py-2.5 px-3 text-xs text-slate-500">{c.fecha_inicio ?? '—'}</td>
                  <td className="py-2.5 px-3 text-xs text-slate-500">{c.fecha_termino ?? 'Indefinido'}</td>
                  <td className="py-2.5 px-3 text-xs text-slate-500 flex items-center gap-1"><FileText size={13} />{c.archivo_nombre}</td>
                  <td className="py-2.5 px-3">
                    <button onClick={() => descargar(c)} className="text-indigo-600 hover:text-indigo-800 p-1 rounded hover:bg-indigo-50" title="Descargar"><Download size={15} /></button>
                  </td>
                </tr>
              ))}
              {lista.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-slate-400 text-sm">Sin contratos cargados.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
