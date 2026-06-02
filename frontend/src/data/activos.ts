/**
 * activos.ts — Fuente canónica de activos fijos.
 * Importar desde aquí en ModuloActivos y en el exportador SERVEL (M16).
 */

export type CategoriaActivo = 'Tecnología' | 'Mobiliario' | 'Vehículos' | 'Equipos AV' | 'Inmuebles'
export type EstadoActivo    = 'Operativo'  | 'En mantención' | 'Dado de baja'

export interface Activo {
  codigo:           string
  descripcion:      string
  categoria:        CategoriaActivo
  valorAdquisicion: number
  fechaAdquisicion: string   // YYYY-MM-DD
  vidaUtilAnios:    number
  ubicacion:        string
  estado:           EstadoActivo
  nroFactura?:      string   // para cruce con M12
}

/** Activos PCCh — fuente: Balance Clasificado SERVEL 2022 + inventario estimado */
export const ACTIVOS_BASE: Activo[] = [
  { codigo: 'INM-001', descripcion: 'Sede central Vicuña Mackenna #31, Santiago', categoria: 'Inmuebles',   valorAdquisicion: 1_994_234_325, fechaAdquisicion: '2000-01-01', vidaUtilAnios: 50, ubicacion: 'Vicuña Mackenna #31, Santiago', estado: 'Operativo' },
  { codigo: 'MOB-GEN', descripcion: 'Muebles y útiles (monto global balance 2022)', categoria: 'Mobiliario', valorAdquisicion:   194_348_767, fechaAdquisicion: '2010-01-01', vidaUtilAnios: 10, ubicacion: 'Sedes y oficinas',             estado: 'Operativo' },
  { codigo: 'VEH-001', descripcion: 'Citroën Berlingo 2023',                        categoria: 'Vehículos',  valorAdquisicion:    12_500_000, fechaAdquisicion: '2023-05-10', vidaUtilAnios:  5, ubicacion: 'Coordinador regional',          estado: 'Operativo' },
  { codigo: 'TEC-001', descripcion: 'MacBook Pro 14" M3',                            categoria: 'Tecnología', valorAdquisicion:     1_890_000, fechaAdquisicion: '2024-03-01', vidaUtilAnios:  3, ubicacion: 'Oficina Central',               estado: 'Operativo' },
  { codigo: 'TEC-002', descripcion: 'Servidor NAS Synology',                         categoria: 'Tecnología', valorAdquisicion:       650_000, fechaAdquisicion: '2023-08-15', vidaUtilAnios:  3, ubicacion: 'Oficina Central',               estado: 'Operativo' },
  { codigo: 'TEC-003', descripcion: 'Laptop HP EliteBook',                           categoria: 'Tecnología', valorAdquisicion:       890_000, fechaAdquisicion: '2022-01-20', vidaUtilAnios:  3, ubicacion: 'Secretaría',                    estado: 'En mantención' },
  { codigo: 'AV-001',  descripcion: 'Proyector Epson EB-X51',                        categoria: 'Equipos AV', valorAdquisicion:       390_000, fechaAdquisicion: '2022-09-01', vidaUtilAnios:  4, ubicacion: 'Sala reuniones',                estado: 'Operativo' },
  { codigo: 'AV-002',  descripcion: 'Sistema de audio portátil',                     categoria: 'Equipos AV', valorAdquisicion:       280_000, fechaAdquisicion: '2023-11-01', vidaUtilAnios:  4, ubicacion: 'Eventos',                       estado: 'Operativo' },
]
