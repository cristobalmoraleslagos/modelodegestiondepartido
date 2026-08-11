import { Users } from 'lucide-react'
import type { Rol } from '../auth'
import { API_DISPONIBLE } from '../api'
import ModuloEmpleados from './ModuloEmpleados'

/**
 * HubRRHH — plataforma de Recursos Humanos (ver RRHH/HOJA-RUTA-RRHH.md).
 * MVP: ficha de funcionarios/as (alta por admin, listado, desvinculación).
 * En modo demo (sin backend) opera con localStorage para poder visualizarse.
 */
export default function HubRRHH({ rol }: { rol: Rol }) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-5 shadow-sm flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600"><Users size={18} /></div>
        <div>
          <h1 className="text-base font-semibold text-slate-800">Recursos Humanos</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestión de personas del partido. Un administrador/a incorpora nuevos/as funcionarios/as; el acceso es por rol
            y toda acción queda auditada.{!API_DISPONIBLE && ' (Modo demo: los datos se guardan solo en este navegador.)'}
          </p>
        </div>
      </div>
      <ModuloEmpleados rol={rol} />
    </div>
  )
}
