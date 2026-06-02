import { useState } from 'react'
import { BarChart2, PieChart, CalendarDays } from 'lucide-react'
import TabBar          from './TabBar'
import ModuloPresupuesto from './ModuloPresupuesto'
import ModuloEjecucion   from './ModuloEjecucion'
import ModuloHistorico   from './ModuloHistorico'

const TABS = [
  { id: 'presupuesto', label: 'Presupuesto',        icon: <BarChart2 size={15} /> },
  { id: 'ejecucion',   label: 'Ejecución Ppto.',    icon: <PieChart size={15} /> },
  { id: 'historico',   label: 'Análisis Histórico', icon: <CalendarDays size={15} /> },
] as const

type Tab = typeof TABS[number]['id']

export default function HubPresupuesto() {
  const [tab, setTab] = useState<Tab>('presupuesto')
  return (
    <div>
      <TabBar tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'presupuesto' && <ModuloPresupuesto />}
      {tab === 'ejecucion'   && <ModuloEjecucion />}
      {tab === 'historico'   && <ModuloHistorico />}
    </div>
  )
}
