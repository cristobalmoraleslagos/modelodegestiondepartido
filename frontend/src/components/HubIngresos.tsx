import { useState } from 'react'
import { Wallet, Gift, Heart } from 'lucide-react'
import TabBar           from './TabBar'
import ModuloIngresos   from './ModuloIngresos'
import ModuloDonaciones from './ModuloDonaciones'
import AlertaGenero     from './AlertaGenero'
import ExportadorSERVEL from './ExportadorSERVEL'

const TABS = [
  { id: 'ingresos',   label: 'Fuentes (Módulo 6)', icon: <Wallet size={15} /> },
  { id: 'donaciones', label: 'Donaciones',          icon: <Gift size={15} /> },
  { id: 'genero',     label: 'Fondo Género',        icon: <Heart size={15} /> },
] as const

type Tab = typeof TABS[number]['id']

export default function HubIngresos() {
  const [tab, setTab] = useState<Tab>('ingresos')
  return (
    <div className="space-y-4">
      <TabBar tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'ingresos'   && <ModuloIngresos />}
      {tab === 'donaciones' && <ModuloDonaciones />}
      {tab === 'genero'     && <AlertaGenero />}
      <ExportadorSERVEL modulos={['M6', 'M13']} />
    </div>
  )
}
