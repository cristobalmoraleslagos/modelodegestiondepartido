import { useState } from 'react'
import { Users, Shield, UserCheck } from 'lucide-react'
import TabBar           from './TabBar'
import ModuloPersonal   from './ModuloPersonal'
import ModuloConflictos from './ModuloConflictos'
import ModuloAfiliados  from './ModuloAfiliados'
import ExportadorSERVEL from './ExportadorSERVEL'

const TABS = [
  { id: 'personal',   label: 'Nómina',            icon: <Users size={15} /> },
  { id: 'conflictos', label: 'Conflictos Interés', icon: <Shield size={15} /> },
  { id: 'afiliados',  label: 'Afiliados',          icon: <UserCheck size={15} /> },
] as const

type Tab = typeof TABS[number]['id']

export default function HubPersonal() {
  const [tab, setTab] = useState<Tab>('personal')
  return (
    <div className="space-y-4">
      <TabBar tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'personal'   && <ModuloPersonal />}
      {tab === 'conflictos' && <ModuloConflictos />}
      {tab === 'afiliados'  && <ModuloAfiliados />}
      <ExportadorSERVEL modulos={['M14']} />
    </div>
  )
}
