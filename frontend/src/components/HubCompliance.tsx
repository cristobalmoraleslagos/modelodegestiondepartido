import { useState } from 'react'
import { ShieldAlert, CalendarCheck } from 'lucide-react'
import TabBar          from './TabBar'
import ModuloAlertas   from './ModuloAlertas'
import ModuloCalendario from './ModuloCalendario'

const TABS = [
  { id: 'alertas',    label: 'Alertas Legales',   icon: <ShieldAlert size={15} /> },
  { id: 'calendario', label: 'Calendario Legal',  icon: <CalendarCheck size={15} /> },
] as const

type Tab = typeof TABS[number]['id']

export default function HubCompliance() {
  const [tab, setTab] = useState<Tab>('alertas')
  return (
    <div>
      <TabBar tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'alertas'    && <ModuloAlertas />}
      {tab === 'calendario' && <ModuloCalendario />}
    </div>
  )
}
