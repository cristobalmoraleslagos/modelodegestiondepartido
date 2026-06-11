import { useEffect, useState } from 'react'
import { UserPlus, ShieldCheck, ShieldOff, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react'
import { authGet, authSend, ApiError } from '../api'

interface U {
  id: number; username: string; nombre: string; rol: string
  rut: string | null; activo: boolean; permanente: boolean; ultimo_acceso: string | null
}

export default function ModuloUsuarios() {
  const [lista, setLista] = useState<U[]>([])
  const [form, setForm] = useState({ username: '', nombre: '', password: '', rol: 'funcionario', rut: '', permanente: true })
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null)

  async function cargar() {
    try { setLista(await authGet<U[]>('/api/usuarios')) }
    catch (e) { setMsg({ tipo: 'err', texto: e instanceof ApiError ? e.message : 'Error' }) }
  }
  useEffect(() => { cargar() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  async function crear() {
    if (!form.username || !form.nombre || form.password.length < 8) {
      setMsg({ tipo: 'err', texto: 'Email, nombre y contraseña (mín. 8) son obligatorios.' }); return
    }
    try {
      await authSend('/api/usuarios', { ...form, rut: form.rut || null }, 'POST')
      setMsg({ tipo: 'ok', texto: 'Funcionario creado.' })
      setForm({ username: '', nombre: '', password: '', rol: 'funcionario', rut: '', permanente: true })
      await cargar()
    } catch (e) { setMsg({ tipo: 'err', texto: e instanceof ApiError ? e.message : 'Error' }) }
  }

  async function toggleActivo(u: U) {
    try { await authSend(`/api/usuarios/${u.id}`, { activo: !u.activo }, 'PATCH'); await cargar() }
    catch (e) { setMsg({ tipo: 'err', texto: e instanceof ApiError ? e.message : 'Error' }) }
  }

  async function resetPass(u: U) {
    const p = window.prompt(`Nueva contraseña para ${u.nombre} (mín. 8):`)
    if (!p || p.length < 8) return
    try { await authSend(`/api/usuarios/${u.id}`, { password: p }, 'PATCH'); setMsg({ tipo: 'ok', texto: 'Contraseña reseteada.' }) }
    catch (e) { setMsg({ tipo: 'err', texto: e instanceof ApiError ? e.message : 'Error' }) }
  }

  const inp = 'border border-slate-300 rounded-lg px-3 py-2 text-sm'

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800 mb-1">Alta de funcionario</h2>
        <p className="text-xs text-slate-500 mb-4">La contraseña se guarda con hash bcrypt. Solo administradores pueden crear/desactivar usuarios.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <input className={inp} placeholder="Email (usuario)" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
          <input className={inp} placeholder="Nombre completo" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
          <input className={inp} type="password" placeholder="Contraseña (mín. 8)" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          <input className={inp} placeholder="RUT (opcional)" value={form.rut} onChange={e => setForm({ ...form, rut: e.target.value })} />
          <select className={inp} value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}>
            <option value="funcionario">Funcionario</option>
            <option value="auditor">Auditor (solo lectura)</option>
            <option value="admin">Administrador</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={form.permanente} onChange={e => setForm({ ...form, permanente: e.target.checked })} />
            Regular y permanente
          </label>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={crear} className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg px-4 py-2 flex items-center gap-2">
            <UserPlus size={15} />Crear funcionario
          </button>
          {msg && <span className={`flex items-center gap-1.5 text-sm ${msg.tipo === 'ok' ? 'text-emerald-700' : 'text-red-700'}`}>
            {msg.tipo === 'ok' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}{msg.texto}</span>}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-5 border-b border-slate-100"><h2 className="text-base font-semibold text-slate-800">Usuarios</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-slate-500 border-b border-slate-100">
              {['Usuario', 'Nombre', 'Rol', 'Permanente', 'Último acceso', 'Estado', ''].map(h => <th key={h} className="text-left py-3 px-3 font-medium">{h}</th>)}
            </tr></thead>
            <tbody>
              {lista.map(u => (
                <tr key={u.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="py-2.5 px-3 text-xs text-slate-500">{u.username}</td>
                  <td className="py-2.5 px-3 text-slate-700">{u.nombre}</td>
                  <td className="py-2.5 px-3 capitalize">{u.rol}</td>
                  <td className="py-2.5 px-3">{u.permanente ? 'Sí' : 'No'}</td>
                  <td className="py-2.5 px-3 text-xs text-slate-500">{u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString('es-CL') : '—'}</td>
                  <td className="py-2.5 px-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.activo ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>{u.activo ? 'Activo' : 'Inactivo'}</span>
                  </td>
                  <td className="py-2.5 px-3 flex items-center gap-1">
                    <button onClick={() => toggleActivo(u)} className="p-1 rounded hover:bg-slate-100" title={u.activo ? 'Desactivar' : 'Activar'}>
                      {u.activo ? <ShieldOff size={15} className="text-amber-600" /> : <ShieldCheck size={15} className="text-green-600" />}
                    </button>
                    <button onClick={() => resetPass(u)} className="p-1 rounded hover:bg-slate-100" title="Resetear contraseña"><KeyRound size={15} className="text-slate-500" /></button>
                  </td>
                </tr>
              ))}
              {lista.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-slate-400 text-sm">Sin usuarios.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
