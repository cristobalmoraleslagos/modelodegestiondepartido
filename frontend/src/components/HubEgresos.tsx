import { useState } from 'react'
import { Receipt, Calculator, CreditCard, Vote } from 'lucide-react'
import TabBar            from './TabBar'
import ModuloEgresos     from './ModuloEgresos'
import ModuloRetenciones from './ModuloRetenciones'
import ModuloDeuda       from './ModuloDeuda'
import ModuloAportes     from './ModuloAportes'
import ExportadorSERVEL  from './ExportadorSERVEL'

const TABS = [
  { id: 'egresos',     label: 'Libro de Egresos', icon: <Receipt size={15} /> },
  { id: 'retenciones', label: 'Retenciones',      icon: <Calculator size={15} /> },
  { id: 'deuda',       label: 'Préstamos',        icon: <CreditCard size={15} /> },
  { id: 'aportes',     label: 'Aportes Cands.',   icon: <Vote size={15} /> },
] as const

type Tab = typeof TABS[number]['id']

export default function HubEgresos() {
  const [tab, setTab] = useState<Tab>('egresos')
  return (
    <div className="space-y-4">
      <TabBar tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'egresos'     && <ModuloEgresos />}
      {tab === 'retenciones' && <ModuloRetenciones />}
      {tab === 'deuda'       && <ModuloDeuda />}
      {tab === 'aportes'     && <ModuloAportes />}
      <ExportadorSERVEL modulos={['M12', 'M17']} />
    </div>
  )
}
