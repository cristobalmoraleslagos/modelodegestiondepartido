import { useState } from 'react'
import { Package, Scale } from 'lucide-react'
import TabBar           from './TabBar'
import ModuloActivos    from './ModuloActivos'
import ModuloBalance    from './ModuloBalance'
import ExportadorSERVEL from './ExportadorSERVEL'

const TABS = [
  { id: 'activos',  label: 'Activos Fijos',       icon: <Package size={15} /> },
  { id: 'balance',  label: 'Balance — Módulo 15', icon: <Scale size={15} /> },
] as const

type Tab = typeof TABS[number]['id']

export default function HubContabilidad() {
  const [tab, setTab] = useState<Tab>('activos')
  return (
    <div className="space-y-4">
      <TabBar tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'activos'  && <ModuloActivos />}
      {tab === 'balance'  && <ModuloBalance />}
      <ExportadorSERVEL modulos={['M16']} />
    </div>
  )
}
