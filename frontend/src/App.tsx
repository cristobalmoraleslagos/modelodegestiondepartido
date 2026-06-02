import { useState, type ReactNode } from 'react'
import {
  BarChart2, Heart, Users, Receipt, Building2, PieChart,
  Gift, Calculator, TrendingUp, Shield, Package,
  ClipboardList, CalendarDays, Wallet, CreditCard, Vote,
  ShieldAlert, CalendarCheck,
} from 'lucide-react'

// Módulos extraídos
import ModuloPresupuesto  from './components/ModuloPresupuesto'
import AlertaGenero       from './components/AlertaGenero'
import ModuloPersonal     from './components/ModuloPersonal'
import ModuloEgresos      from './components/ModuloEgresos'
import ModuloConciliacion from './components/ModuloConciliacion'
import ModuloEjecucion    from './components/ModuloEjecucion'
import ModuloDonaciones   from './components/ModuloDonaciones'
import ModuloRetenciones  from './components/ModuloRetenciones'
import ModuloFlujoCaja    from './components/ModuloFlujoCaja'
import ModuloConflictos   from './components/ModuloConflictos'
import ModuloActivos      from './components/ModuloActivos'
import ModuloCargaDatos   from './components/ModuloCargaDatos'
import ModuloAfiliados    from './components/ModuloAfiliados'
import ModuloHistorico    from './components/ModuloHistorico'
import ModuloIngresos     from './components/ModuloIngresos'
import ModuloDeuda        from './components/ModuloDeuda'
import ModuloAportes      from './components/ModuloAportes'
import ModuloAlertas      from './components/ModuloAlertas'
import ModuloCalendario   from './components/ModuloCalendario'
import LoginPage          from './components/LoginPage'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab =
  | 'presupuesto' | 'genero' | 'personal'
  | 'egresos' | 'conciliacion' | 'ejecucion'
  | 'donaciones' | 'retenciones' | 'flujo'
  | 'conflictos' | 'activos' | 'afiliados' | 'historico' | 'datos'
  | 'ingresos' | 'deuda' | 'aportes' | 'alertas' | 'calendario'

interface NavItem { id: Tab; label: string; icon: ReactNode; group: string }

const NAV: NavItem[] = [
  { id: 'presupuesto',  label: 'Presupuesto',          icon: <BarChart2 size={18} />,    group: 'Ingresos' },
  { id: 'ingresos',     label: 'Fuentes (Módulo 6)',    icon: <Wallet size={18} />,       group: 'Ingresos' },
  { id: 'donaciones',   label: 'Donaciones',            icon: <Gift size={18} />,         group: 'Ingresos' },
  { id: 'genero',       label: 'Fondo Género',          icon: <Heart size={18} />,        group: 'Ingresos' },
  { id: 'egresos',      label: 'Libro de Egresos',      icon: <Receipt size={18} />,      group: 'Egresos' },
  { id: 'retenciones',  label: 'Retenciones',           icon: <Calculator size={18} />,   group: 'Egresos' },
  { id: 'deuda',        label: 'Préstamos',             icon: <CreditCard size={18} />,   group: 'Egresos' },
  { id: 'aportes',      label: 'Aportes Candidatos',    icon: <Vote size={18} />,         group: 'Egresos' },
  { id: 'personal',     label: 'Nómina',                icon: <Users size={18} />,        group: 'Personal' },
  { id: 'conflictos',   label: 'Conflictos de Interés', icon: <Shield size={18} />,       group: 'Personal' },
  { id: 'afiliados',    label: 'Afiliados',             icon: <Users size={18} />,        group: 'Personal' },
  { id: 'conciliacion', label: 'Conciliación Bancaria', icon: <Building2 size={18} />,    group: 'Control' },
  { id: 'ejecucion',    label: 'Ejecución Ppto.',       icon: <PieChart size={18} />,     group: 'Control' },
  { id: 'flujo',        label: 'Flujo de Caja',         icon: <TrendingUp size={18} />,   group: 'Control' },
  { id: 'activos',      label: 'Activos Fijos',         icon: <Package size={18} />,      group: 'Control' },
  { id: 'historico',    label: 'Análisis Histórico',    icon: <CalendarDays size={18} />, group: 'Control' },
  { id: 'alertas',      label: 'Alertas Legales',       icon: <ShieldAlert size={18} />,  group: 'Compliance' },
  { id: 'calendario',   label: 'Calendario Legal',      icon: <CalendarCheck size={18} />,group: 'Compliance' },
  { id: 'datos',        label: 'Carga de Datos',        icon: <ClipboardList size={18} />,group: 'Sistema' },
]

const GROUPS = ['Ingresos', 'Egresos', 'Personal', 'Control', 'Compliance', 'Sistema']

// ─── Mock data (módulos inline) ───────────────────────────────────────────────

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
                className={`w-full flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-colors mb-0.5 text-left ${
                  active === n.id ? 'bg-indigo-50 text-indigo-700 border-l-[3px] border-amaranto-500 pl-[9px] pr-3' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800 px-3'
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
  ingresos:    'Fuentes de Financiamiento — Módulo 6 SERVEL',
  genero:      'Fondo de Género — Ley 20.900 Art. 38',
  personal:    'Nómina y Personal',
  egresos:     'Libro de Egresos + Validación Documental',
  conciliacion:'Conciliación Bancaria',
  ejecucion:   'Ejecución Presupuestaria',
  donaciones:  'Control de Donaciones — Ley 19.884',
  retenciones: 'Retenciones de Honorarios',
  flujo:       'Flujo de Caja Proyectado',
  conflictos:  'Declaraciones de Conflicto de Interés',
  activos:     'Inventario de Activos Fijos',
  afiliados:   'Afiliados, Sedes y Sanciones SERVEL',
  historico:   'Análisis Histórico Financiero 2017–2026',
  datos:       'Carga de Datos Reales',
  deuda:       'Préstamos y Créditos — Art. 14 Ley 20.900',
  aportes:     'Aportes a Candidatos — Ley 19.884',
  alertas:     'Panel de Alertas Legales — Compliance SERVEL',
  calendario:  'Calendario de Obligaciones Legales 2026',
}

export default function App() {
  // ── Sesión persistente en sessionStorage (sobrevive F5, no sobrevive cierre de pestaña) ─
  const [usuario, setUsuario] = useState<string | null>(() =>
    sessionStorage.getItem('finparty_usuario')
  )
  const [tab, setTab] = useState<Tab>('presupuesto')

  function handleLogin(nombre: string) {
    sessionStorage.setItem('finparty_usuario', nombre)
    setUsuario(nombre)
  }

  function handleLogout() {
    sessionStorage.removeItem('finparty_usuario')
    setUsuario(null)
  }

  // ── Pantalla de login ───────────────────────────────────────────────────────
  if (!usuario) {
    return <LoginPage onLogin={handleLogin} />
  }

  // ── Aplicación principal ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Sidebar active={tab} onSelect={setTab} />
      <div className="ml-56 flex flex-col min-h-screen">
        <header className="bg-white border-b-[2px] border-amaranto-500 px-6 py-4 sticky top-0 z-10 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-800 m-0">{TITLES[tab]}</h1>
            <p className="text-xs text-slate-400 m-0">Control Financiero Partidario · Compliance SERVEL · Ley 18.603 · 19.884 · 20.900</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-700">{usuario}</p>
              <p className="text-xs text-slate-400">Administrador</p>
            </div>
            <div className="w-8 h-8 bg-amaranto-600 rounded-full flex items-center justify-center text-white text-xs font-bold select-none">
              {usuario.split(' ').map(p => p[0]).slice(0, 2).join('')}
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
              title="Cerrar sesión"
            >
              Salir
            </button>
          </div>
        </header>
        <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
          {tab === 'presupuesto'  && <ModuloPresupuesto />}
          {tab === 'ingresos'     && <ModuloIngresos />}
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
          {tab === 'historico'    && <ModuloHistorico />}
          {tab === 'datos'        && <ModuloCargaDatos />}
          {tab === 'deuda'        && <ModuloDeuda />}
          {tab === 'aportes'      && <ModuloAportes />}
          {tab === 'alertas'      && <ModuloAlertas />}
          {tab === 'calendario'   && <ModuloCalendario />}
        </main>
      </div>
    </div>
  )
}
