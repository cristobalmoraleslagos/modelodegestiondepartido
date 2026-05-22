import { useState, type ReactNode, type FormEvent } from 'react'
import {
  BarChart2, Heart, Users, Receipt, Building2, PieChart,
  Gift, Calculator, TrendingUp, Shield, Package,
  AlertTriangle, CheckCircle, UserX, DollarSign, ClipboardList,
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
import ModuloCargaDatos from './components/ModuloCargaDatos'
import ModuloAfiliados from './components/ModuloAfiliados'
import { fmt, APORTE_ESTATAL_ANUAL } from './utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab =
  | 'presupuesto' | 'genero' | 'personal'
  | 'egresos' | 'conciliacion' | 'ejecucion'
  | 'donaciones' | 'retenciones' | 'flujo'
  | 'conflictos' | 'activos' | 'afiliados' | 'datos'

interface NavItem { id: Tab; label: string; icon: ReactNode; group: string }

const NAV: NavItem[] = [
  { id: 'presupuesto',  label: 'Presupuesto',         icon: <BarChart2 size={18} />,   group: 'Ingresos' },
  { id: 'donaciones',   label: 'Donaciones',           icon: <Gift size={18} />,        group: 'Ingresos' },
  { id: 'genero',       label: 'Fondo Género',         icon: <Heart size={18} />,       group: 'Ingresos' },
  { id: 'egresos',      label: 'Libro de Egresos',     icon: <Receipt size={18} />,     group: 'Egresos' },
  { id: 'retenciones',  label: 'Retenciones',          icon: <Calculator size={18} />,  group: 'Egresos' },
  { id: 'personal',     label: 'Nómina',               icon: <Users size={18} />,       group: 'Personal' },
  { id: 'conflictos',   label: 'Conflictos de Interés',icon: <Shield size={18} />,      group: 'Personal' },
  { id: 'afiliados',   label: 'Afiliados',            icon: <Users size={18} />,       group: 'Personal' },
  { id: 'conciliacion', label: 'Conciliación Bancaria',icon: <Building2 size={18} />,   group: 'Control' },
  { id: 'ejecucion',    label: 'Ejecución Ppto.',      icon: <PieChart size={18} />,    group: 'Control' },
  { id: 'flujo',        label: 'Flujo de Caja',        icon: <TrendingUp size={18} />,  group: 'Control' },
  { id: 'activos',      label: 'Activos Fijos',        icon: <Package size={18} />,     group: 'Control' },
  { id: 'datos',        label: 'Carga de Datos',       icon: <ClipboardList size={18} />, group: 'Sistema' },
]

const GROUPS = ['Ingresos', 'Egresos', 'Personal', 'Control', 'Sistema']

// ─── Mock data (módulos inline) ───────────────────────────────────────────────

// ─── Datos reales SERVEL — Gastos totales mensuales 2025 ─────────────────────
// Fuente: portaltransparencia.cl PP007 — Módulo 12 Gastos Q4 2025 (reporte anual 2025)
// "estatal" = gasto operacional declarado; "cotizaciones" = actividades género + juvenil.
//
// INGRESOS REALES 2026 Q1 (Módulo 11 SERVEL PP007):
//   Ene: $107.3M (cuotas $11M + patrimonio $28.4M + cheque caja $67.9M)
//   Feb: $176.4M (cuotas $7.6M + patrimonio $8.5M + aporte estatal $134.4M + transf. $26M)
//   Mar:  $32.5M (cuotas $14.1M + patrimonio $18.4M)
//   Q1 TOTAL: $316.2M
//
// CONTRATACIONES REALES 2026 Q1 (Módulo 15 Nómina SERVEL PP007):
//   L.Carmona: $5.99M | J.Lagos: $2.97M | K.Corvalán: $3.08M
//   Radio Nuevo Mundo: $5M | D.Trujillo: $4.28M
//
// PERSONAS Y CARGOS 2026 Q1 (Módulo 05 SERVEL PP007):
//   Presidente: Lautaro Carmona Soto | Sec.Gral: Bárbara Figueroa Sandoval
//   Administradora Fondos: Pamela Águila Cariz
const presupuestoData = [
  { mes: 'Ene', estatal: 56_633_189 + 58_462_232 + 11_781_754, cotizaciones: 1_201_730 + 1_700_000 },
  { mes: 'Feb', estatal: 48_555_132 + 25_631_239 +  5_871_778, cotizaciones: 2_403_466 + 2_300_008 },
  { mes: 'Mar', estatal: 34_947_637 + 27_524_310 + 25_183_082, cotizaciones: 1_201_733 + 1_700_006 },
  { mes: 'Abr', estatal: 28_913_965 +  3_990_144 + 18_558_390, cotizaciones: 0 },
  { mes: 'May', estatal: 37_429_775 + 22_411_641 +  7_795_405, cotizaciones: 0 },
  { mes: 'Jun', estatal: 36_694_774 + 27_186_310 +  7_577_170, cotizaciones: 1_530_535 + 1_700_006 },
  { mes: 'Jul', estatal: 44_633_427 + 45_953_490 +  9_527_218, cotizaciones: 0 },
  { mes: 'Ago', estatal: 21_011_213 + 11_024_206 +  4_583_270, cotizaciones: 0 },
  { mes: 'Sep', estatal: 28_752_855 + 22_551_473 + 22_055_237, cotizaciones: 0 },
  { mes: 'Oct', estatal: 59_551_077 +  9_336_895 + 48_831_977, cotizaciones: 0 },
  { mes: 'Nov', estatal: 42_770_701 +  5_641_443 +  2_767_166, cotizaciones: 0 },
  { mes: 'Dic', estatal: 18_656_152 +  6_737_738 +  6_249_689, cotizaciones: 0 },
]

// Cuota legal 10% del aporte estatal (Ley 20.900 Art. 33)
// Con aporte estimado 2025 = $1.200M → cuota = $120M
const CUOTA_GENERO = APORTE_ESTATAL_ANUAL * 0.10
// Gasto real Fomento Participación Femenina:
//   2022 (balance): $19.176.625 de $124M cuota → 15.5% — INCUMPLIMIENTO
//   2024 (SERVEL CSV): $37.205.715 → 31% de cuota
//   2025 (SERVEL CSV): $6.337.464 → 5.3% de cuota — ALERTA CRÍTICA
const GASTO_GENERO = 6_337_464  // año 2025 — actualizar con datos 2026 cuando disponibles
const pctGenero = Math.round((GASTO_GENERO / CUOTA_GENERO) * 100)
const generoOk = pctGenero >= 100
const generoAlerta = pctGenero >= 75 && pctGenero < 100
// Gasto de personal mensual real Q1 2026 (SERVEL): Ene=25.9M · Feb=53.1M · Mar=56.7M
// Promedio: $45.3M/mes. Presupuesto anual estimado: $480M → mensual ≈ $40M
const PRESUPUESTO_SUELDOS = 40_000_000

// ─── Parentescos para chequeo antinepotismo ──────────────────────────────────
// Fuente: declaraciones de interés y patrimonio (Módulo 08 SERVEL) + nómina PP007
// Registrar aquí los RUTs de parientes de directivos que presten servicios al partido.
// IMPORTANTE: Solo incluir relaciones verificadas — datos sensibles sujetos a Ley 21.719.
// Para agregar: { 'RUT-sin-puntos': { directivo: 'Nombre', grado: 'Cónyuge|Hijo|etc.' } }
const parentescos: Record<string, { directivo: string; grado: string }> = {
  // Ejemplo: '12345678-9': { directivo: 'Bárbara Figueroa', grado: 'Cónyuge' },
  // Completar con datos verificados de declaraciones de interés vigentes
}

interface Funcionario { nombre: string; rut: string; calidad: string; sueldo: string; banco: string; tipoCuenta: string; numeroCuenta: string; area: string; imputableGenero: boolean; activo: boolean }
// ─── Nómina de personal — Fuente: Nómina SERVEL PP007 Q1 2026 ────────────────
// NOTA: Los valores de sueldo son los montos declarados en nómina SERVEL (honorarios >20 UTM).
// Los datos bancarios deben completarse con cartola real (solo se conoce nombre y RUT de SERVEL).
// Los contratistas recurrentes del Q1 2026 son los siguientes:
const FUNCIONARIOS_INIT: Funcionario[] = [
  { nombre: 'Lautaro Carmona Soto',      rut: '5892999-9',   calidad: 'Honorarios Permanente', sueldo: '2245875', banco: 'Banco Estado', tipoCuenta: 'Corriente', numeroCuenta: '—', area: 'Dirección General', imputableGenero: false, activo: true },
  { nombre: 'Juan Andrés Lagos Espinoza', rut: '5926570-9',   calidad: 'Honorarios Permanente', sueldo: '1487363', banco: 'Banco Estado', tipoCuenta: 'Corriente', numeroCuenta: '—', area: 'Dirección General', imputableGenero: false, activo: true },
  { nombre: 'Krupskaya Corvalán',         rut: '13713819-0',  calidad: 'Honorarios Permanente', sueldo: '1541602', banco: 'Banco Chile',  tipoCuenta: 'Corriente', numeroCuenta: '—', area: 'Secretaría',       imputableGenero: true,  activo: true },
  { nombre: 'Pamela Águila Cariz',        rut: '—',           calidad: 'Código del Trabajo - Indefinido', sueldo: '0', banco: '—', tipoCuenta: '—', numeroCuenta: '—', area: 'Administración y Finanzas', imputableGenero: true, activo: true },
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
        <StatCard icon={<DollarSign size={20} />} label="Gasto total 2025 (SERVEL)" value={fmt(totalEstatal + totalCotiz)} sub="Personal + Bienes + Admin + Actividades" />
        <StatCard icon={<DollarSign size={20} />} label="Gasto operacional 2025" value={fmt(totalEstatal)} sub="Fuente: CSV SERVEL 2025-4" />
        <StatCard icon={<DollarSign size={20} />} label="Actividades Género + Juvenil" value={fmt(totalCotiz)} sub="Fomento Participación Femenina/Juvenil" />
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Gastos Mensuales 2025 — Operacional vs Actividades (Fuente: SERVEL)</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={presupuestoData} margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={v => `$${(v / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => fmt(Number(v))} />
            <Legend />
            <Bar dataKey="estatal" name="Operacional (Personal+Bienes+Admin)" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="cotizaciones" name="Actividades Género+Juvenil" fill="#22d3ee" radius={[4, 4, 0, 0]} />
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
  afiliados: 'Afiliados, Sedes y Sanciones SERVEL',
  datos: 'Carga de Datos Reales',
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
          {tab === 'afiliados'    && <ModuloAfiliados />}
          {tab === 'datos'        && <ModuloCargaDatos />}
        </main>
      </div>
    </div>
  )
}
