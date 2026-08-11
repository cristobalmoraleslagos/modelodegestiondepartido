import { useState, useEffect, type FormEvent } from 'react'
import { UserPlus, Search, Users, AlertCircle, X, ShieldCheck } from 'lucide-react'
import { API_DISPONIBLE, authGet, authSend } from '../api'
import type { Rol } from '../auth'
import { FUNCIONARIOS_CANON } from '../data/personal'

// ── Tipo de empleado (coincide con api/rrhh.py _serializar) ──
interface Empleado {
  id: number
  rut: string
  nombres: string
  apellidos: string
  estado: string
  email_corporativo: string | null
  telefono: string | null
  unidad_id: number | null
  fecha_ingreso: string | null
  fecha_egreso: string | null
}

const ESTADOS = ['activo', 'inactivo', 'licencia', 'desvinculado'] as const
const DEMO_KEY = 'fp_rrhh_empleados_v2'

// Separa "Nombre(s) Apellido Apellido" en nombres/apellidos (convención chilena:
// los dos últimos tokens son apellidos; el resto, nombres).
function splitNombre(full: string): { nombres: string; apellidos: string } {
  const p = full.trim().split(/\s+/)
  if (p.length <= 2) return { nombres: p[0] ?? '', apellidos: p.slice(1).join(' ') }
  return { nombres: p.slice(0, -2).join(' '), apellidos: p.slice(-2).join(' ') }
}

// Seed demo derivado de la nómina canónica real (FUNCIONARIOS_CANON, fuente única).
// Solo datos de identificación/estado — NO se expone sueldo ni cuenta bancaria.
const SEED_DEMO: Empleado[] = FUNCIONARIOS_CANON.map((f, i) => {
  const { nombres, apellidos } = splitNombre(f.nombre)
  return {
    id: i + 1, rut: f.rut, nombres, apellidos,
    estado: f.activo ? 'activo' : 'inactivo',
    email_corporativo: null, telefono: null, unidad_id: null,
    fecha_ingreso: null, fecha_egreso: null,
  }
})

// ── Acceso a datos: backend real o demo localStorage ──
const demoLoad = (): Empleado[] => {
  const raw = localStorage.getItem(DEMO_KEY)
  if (raw) { try { return JSON.parse(raw) as Empleado[] } catch { /* ignore */ } }
  localStorage.setItem(DEMO_KEY, JSON.stringify(SEED_DEMO))
  return SEED_DEMO
}
const demoSave = (list: Empleado[]) => localStorage.setItem(DEMO_KEY, JSON.stringify(list))

const estadoStyle = (e: string) =>
  e === 'activo'       ? 'bg-green-100 text-green-700' :
  e === 'licencia'     ? 'bg-amber-100 text-amber-700' :
  e === 'desvinculado' ? 'bg-red-100 text-red-700'     :
  'bg-slate-100 text-slate-500'

export default function ModuloEmpleados({ rol }: { rol: Rol }) {
  const esAdmin = rol === 'admin'
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [cargando, setCargando]   = useState(true)
  const [error, setError]         = useState('')
  const [busqueda, setBusqueda]   = useState('')
  const [showForm, setShowForm]   = useState(false)

  // Formulario de alta
  const [rut, setRut]             = useState('')
  const [nombres, setNombres]     = useState('')
  const [apellidos, setApellidos] = useState('')
  const [email, setEmail]         = useState('')
  const [telefono, setTelefono]   = useState('')
  const [fechaIngreso, setFechaIngreso] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true); setError('')
    try {
      if (API_DISPONIBLE) {
        const data = await authGet<Empleado[]>('/api/rrhh/empleados')
        setEmpleados(data)
      } else {
        setEmpleados(demoLoad())
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la nómina.')
    } finally {
      setCargando(false)
    }
  }

  async function handleAlta(e: FormEvent) {
    e.preventDefault()
    if (guardando) return
    setFormError('')
    if (!rut.trim() || !nombres.trim() || !apellidos.trim()) {
      setFormError('RUT, nombres y apellidos son obligatorios.'); return
    }
    setGuardando(true)
    const nuevo = {
      rut: rut.trim(), nombres: nombres.trim(), apellidos: apellidos.trim(),
      email_corporativo: email.trim() || null, telefono: telefono.trim() || null,
      fecha_ingreso: fechaIngreso || null, estado: 'activo',
    }
    try {
      if (API_DISPONIBLE) {
        const creado = await authSend<Empleado>('/api/rrhh/empleados', nuevo, 'POST')
        setEmpleados(prev => [creado, ...prev])
      } else {
        if (empleados.some(x => x.rut === nuevo.rut)) throw new Error('Ya existe un funcionario/a con ese RUT.')
        const creado: Empleado = { ...nuevo, id: Date.now(), unidad_id: null, fecha_egreso: null }
        const lista = [creado, ...empleados]
        demoSave(lista); setEmpleados(lista)
      }
      setRut(''); setNombres(''); setApellidos(''); setEmail(''); setTelefono(''); setFechaIngreso('')
      setShowForm(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo incorporar.')
    } finally {
      setGuardando(false)
    }
  }

  async function desvincular(emp: Empleado) {
    if (!esAdmin || emp.estado === 'desvinculado') return
    try {
      if (API_DISPONIBLE) {
        const upd = await authSend<Empleado>(`/api/rrhh/empleados/${emp.id}`, { estado: 'desvinculado' }, 'PATCH')
        setEmpleados(prev => prev.map(x => x.id === emp.id ? upd : x))
      } else {
        const lista = empleados.map(x => x.id === emp.id ? { ...x, estado: 'desvinculado' } : x)
        demoSave(lista); setEmpleados(lista)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar.')
    }
  }

  const filtrados = empleados.filter(e => {
    if (!busqueda) return true
    const t = busqueda.toLowerCase()
    return e.rut.toLowerCase().includes(t) ||
           `${e.nombres} ${e.apellidos}`.toLowerCase().includes(t)
  })
  const activos = empleados.filter(e => e.estado === 'activo').length

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Funcionarios/as', value: String(empleados.length), sub: 'Total en la ficha', icon: <Users size={18} /> },
          { label: 'Activos/as',       value: String(activos),          sub: 'Estado activo', icon: <ShieldCheck size={18} /> },
          { label: 'Modo',             value: API_DISPONIBLE ? 'Backend' : 'Demo', sub: API_DISPONIBLE ? 'Datos reales (BD)' : 'localStorage (sin servidor)', icon: <UserPlus size={18} /> },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">{k.icon}</div>
            <div>
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className="text-xl font-semibold text-slate-800">{k.value}</p>
              <p className="text-xs text-slate-400">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Barra de acciones */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 gap-3 flex-wrap">
          <h2 className="text-base font-semibold text-slate-800">Ficha de Funcionarios/as</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por RUT o nombre..."
                className="border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-sm w-56" />
            </div>
            {esAdmin && (
              <button onClick={() => setShowForm(v => !v)}
                className="bg-amaranto-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-amaranto-700 transition-colors flex items-center gap-1.5">
                <UserPlus size={15} /> Incorporar
              </button>
            )}
          </div>
        </div>

        {/* Formulario de alta (solo admin) */}
        {showForm && esAdmin && (
          <form onSubmit={handleAlta} className="p-5 border-b border-slate-100 bg-slate-50 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Incorporar funcionario/a</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'RUT *', value: rut, set: setRut, ph: '15.234.567-8' },
                { label: 'Nombres *', value: nombres, set: setNombres, ph: 'Camila' },
                { label: 'Apellidos *', value: apellidos, set: setApellidos, ph: 'Rojas Peña' },
                { label: 'Email corporativo', value: email, set: setEmail, ph: 'camila.rojas@pcch.cl' },
                { label: 'Teléfono', value: telefono, set: setTelefono, ph: '+56 9 ...' },
              ].map(f => (
                <div key={f.label} className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600">{f.label}</label>
                  <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              ))}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600">Fecha de ingreso</label>
                <input type="date" value={fechaIngreso} onChange={e => setFechaIngreso(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
            </div>
            {formError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
                <AlertCircle size={14} className="mt-0.5 shrink-0" /> {formError}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="text-sm text-slate-500 px-4 py-2 rounded-lg hover:bg-slate-200">Cancelar</button>
              <button type="submit" disabled={guardando}
                className="bg-amaranto-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-amaranto-700 disabled:opacity-50">
                {guardando ? 'Guardando...' : 'Guardar funcionario/a'}
              </button>
            </div>
          </form>
        )}

        {/* Tabla */}
        {error && (
          <div className="m-5 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
            <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100">
                {['Funcionario/a', 'RUT', 'Email', 'Ingreso', 'Estado', ''].map(h => (
                  <th key={h} className="text-left py-3 px-4 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400 text-sm">Cargando nómina...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400 text-sm">Sin funcionarios/as {busqueda ? 'que coincidan' : 'registrados aún'}.</td></tr>
              ) : filtrados.map(e => (
                <tr key={e.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">{e.nombres} {e.apellidos}</td>
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{e.rut}</td>
                  <td className="py-3 px-4 text-slate-500">{e.email_corporativo ?? '—'}</td>
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{e.fecha_ingreso ?? '—'}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${estadoStyle(e.estado)}`}>{e.estado}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {esAdmin && e.estado !== 'desvinculado' && (
                      <button onClick={() => desvincular(e)}
                        className="text-xs text-red-500 hover:text-red-700 hover:underline">Desvincular</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {!esAdmin && (
        <p className="text-xs text-slate-400 text-center">Solo un administrador/a puede incorporar o desvincular funcionarios/as.</p>
      )}
    </div>
  )
}
