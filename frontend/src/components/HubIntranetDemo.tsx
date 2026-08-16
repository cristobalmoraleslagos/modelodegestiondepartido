/**
 * HubIntranetDemo.tsx — Réplica DEMO de la intranet, 100% en el navegador.
 *
 * Funciona SIN backend: todo se guarda en localStorage de este navegador.
 * Pensada para visualizar el módulo en el despliegue estático (sin servidor).
 * Incluye: marca de ingreso/salida, carga de boletas, informes, cumpleaños,
 * vacaciones y calendario de hitos/actividades.
 *
 * Los datos NO se sincronizan entre dispositivos ni se resguardan en servidor:
 * para eso está la intranet segura (backend) que se activa con VITE_API_URL.
 */
import { useEffect, useState } from 'react'
import {
  Clock, FileText, BarChart3, Cake, Plane, CalendarDays,
  LogIn, LogOut, Plus, Trash2, Ban, CheckCircle2, Info, Users,
} from 'lucide-react'
import { fmt } from '../utils'
import type { Rol } from '../auth'
import ModuloEmpleados from './ModuloEmpleados'

// ── Persistencia local ──────────────────────────────────────────────────────
function useLocal<T>(key: string, initial: T) {
  const [val, setVal] = useState<T>(() => {
    try { const r = localStorage.getItem(key); return r ? (JSON.parse(r) as T) : initial }
    catch { return initial }
  })
  useEffect(() => { localStorage.setItem(key, JSON.stringify(val)) }, [key, val])
  return [val, setVal] as const
}

const hoyISO = () => new Date().toISOString().slice(0, 10)
const ahoraHM = () => new Date().toTimeString().slice(0, 5)
const inp = 'border border-slate-300 rounded-lg px-3 py-2 text-sm'
const btnP = 'bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg px-4 py-2 flex items-center gap-2'

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-2xl p-5 shadow-sm">{children}</div>
}
function Vacio({ t }: { t: string }) {
  return <tr><td colSpan={99} className="py-7 text-center text-slate-400 text-sm">{t}</td></tr>
}

// ════════════════════════════════ ASISTENCIA ════════════════════════════════
interface Marca { fecha: string; ingreso?: string; salida?: string }
function horas(m: Marca): string {
  if (!m.ingreso || !m.salida) return '—'
  const [hi, mi] = m.ingreso.split(':').map(Number)
  const [hs, ms] = m.salida.split(':').map(Number)
  const min = (hs * 60 + ms) - (hi * 60 + mi)
  if (min <= 0) return '—'
  return `${Math.floor(min / 60)}h ${min % 60}m`
}
function Asistencia() {
  const [marcas, setMarcas] = useLocal<Marca[]>('fp_demo_asistencia', [])
  const hoy = hoyISO()
  const hoyM = marcas.find(m => m.fecha === hoy)

  function marcarIngreso() {
    if (hoyM?.ingreso) return
    setMarcas([{ fecha: hoy, ingreso: ahoraHM() }, ...marcas.filter(m => m.fecha !== hoy)])
  }
  function marcarSalida() {
    if (!hoyM?.ingreso || hoyM?.salida) return
    setMarcas(marcas.map(m => m.fecha === hoy ? { ...m, salida: ahoraHM() } : m))
  }
  const orden = [...marcas].sort((a, b) => b.fecha.localeCompare(a.fecha))

  return (
    <div className="space-y-5">
      <Card>
        <h2 className="text-base font-semibold text-slate-800 mb-1">Marca de ingreso / salida</h2>
        <p className="text-xs text-slate-500 mb-4">Registra tu hora de entrada y salida del día. Se guarda en este navegador.</p>
        <div className="flex flex-wrap items-center gap-4">
          <button onClick={marcarIngreso} disabled={!!hoyM?.ingreso} className={`${btnP} disabled:opacity-40`}><LogIn size={15} />Marcar ingreso</button>
          <button onClick={marcarSalida} disabled={!hoyM?.ingreso || !!hoyM?.salida} className="bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-sm font-medium rounded-lg px-4 py-2 flex items-center gap-2"><LogOut size={15} />Marcar salida</button>
          <div className="ml-auto text-right">
            <p className="text-xs text-slate-500">Hoy {hoy}</p>
            <p className="text-sm font-semibold text-slate-800">
              {hoyM?.ingreso ? `Ingreso ${hoyM.ingreso}` : 'Sin marcar'}{hoyM?.salida ? ` · Salida ${hoyM.salida}` : ''}
            </p>
          </div>
        </div>
      </Card>
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-5 border-b border-slate-100"><h3 className="text-base font-semibold text-slate-800">Registro de asistencia</h3></div>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="text-xs text-slate-500 border-b border-slate-100">
            {['Día', 'Marcado', 'Ingreso', 'Salida', 'Horas'].map(h => <th key={h} className="text-left py-3 px-4 font-medium">{h}</th>)}
          </tr></thead>
          <tbody>
            {orden.map(m => (
              <tr key={m.fecha} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                <td className="py-2.5 px-4 text-slate-700">{m.fecha}</td>
                <td className="py-2.5 px-4">
                  {m.ingreso ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Marcado</span>
                            : <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">No</span>}
                </td>
                <td className="py-2.5 px-4 text-slate-600">{m.ingreso ?? '—'}</td>
                <td className="py-2.5 px-4 text-slate-600">{m.salida ?? '—'}</td>
                <td className="py-2.5 px-4 font-medium text-slate-800">{horas(m)}</td>
              </tr>
            ))}
            {orden.length === 0 && <Vacio t="Aún no marcas asistencia." />}
          </tbody>
        </table></div>
      </div>
    </div>
  )
}

// ════════════════════════════════ BOLETAS ═══════════════════════════════════
interface Boleta { id: number; folio: string; emisor: string; rut: string; fecha: string; monto: number; anulada: boolean }
function Boletas() {
  const [lista, setLista] = useLocal<Boleta[]>('fp_demo_boletas', [])
  const [f, setF] = useState({ folio: '', emisor: '', rut: '', fecha: hoyISO(), monto: '' })
  function add() {
    if (!f.folio || !f.emisor || !f.monto) return
    setLista([{ id: Date.now(), folio: f.folio, emisor: f.emisor, rut: f.rut, fecha: f.fecha, monto: Number(f.monto), anulada: false }, ...lista])
    setF({ folio: '', emisor: '', rut: '', fecha: hoyISO(), monto: '' })
  }
  const vig = lista.filter(b => !b.anulada)
  return (
    <div className="space-y-5">
      <Card>
        <h2 className="text-base font-semibold text-slate-800 mb-1">Carga de boletas</h2>
        <p className="text-xs text-slate-500 mb-4">Registra boletas de honorarios. Puedes marcarlas como anuladas (se conservan en la tabla).</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <input className={inp} placeholder="Folio" value={f.folio} onChange={e => setF({ ...f, folio: e.target.value })} />
          <input className={inp} placeholder="Emisor" value={f.emisor} onChange={e => setF({ ...f, emisor: e.target.value })} />
          <input className={inp} placeholder="RUT" value={f.rut} onChange={e => setF({ ...f, rut: e.target.value })} />
          <input className={inp} type="date" value={f.fecha} onChange={e => setF({ ...f, fecha: e.target.value })} />
          <input className={inp} type="number" placeholder="Monto" value={f.monto} onChange={e => setF({ ...f, monto: e.target.value })} />
        </div>
        <button onClick={add} className={`${btnP} mt-4`}><Plus size={15} />Agregar boleta</button>
      </Card>
      <div className="grid grid-cols-2 gap-4">
        <Card><p className="text-xs text-slate-500">Boletas vigentes</p><p className="text-xl font-semibold text-slate-800">{vig.length}</p></Card>
        <Card><p className="text-xs text-slate-500">Monto vigente</p><p className="text-xl font-semibold text-slate-800">{fmt(vig.reduce((s, b) => s + b.monto, 0))}</p></Card>
      </div>
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-5 border-b border-slate-100"><h3 className="text-base font-semibold text-slate-800">Boletas cargadas</h3></div>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="text-xs text-slate-500 border-b border-slate-100">
            {['Folio', 'Emisor', 'RUT', 'Fecha', 'Monto', 'Estado', ''].map(h => <th key={h} className="text-left py-3 px-4 font-medium">{h}</th>)}
          </tr></thead>
          <tbody>
            {lista.map(b => (
              <tr key={b.id} className={`border-b border-slate-50 last:border-0 ${b.anulada ? 'bg-red-50/60' : 'hover:bg-slate-50'}`}>
                <td className="py-2.5 px-4 font-mono text-xs text-slate-500">{b.folio}</td>
                <td className="py-2.5 px-4 text-slate-700">{b.emisor}</td>
                <td className="py-2.5 px-4 text-xs text-slate-500">{b.rut || '—'}</td>
                <td className="py-2.5 px-4 text-xs text-slate-500">{b.fecha}</td>
                <td className="py-2.5 px-4">{fmt(b.monto)}</td>
                <td className="py-2.5 px-4">{b.anulada ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Anulada</span> : <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Vigente</span>}</td>
                <td className="py-2.5 px-4 flex gap-1">
                  {!b.anulada && <button onClick={() => setLista(lista.map(x => x.id === b.id ? { ...x, anulada: true } : x))} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50" title="Anular"><Ban size={15} /></button>}
                  <button onClick={() => setLista(lista.filter(x => x.id !== b.id))} className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100" title="Eliminar"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
            {lista.length === 0 && <Vacio t="Sin boletas registradas." />}
          </tbody>
        </table></div>
      </div>
    </div>
  )
}

// ════════════════════════════════ CUMPLEAÑOS ════════════════════════════════
interface Cumple { id: number; nombre: string; fecha: string } // fecha MM-DD
function diasHasta(mmdd: string): number {
  const [mm, dd] = mmdd.split('-').map(Number)
  const hoy = new Date(); const y = hoy.getFullYear()
  let prox = new Date(y, mm - 1, dd)
  if (prox < new Date(y, hoy.getMonth(), hoy.getDate())) prox = new Date(y + 1, mm - 1, dd)
  return Math.round((prox.getTime() - new Date(y, hoy.getMonth(), hoy.getDate()).getTime()) / 86400000)
}
function Cumpleanos() {
  const [lista, setLista] = useLocal<Cumple[]>('fp_demo_cumple', [])
  const [f, setF] = useState({ nombre: '', fecha: '' })
  function add() {
    if (!f.nombre || !f.fecha) return
    setLista([...lista, { id: Date.now(), nombre: f.nombre, fecha: f.fecha.slice(5) }]) // guarda MM-DD
    setF({ nombre: '', fecha: '' })
  }
  const orden = [...lista].sort((a, b) => diasHasta(a.fecha) - diasHasta(b.fecha))
  const MESES = ['', 'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return (
    <div className="space-y-5">
      <Card>
        <h2 className="text-base font-semibold text-slate-800 mb-1">Calendario de cumpleaños</h2>
        <p className="text-xs text-slate-500 mb-4">Registra los cumpleaños del equipo; se ordenan por proximidad.</p>
        <div className="flex flex-wrap gap-3">
          <input className={inp} placeholder="Nombre" value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} />
          <input className={inp} type="date" value={f.fecha} onChange={e => setF({ ...f, fecha: e.target.value })} />
          <button onClick={add} className={btnP}><Plus size={15} />Agregar</button>
        </div>
      </Card>
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-5 border-b border-slate-100"><h3 className="text-base font-semibold text-slate-800">Próximos cumpleaños</h3></div>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="text-xs text-slate-500 border-b border-slate-100">{['Nombre', 'Fecha', 'Faltan', ''].map(h => <th key={h} className="text-left py-3 px-4 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {orden.map(c => {
              const [mm, dd] = c.fecha.split('-')
              const d = diasHasta(c.fecha)
              return (
                <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="py-2.5 px-4 text-slate-700 flex items-center gap-2"><Cake size={14} className="text-pink-500" />{c.nombre}</td>
                  <td className="py-2.5 px-4 text-slate-600">{Number(dd)} {MESES[Number(mm)]}</td>
                  <td className="py-2.5 px-4">{d === 0 ? <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-semibold">¡Hoy! 🎉</span> : <span className="text-slate-500">{d} día{d !== 1 ? 's' : ''}</span>}</td>
                  <td className="py-2.5 px-4"><button onClick={() => setLista(lista.filter(x => x.id !== c.id))} className="text-slate-400 hover:text-red-500 p-1"><Trash2 size={14} /></button></td>
                </tr>
              )
            })}
            {orden.length === 0 && <Vacio t="Sin cumpleaños registrados." />}
          </tbody>
        </table></div>
      </div>
    </div>
  )
}

// ════════════════════════════════ VACACIONES ════════════════════════════════
interface Vac { id: number; funcionario: string; desde: string; hasta: string; motivo: string; estado: 'Pendiente' | 'Aprobada' }
function diasEntre(a: string, b: string): number {
  if (!a || !b) return 0
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000) + 1)
}
function Vacaciones() {
  const [lista, setLista] = useLocal<Vac[]>('fp_demo_vacaciones', [])
  const [f, setF] = useState({ funcionario: '', desde: '', hasta: '', motivo: '' })
  function add() {
    if (!f.funcionario || !f.desde || !f.hasta) return
    setLista([{ id: Date.now(), ...f, estado: 'Pendiente' }, ...lista])
    setF({ funcionario: '', desde: '', hasta: '', motivo: '' })
  }
  return (
    <div className="space-y-5">
      <Card>
        <h2 className="text-base font-semibold text-slate-800 mb-1">Toma de vacaciones</h2>
        <p className="text-xs text-slate-500 mb-4">Solicita y aprueba períodos de vacaciones.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <input className={inp} placeholder="Funcionario" value={f.funcionario} onChange={e => setF({ ...f, funcionario: e.target.value })} />
          <div><label className="block text-xs text-slate-400 mb-1">Desde</label><input className={inp + ' w-full'} type="date" value={f.desde} onChange={e => setF({ ...f, desde: e.target.value })} /></div>
          <div><label className="block text-xs text-slate-400 mb-1">Hasta</label><input className={inp + ' w-full'} type="date" value={f.hasta} onChange={e => setF({ ...f, hasta: e.target.value })} /></div>
          <input className={inp} placeholder="Motivo (opcional)" value={f.motivo} onChange={e => setF({ ...f, motivo: e.target.value })} />
        </div>
        <button onClick={add} className={`${btnP} mt-4`}><Plus size={15} />Solicitar ({diasEntre(f.desde, f.hasta)} días)</button>
      </Card>
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-5 border-b border-slate-100"><h3 className="text-base font-semibold text-slate-800">Solicitudes</h3></div>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="text-xs text-slate-500 border-b border-slate-100">{['Funcionario', 'Desde', 'Hasta', 'Días', 'Motivo', 'Estado', ''].map(h => <th key={h} className="text-left py-3 px-4 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {lista.map(v => (
              <tr key={v.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                <td className="py-2.5 px-4 text-slate-700 flex items-center gap-2"><Plane size={14} className="text-sky-500" />{v.funcionario}</td>
                <td className="py-2.5 px-4 text-xs text-slate-500">{v.desde}</td>
                <td className="py-2.5 px-4 text-xs text-slate-500">{v.hasta}</td>
                <td className="py-2.5 px-4">{diasEntre(v.desde, v.hasta)}</td>
                <td className="py-2.5 px-4 text-slate-600">{v.motivo || '—'}</td>
                <td className="py-2.5 px-4">{v.estado === 'Aprobada' ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Aprobada</span> : <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Pendiente</span>}</td>
                <td className="py-2.5 px-4 flex gap-1">
                  {v.estado === 'Pendiente' && <button onClick={() => setLista(lista.map(x => x.id === v.id ? { ...x, estado: 'Aprobada' } : x))} className="text-green-600 hover:text-green-800 p-1" title="Aprobar"><CheckCircle2 size={15} /></button>}
                  <button onClick={() => setLista(lista.filter(x => x.id !== v.id))} className="text-slate-400 hover:text-red-500 p-1"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
            {lista.length === 0 && <Vacio t="Sin solicitudes de vacaciones." />}
          </tbody>
        </table></div>
      </div>
    </div>
  )
}

// ════════════════════════════ CALENDARIO DE HITOS ═══════════════════════════
interface Hito { id: number; fecha: string; titulo: string; tipo: 'Hito' | 'Actividad' | 'Reunión' }
const SEMILLA_HITOS: Hito[] = [
  { id: 1, fecha: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-20`, titulo: 'Declaración F29 (retenciones)', tipo: 'Hito' },
]
function Hitos() {
  const [lista, setLista] = useLocal<Hito[]>('fp_demo_hitos', SEMILLA_HITOS)
  const [f, setF] = useState<{ fecha: string; titulo: string; tipo: Hito['tipo'] }>({ fecha: '', titulo: '', tipo: 'Actividad' })
  function add() {
    if (!f.fecha || !f.titulo) return
    setLista([...lista, { id: Date.now(), ...f }])
    setF({ fecha: '', titulo: '', tipo: 'Actividad' })
  }
  const orden = [...lista].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const color: Record<Hito['tipo'], string> = { Hito: 'bg-indigo-100 text-indigo-700', Actividad: 'bg-emerald-100 text-emerald-700', 'Reunión': 'bg-amber-100 text-amber-700' }
  return (
    <div className="space-y-5">
      <Card>
        <h2 className="text-base font-semibold text-slate-800 mb-1">Calendario de hitos y actividades</h2>
        <p className="text-xs text-slate-500 mb-4">Agenda hitos de cumplimiento, actividades y reuniones del partido.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><label className="block text-xs text-slate-400 mb-1">Fecha</label><input className={inp + ' w-full'} type="date" value={f.fecha} onChange={e => setF({ ...f, fecha: e.target.value })} /></div>
          <input className={inp + ' md:col-span-2'} placeholder="Título" value={f.titulo} onChange={e => setF({ ...f, titulo: e.target.value })} />
          <select className={inp} value={f.tipo} onChange={e => setF({ ...f, tipo: e.target.value as Hito['tipo'] })}>
            <option>Actividad</option><option>Hito</option><option>Reunión</option>
          </select>
        </div>
        <button onClick={add} className={`${btnP} mt-4`}><Plus size={15} />Agregar al calendario</button>
      </Card>
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-5 border-b border-slate-100"><h3 className="text-base font-semibold text-slate-800">Próximos eventos</h3></div>
        <div className="p-3 space-y-2">
          {orden.map(h => {
            const pasado = h.fecha < hoyISO()
            return (
              <div key={h.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${pasado ? 'opacity-50' : ''} hover:bg-slate-50`}>
                <CalendarDays size={16} className="text-slate-400 shrink-0" />
                <div className="w-24 text-xs text-slate-500">{h.fecha}</div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${color[h.tipo]}`}>{h.tipo}</span>
                <div className="flex-1 text-sm text-slate-700">{h.titulo}</div>
                <button onClick={() => setLista(lista.filter(x => x.id !== h.id))} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={14} /></button>
              </div>
            )
          })}
          {orden.length === 0 && <p className="py-7 text-center text-slate-400 text-sm">Sin eventos en el calendario.</p>}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════ INFORMES ══════════════════════════════════
function Informes() {
  const marcas = JSON.parse(localStorage.getItem('fp_demo_asistencia') || '[]') as Marca[]
  const boletas = JSON.parse(localStorage.getItem('fp_demo_boletas') || '[]') as Boleta[]
  const vac = JSON.parse(localStorage.getItem('fp_demo_vacaciones') || '[]') as Vac[]
  const cumples = JSON.parse(localStorage.getItem('fp_demo_cumple') || '[]') as Cumple[]
  const mes = hoyISO().slice(0, 7)
  const diasMes = marcas.filter(m => m.fecha.startsWith(mes) && m.ingreso).length
  const vig = boletas.filter(b => !b.anulada)
  const vacPend = vac.filter(v => v.estado === 'Pendiente').length
  const proxCumple = [...cumples].sort((a, b) => diasHasta(a.fecha) - diasHasta(b.fecha))[0]

  const kpis = [
    { l: 'Días asistidos (mes)', v: String(diasMes) },
    { l: 'Boletas vigentes', v: String(vig.length) },
    { l: 'Monto boletas vigentes', v: fmt(vig.reduce((s, b) => s + b.monto, 0)) },
    { l: 'Vacaciones pendientes', v: String(vacPend) },
    { l: 'Próximo cumpleaños', v: proxCumple ? `${proxCumple.nombre} (${diasHasta(proxCumple.fecha)}d)` : '—' },
    { l: 'Boletas anuladas', v: String(boletas.length - vig.length) },
  ]
  return (
    <div className="space-y-5">
      <Card>
        <h2 className="text-base font-semibold text-slate-800 mb-1">Informe consolidado</h2>
        <p className="text-xs text-slate-500">Resumen en tiempo real de asistencia, boletas, vacaciones y cumpleaños de este navegador.</p>
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {kpis.map((k, i) => (
          <Card key={i}><p className="text-xs text-slate-500">{k.l}</p><p className="text-lg font-semibold text-slate-800">{k.v}</p></Card>
        ))}
      </div>
    </div>
  )
}

// ════════════════════════════════ HUB ═══════════════════════════════════════
type Sub = 'ficha' | 'asistencia' | 'boletas' | 'informes' | 'cumple' | 'vacaciones' | 'hitos'

export default function HubIntranetDemo({ rol }: { rol: Rol }) {
  const [sub, setSub] = useState<Sub>('ficha')
  const TABS: { id: Sub; label: string; icon: React.ReactNode }[] = [
    { id: 'ficha', label: 'Personas', icon: <Users size={15} /> },
    { id: 'asistencia', label: 'Asistencia', icon: <Clock size={15} /> },
    { id: 'boletas', label: 'Boletas', icon: <FileText size={15} /> },
    { id: 'informes', label: 'Informes', icon: <BarChart3 size={15} /> },
    { id: 'cumple', label: 'Cumpleaños', icon: <Cake size={15} /> },
    { id: 'vacaciones', label: 'Vacaciones', icon: <Plane size={15} /> },
    { id: 'hitos', label: 'Calendario', icon: <CalendarDays size={15} /> },
  ]
  return (
    <div className="space-y-5">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 flex items-start gap-3">
        <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">
          <strong>Modo demostración (sin servidor).</strong> Los datos se guardan solo en este navegador y no se
          sincronizan ni resguardan. Para una intranet multiusuario segura (auth, base de datos, auditoría),
          se activa la versión con backend definiendo <code className="bg-amber-100 px-1 rounded">VITE_API_URL</code>.
        </p>
      </div>
      <div className="flex flex-wrap gap-1 bg-white rounded-xl p-1 shadow-sm w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setSub(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${sub === t.id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>
      {sub === 'ficha' && <ModuloEmpleados rol={rol} />}
      {sub === 'asistencia' && <Asistencia />}
      {sub === 'boletas' && <Boletas />}
      {sub === 'informes' && <Informes />}
      {sub === 'cumple' && <Cumpleanos />}
      {sub === 'vacaciones' && <Vacaciones />}
      {sub === 'hitos' && <Hitos />}
    </div>
  )
}
