import { useState } from 'react'
import { FileUp, FileText, BarChart3, UserCog, ShieldCheck } from 'lucide-react'
import { API_DISPONIBLE } from '../api'
import type { Rol } from '../auth'
import ModuloCargaBHE from './ModuloCargaBHE'
import ModuloContratos from './ModuloContratos'
import ModuloInformes from './ModuloInformes'
import ModuloUsuarios from './ModuloUsuarios'
import HubIntranetDemo from './HubIntranetDemo'

type Sub = 'bhe' | 'contratos' | 'informes' | 'usuarios'

export default function HubIntranet({ rol }: { rol: Rol }) {
  const [sub, setSub] = useState<Sub>('bhe')

  const TABS: { id: Sub; label: string; icon: React.ReactNode; soloAdmin?: boolean }[] = [
    { id: 'bhe',       label: 'Carga BHE',     icon: <FileUp size={15} /> },
    { id: 'contratos', label: 'Contratos',     icon: <FileText size={15} /> },
    { id: 'informes',  label: 'Informes',      icon: <BarChart3 size={15} /> },
    { id: 'usuarios',  label: 'Usuarios',      icon: <UserCog size={15} />, soloAdmin: true },
  ]
  const visibles = TABS.filter(t => !t.soloAdmin || rol === 'admin')

  // Sin backend → réplica DEMO funcional (localStorage), visible sin servidor.
  if (!API_DISPONIBLE) {
    return <HubIntranetDemo rol={rol} />
  }

  return (
    <div className="space-y-5">
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3 flex items-center gap-3">
        <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
        <p className="text-xs text-emerald-800">
          Plataforma interna segura: acceso por rol, contraseñas con hash, sesión JWT y auditoría de toda acción.
          Los archivos se resguardan en el servidor y alimentan las carpetas de rendición SERVEL.
        </p>
      </div>

      <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm w-fit">
        {visibles.map(t => (
          <button key={t.id} onClick={() => setSub(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              sub === t.id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {sub === 'bhe'       && <ModuloCargaBHE />}
      {sub === 'contratos' && <ModuloContratos />}
      {sub === 'informes'  && <ModuloInformes />}
      {sub === 'usuarios'  && rol === 'admin' && <ModuloUsuarios />}
    </div>
  )
}
