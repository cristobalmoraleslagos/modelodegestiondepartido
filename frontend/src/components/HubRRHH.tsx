import type { Rol } from '../auth'
import HubIntranetDemo from './HubIntranetDemo'

/**
 * HubRRHH — Portal del funcionario/a (RRHH + intranet unificados).
 * Un solo contenedor con: ficha de personas, asistencia, boletas, informes,
 * cumpleaños, vacaciones y calendario. En modo demo opera con localStorage.
 */
export default function HubRRHH({ rol }: { rol: Rol }) {
  return <HubIntranetDemo rol={rol} />
}
