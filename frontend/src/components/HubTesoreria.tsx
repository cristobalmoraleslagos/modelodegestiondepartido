import { useState } from 'react'
import { Building2, TrendingUp } from 'lucide-react'
import TabBar            from './TabBar'
import ModuloConciliacion from './ModuloConciliacion'
import ModuloFlujoCaja   from './ModuloFlujoCaja'

const TABS = [
  { id: 'conciliacion', label: 'Conciliación Bancaria', icon: <Building2 size={15} /> },
  { id: 'flujo',        label: 'Flujo de Caja',         icon: <TrendingUp size={15} /> },
] as const

type Tab = typeof TABS[number]['id']

export default function HubTesoreria() {
  const [tab, setTab] = useState<Tab>('conciliacion')
  return (
    <div>
      <TabBar tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'conciliacion' && <ModuloConciliacion />}
      {tab === 'flujo'        && <ModuloFlujoCaja />}
    </div>
  )
}
