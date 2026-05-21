import { useState, type ReactNode, type FormEvent } from 'react'
import {
  BarChart2, Heart, Users, Receipt, Building2, PieChart,
  Gift, Calculator, TrendingUp, Shield, Package,
  AlertTriangle, CheckCircle, UserX, DollarSign,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, RadialBarChart, RadialBar, Cell,
} from 'recharts'

import ModuloEgresos from './components/ModuloEgresos'
import ModuloConciliacion from './components/ModuloConciliacion'
import ModuloEjecucion from './components/ModuloEjecucion'
import ModuloDonaciones from './components/ModuloDonaciones'
import ModuloRetenciones from './components/ModuloRetenciones'
import ModuloFlujoCaja from './components/ModuloFlujoCaja'
import ModuloConflictos from './components/ModuloConflictos'
import ModuloActivos from './components/ModuloActivos'
import { fmt, APORTE_ESTATAL_ANUAL } from './utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab =
  | 'presupuesto' | 'genero' | 'personal'
  | 'egresos' | 'conciliacion' | 'ejecucion'
  | 'donaciones' | 'retenciones' | 'flujo'
  | 'conflictos' | 'activos'

interface NavItem { id: Tab; label: string; icon: ReactNode; group: string }

const NAV: NavItem[] = [
  { id: 'presupuesto',  label: 'Presupuesto',         icon: <BarChart2 size={18} />,   group: 'Ingresos' },
  { id: 'donaciones',   label: 'Donaciones',           icon: <Gift size={18} />,        group: 'Ingresos' },
  { id: 'genero',       label: 'Fondo Género',         icon: <Heart size={18} />,       group: 'Ingresos' },
  { id: 'egresos',      label: 'Libro de Egresos',     icon: <Receipt size={18} />,     group: 'Egresos' },
  { id: 'retenciones',  label: 'Retenciones',          icon: <Calculator size={18} />,  group: 'Egresos' },
  { id: 'personal',     label: 'Nómina',               icon: <Users size={18} />,       group: 'Personal' },
  { id: 'conflictos',   label: 'Conflictos de Interés',icon: <Shield size={18} />,      group: 'Personal' },
  { id: 'conciliacion', label: 'Conciliación Bancaria',icon: <Building2 size={18} />,   group: 'Control' },
  { id: 'ejecucion',    label: 'Ejecución Ppto.',      icon: <PieChart size={18} />,    group: 'Control' },
  { id: 'flujo',        label: 'Flujo de Caja',        icon: <TrendingUp size={18} />,  group: 'Control' },
  { id: 'activos',      label: 'Activos Fijos',        icon: <Package size={18} />,     group: 'Control' },
]

const GROUPS = ['Ingresos', 'Egresos', 'Personal', 'Control']

// ─── Mock data (módulos inline) ───────────────────────────────────────────────

const presupuestoData = [
  { mes: 'Ene', estatal: 18_500_000, cotizaciones: 4_200_000 },
  { mes: 'Feb', estatal: 18_500_000, cotizaciones: 4_350_000 },
  { mes: 'Mar', estatal: 18_500_000, cotizaciones: 4_100_000 },
  { mes: 'Abr', estatal: 18_500_000, cotizaciones: 4_600_000 },
  { mes: 'May', estatal: 18_500_000, cotizaciones: 4_800_000 },
]

const CUOTA_GENERO = APORTE_ESTATAL_ANUAL * 0.10
const GASTO_GENERO = 17_500_000
const pctGenero = Math.round((GASTO_GENERO / CUOTA_GENERO) * 100)
const generoOk = pctGenero >= 100
const generoAlerta = pctGenero >= 75 && pctGenero < 100
const PRESUPUESTO_SUELDOS = 8_500_000

const parentescos: Record<string, { directivo: string; grado: string }> = {
  '11111111-1': { directivo: 'Ana Pérez', grado: 'Cónyuge' },
}

interface Funcionario { nombre: string; rut: string; calidad: string; sueldo: string; banco: string; tipoCuenta: string; numeroCuenta: string; area: string; imputableGenero: boolean; activo: boolean }
const FUNCIONARIOS_INIT: Funcionario[] = [
  { nombre: 'María González', rut: '22222222-2', calidad: 'Código del Trabajo - Indefinido', sueldo: '1800000', banco: 'Banco Estado', tipoCuenta: 'Corriente', numeroCuenta: '0001234567', area: 'Formación Ciudadana', imputableGenero: true, activo: true },
  { nombre: 'Pedro Soto', rut: '33333333-3', calidad: 'Honorarios Permanente', sueldo: '1200000', banco: 'Banco Chile', tipoCuenta: 'Vista', numeroCuenta: '0009876543', area: 'Comunicaciones', imputableGenero: false, activo: true },
]

// ─── Inline sub-components ────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm flex items-start gap-4">
      <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">{icon}</div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-xl font-semibold text-slate-800">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function ModuloPresupuesto() {
  const totalEstatal = presupuestoData.reduce((s, d) => s + d.estatal, 0)
  const totalCotiz = presupuestoData.reduce((s, d) => s + d.cotizaciones, 0)
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={<DollarSign size={20} />} label="Total ingresos YTD" value={fmt(totalEstatal + totalCotiz)} />
        <StatCard icon={<DollarSign size={20} />} label="Aportes estatales" value={fmt(totalEstatal)} sub="Ley 20.900" />
        <StatCard icon={<DollarSign size={20} />} label="Cotizaciones internas" value={fmt(totalCotiz)} sub="Militantes activos" />
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Ingresos Mensuales — Estatal vs Cotizaciones</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={presupuestoData} margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={v => `$${(v / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number) => fmt(v)} />
            <Legend />
            <Bar dataKey="estatal" name="Estatal" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="cotizaciones" name="Cotizaciones" fill="#22d3ee" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function AlertaGenero() {
  const color = generoOk ? '#22c55e' : generoAlerta ? '#f59e0b' : '#ef4444'
  const radialData = [{ value: Math.min(pctGenero, 100) }]
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Alerta Fondo de Género — Ley 20.900</h2>
          <p className="text-xs text-slate-500">Cuota legal: {fmt(CUOTA_GENERO)} (10% del aporte estatal anual de {fmt(APORTE_ESTATAL_ANUAL)})</p>
        </div>
        <div className="flex items-center gap-8">
          <div className="relative w-36 h-36 flex items-center justify-center flex-shrink-0">
            <RadialBarChart width={144} height={144} innerRadius={50} outerRadius={68} data={radialData} startAngle={90} endAngle={-270}>
              <RadialBar dataKey="value" cornerRadius={8} background={{ fill: '#f1f5f9' }}>
                <Cell fill={color} />
              </RadialBar>
            </RadialBarChart>
            <span className="absolute text-2xl font-bold" style={{ color }}>{pctGenero}%</span>
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Ejecutado</span>
              <span className="font-medium text-slate-700">{fmt(GASTO_GENERO)}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3">
              <div className="h-3 rounded-full transition-all" style={{ width: `${Math.min(pctGenero, 100)}%`, background: color }} />
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>$0</span><span>{fmt(CUOTA_GENERO)}</span>
            </div>
            {!generoOk && (
              <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium"
                style={{ background: generoAlerta ? '#fef3c7' : '#fee2e2', color: generoAlerta ? '#92400e' : '#991b1b' }}>
                <AlertTriangle size={16} />
                {generoAlerta ? 'ADVERTENCIA: Gasto de Género bajo el 75% de la cuota legal.' : 'ALERTA CRÍTICA: Gasto insuficiente. El balance anual será rechazado.'}
              </div>
            )}
            {generoOk && (
              <div className="flex items-center gap-2 bg-green-50 text-green-800 rounded-xl px-4 py-3 text-sm font-medium">
                <CheckCircle size={16} />Cuota de género cumplida.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const emptyForm = () => ({ nombre: '', rut: '', calidad: 'Código del Trabajo - Indefinido', sueldo: '', banco: '', tipoCuenta: 'Corriente', numeroCuenta: '', area: 'Administración', imputableGenero: false })

function ModuloPersonal() {
  const [form, setForm] = useState(emptyForm())
  const [submitted, setSubmitted] = useState(false)
  const [blocked, setBlocked] = useState<string | null>(null)
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>(FUNCIONARIOS_INIT)
  const sueldoTotal = funcionarios.filter(f => f.activo).reduce((s, f) => s + parseInt(f.sueldo || '0'), 0)
  const pctSueldo = Math.round((sueldoTotal / PRESUPUESTO_SUELDOS) * 100)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const p = parentescos[form.rut]
    if (p) { setBlocked(`CONTRATACIÓN RECHAZADA: Infracción al Art. 39 bis de la Ley 18.603. El RUT ${form.rut} es ${p.grado} de ${p.directivo}, miembro de la Directiva Central.`); return }
    setBlocked(null); setFuncionarios(prev => [...prev, { ...form, activo: true }]); setForm(emptyForm()); setSubmitted(true); setTimeout(() => setSubmitted(false), 3000)
  }

  type K = keyof ReturnType<typeof emptyForm>
  const inp = (k: K, t = 'text', ph = '') => <input type={t} placeholder={ph} value={form[k] as string} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
  const sel = (k: K, opts: string[]) => <select value={form[k] as string} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">{opts.map(o => <option key={o}>{o}</option>)}</select>
  const field = (label: string, node: ReactNode) => <div className="flex flex-col gap-1"><label className="text-xs font-medium text-slate-600">{label}</label>{node}</div>

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Módulo de Nómina y Personal</h2>
          <p className="text-xs text-slate-500">Validación antinepotismo automática — Art. 39 bis Ley 18.603</p>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-slate-600">Presupuesto mensual de sueldos</span>
            <span className={`font-semibold ${pctSueldo > 90 ? 'text-red-600' : 'text-slate-700'}`}>{fmt(sueldoTotal)} / {fmt(PRESUPUESTO_SUELDOS)} ({pctSueldo}%)</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3">
            <div className="h-3 rounded-full" style={{ width: `${Math.min(pctSueldo, 100)}%`, background: pctSueldo > 90 ? '#ef4444' : pctSueldo > 70 ? '#f59e0b' : '#6366f1' }} />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5"><Users size={15} /> Nómina activa ({funcionarios.filter(f => f.activo).length})</h3>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-slate-500 border-b border-slate-100">{['Nombre', 'Calidad', 'Área', 'Sueldo bruto', 'Género'].map(h => <th key={h} className="text-left py-2 pr-4 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {funcionarios.filter(f => f.activo).map((f, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0">
                  <td className="py-2 pr-4 font-medium text-slate-800">{f.nombre}</td>
                  <td className="py-2 pr-4 text-slate-500">{f.calidad.split(' - ')[0]}</td>
                  <td className="py-2 pr-4 text-slate-500">{f.area}</td>
                  <td className="py-2 text-right pr-4 text-slate-700">{fmt(parseInt(f.sueldo))}</td>
                  <td className="py-2">{f.imputableGenero ? <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Fondo Género</span> : <span className="text-slate-300">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Agregar funcionario</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
            {field('Nombre completo', inp('nombre', 'text', 'Ej: Juan Pérez'))}
            {field('RUT', inp('rut', 'text', '12345678-9'))}
            {field('Calidad contractual', sel('calidad', ['Código del Trabajo - Indefinido', 'Código del Trabajo - Plazo Fijo', 'Honorarios Permanente', 'Honorarios por Proyecto']))}
            {field('Área de desempeño', sel('area', ['Administración', 'Formación Ciudadana', 'Investigación', 'Comunicaciones']))}
            {field('Sueldo bruto (CLP)', inp('sueldo', 'number', '1500000'))}
            {field('Banco', inp('banco', 'text', 'Banco Estado'))}
            {field('Tipo de cuenta', sel('tipoCuenta', ['Corriente', 'Vista', 'Ahorro']))}
            {field('Número de cuenta', inp('numeroCuenta', 'text', '0001234567'))}
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="genero" checked={form.imputableGenero} onChange={e => setForm(f => ({ ...f, imputableGenero: e.target.checked }))} className="w-4 h-4 rounded" />
              <label htmlFor="genero" className="text-sm text-slate-600">Imputable al Fondo de Género (Ley 20.900)</label>
            </div>
            {blocked && <div className="col-span-2 flex items-start gap-2 bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm font-medium"><UserX size={16} className="mt-0.5 shrink-0" />{blocked}</div>}
            {submitted && <div className="col-span-2 flex items-center gap-2 bg-green-50 text-green-800 rounded-xl px-4 py-3 text-sm font-medium"><CheckCircle size={16} />Funcionario agregado correctamente.</div>}
            <div className="col-span-2"><button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl py-2.5 text-sm transition-colors">Registrar funcionario</button></div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ active, onSelect }: { active: Tab; onSelect: (t: Tab) => void }) {
  return (
    <aside className="fixed top-0 left-0 h-full w-56 bg-white border-r border-slate-200 flex flex-col z-20 overflow-y-auto">
      <div className="px-4 py-5 border-b border-slate-100">
        <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">FinParty</p>
        <p className="text-xs text-slate-400 mt-0.5">Control Financiero · SERVEL</p>
      </div>
      <nav className="flex-1 py-3 px-2">
        {GROUPS.map(group => (
          <div key={group} className="mb-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-3 mb-1">{group}</p>
            {NAV.filter(n => n.group === group).map(n => (
              <button
                key={n.id}
                onClick={() => onSelect(n.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors mb-0.5 text-left ${
                  active === n.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <span className={active === n.id ? 'text-indigo-600' : 'text-slate-400'}>{n.icon}</span>
                {n.label}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-slate-100">
        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">Q2 2026</span>
      </div>
    </aside>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

const TITLES: Record<Tab, string> = {
  presupuesto: 'Módulo Presupuestario',
  genero: 'Fondo de Género — Ley 20.900',
  personal: 'Nómina y Personal',
  egresos: 'Libro de Egresos',
  conciliacion: 'Conciliación Bancaria',
  ejecucion: 'Ejecución Presupuestaria',
  donaciones: 'Control de Donaciones — Ley 19.884',
  retenciones: 'Retenciones de Honorarios',
  flujo: 'Flujo de Caja Proyectado',
  conflictos: 'Declaraciones de Conflicto de Interés',
  activos: 'Inventario de Activos Fijos',
}

export default function App() {
  const [tab, setTab] = useState<Tab>('presupuesto')

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar active={tab} onSelect={setTab} />
      <div className="ml-56 flex flex-col min-h-screen">
        <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
          <h1 className="text-base font-bold text-slate-800 m-0">{TITLES[tab]}</h1>
          <p className="text-xs text-slate-400 m-0">Control Financiero Partidario · Compliance SERVEL · Ley 18.603 · 19.884 · 20.900</p>
        </header>
        <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
          {tab === 'presupuesto'  && <ModuloPresupuesto />}
          {tab === 'genero'       && <AlertaGenero />}
          {tab === 'personal'     && <ModuloPersonal />}
          {tab === 'egresos'      && <ModuloEgresos />}
          {tab === 'conciliacion' && <ModuloConciliacion />}
          {tab === 'ejecucion'    && <ModuloEjecucion />}
          {tab === 'donaciones'   && <ModuloDonaciones />}
          {tab === 'retenciones'  && <ModuloRetenciones />}
          {tab === 'flujo'        && <ModuloFlujoCaja />}
          {tab === 'conflictos'   && <ModuloConflictos />}
          {tab === 'activos'      && <ModuloActivos />}
        </main>
      </div>
    </div>
  )
}
