import { useState, type ReactNode } from 'react'
import {
  BarChart2, Wallet, Receipt, Users,
  Building2, Scale, ShieldAlert, ClipboardList, FileDown, KeyRound,
} from 'lucide-react'

import { ConfigProvider }  from './context/ConfigContext'
import HubPresupuesto      from './components/HubPresupuesto'
import HubIngresos         from './components/HubIngresos'
import HubEgresos          from './components/HubEgresos'
import HubPersonal         from './components/HubPersonal'
import HubTesoreria        from './components/HubTesoreria'
import HubContabilidad     from './components/HubContabilidad'
import HubCompliance       from './components/HubCompliance'
import HubRendicion        from './components/HubRendicion'
import HubIntranet         from './components/HubIntranet'
import ModuloCargaDatos    from './components/ModuloCargaDatos'
import LoginPage           from './components/LoginPage'
import { getSesion, logout, type Sesion } from './auth'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'presupuesto' | 'ingresos' | 'egresos' | 'personal'
         | 'tesoreria' | 'contabilidad' | 'compliance' | 'rendicion' | 'intranet' | 'datos'

interface NavItem { id: Tab; label: string; icon: ReactNode; group: string }

const NAV: NavItem[] = [
  { id: 'presupuesto',  label: 'Presupuesto',     icon: <BarChart2 size={18} />,  group: 'Financiero'   },
  { id: 'ingresos',     label: 'Ingresos',         icon: <Wallet size={18} />,     group: 'Financiero'   },
  { id: 'egresos',      label: 'Egresos',          icon: <Receipt size={18} />,    group: 'Financiero'   },
  { id: 'tesoreria',    label: 'Tesorería',        icon: <Building2 size={18} />,  group: 'Financiero'   },
  { id: 'personal',     label: 'Personal',         icon: <Users size={18} />,      group: 'Organización' },
  { id: 'contabilidad', label: 'Contabilidad',     icon: <Scale size={18} />,      group: 'Organización' },
  { id: 'compliance',   label: 'Compliance',       icon: <ShieldAlert size={18} />,group: 'Legal'        },
  { id: 'rendicion',    label: 'Rendición SERVEL', icon: <FileDown size={18} />,   group: 'Legal'        },
  { id: 'intranet',     label: 'Intranet Rendición', icon: <KeyRound size={18} />, group: 'Intranet'     },
  { id: 'datos',        label: 'Carga de Datos',   icon: <ClipboardList size={18} />, group: 'Sistema'   },
]

const GROUPS = ['Financiero', 'Organización', 'Legal', 'Intranet', 'Sistema']

const TITLES: Record<Tab, string> = {
  presupuesto:  'Presupuesto · Ejecución · Análisis Histórico',
  ingresos:     'Ingresos — Fuentes, Donaciones y Fondo Género',
  egresos:      'Egresos — Libro, Retenciones, Préstamos y Aportes',
  personal:     'Personal — Nómina, Conflictos de Interés y Afiliados',
  tesoreria:    'Tesorería — Conciliación Bancaria y Flujo de Caja',
  contabilidad: 'Contabilidad — Activos Fijos y Balance Módulo 15',
  compliance:   'Compliance — Alertas Legales y Calendario',
  rendicion:    'Rendición SERVEL — Exportación de Módulos DS 1174/2016',
  intranet:     'Intranet de Rendición — Carga BHE, Contratos e Informes',
  datos:        'Carga de Datos Reales',
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ active, onSelect }: { active: Tab; onSelect: (t: Tab) => void }) {
  return (
    <aside className="fixed top-0 left-0 h-full w-52 bg-white border-r border-slate-200 flex flex-col z-20 overflow-y-auto">
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
                  active === n.id
                    ? 'bg-indigo-50 text-indigo-700 border-l-[3px] border-indigo-500 pl-[9px] pr-3'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800 px-3'
                } ${n.id === 'rendicion' && active !== 'rendicion'
                    ? 'text-indigo-600 font-semibold'
                    : ''
                }`}
              >
                <span className={active === n.id ? 'text-indigo-600' : n.id === 'rendicion' ? 'text-indigo-500' : 'text-slate-400'}>
                  {n.icon}
                </span>
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

export default function App() {
  const [sesion, setSesion] = useState<Sesion | null>(() => getSesion())
  const [tab, setTab] = useState<Tab>('presupuesto')

  function handleLogin() {
    setSesion(getSesion())
  }

  function handleLogout() {
    logout()
    setSesion(null)
  }

  if (!sesion) return <LoginPage onLogin={handleLogin} />

  return (
    <ConfigProvider>
    <div className="min-h-screen bg-[#FAFAFA]">
      <Sidebar active={tab} onSelect={setTab} />
      <div className="ml-52 flex flex-col min-h-screen">
        <header className="bg-white border-b-[2px] border-indigo-500 px-6 py-4 sticky top-0 z-10 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-800 m-0">{TITLES[tab]}</h1>
            <p className="text-xs text-slate-400 m-0">Control Financiero Partidario · Compliance SERVEL · DFL N°4/2017 · DFL N°3/2017 · Ley 20.900</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-700">{sesion.nombre}</p>
              <p className="text-xs text-slate-400 capitalize">{sesion.rol}{sesion.modo === 'demo' ? ' · demo' : ''}</p>
            </div>
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold select-none">
              {sesion.nombre.split(' ').map(p => p[0]).slice(0, 2).join('')}
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
          {tab === 'presupuesto'  && <HubPresupuesto />}
          {tab === 'ingresos'     && <HubIngresos />}
          {tab === 'egresos'      && <HubEgresos />}
          {tab === 'personal'     && <HubPersonal />}
          {tab === 'tesoreria'    && <HubTesoreria />}
          {tab === 'contabilidad' && <HubContabilidad />}
          {tab === 'compliance'   && <HubCompliance />}
          {tab === 'rendicion'    && <HubRendicion />}
          {tab === 'intranet'     && <HubIntranet rol={sesion.rol} />}
          {tab === 'datos'        && <ModuloCargaDatos />}
        </main>
      </div>
    </div>
    </ConfigProvider>
  )
}
