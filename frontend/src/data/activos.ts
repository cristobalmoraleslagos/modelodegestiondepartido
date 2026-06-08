/**
 * activos.ts — Fuente canónica de activos fijos.
 * Importar desde aquí en ModuloActivos y en el exportador SERVEL (M16).
 *
 * FUENTE: Libro Mayor / Balance Defontana 2025 (cuentas 1.2.1210.xx).
 * Valores REALES a nivel de categoría contable (no ítem por ítem — Defontana
 * registra agregados). El detalle ítem por ítem requeriría inventario físico.
 * Reemplaza los ítems de ejemplo anteriores (MacBook, NAS, etc.) que NO existían.
 */

export type CategoriaActivo = 'Terrenos' | 'Edificación' | 'Obras de Arte' | 'Mobiliario' | 'Equipos' | 'Vehículos' | 'Tecnología'
export type EstadoActivo    = 'Operativo'  | 'En mantención' | 'Dado de baja'

export interface Activo {
  codigo:               string
  descripcion:          string
  categoria:            CategoriaActivo
  valorAdquisicion:     number
  fechaAdquisicion:     string   // YYYY-MM-DD
  vidaUtilAnios:        number   // 0 = no se deprecia (terrenos, obras de arte)
  ubicacion:            string
  estado:               EstadoActivo
  nroFactura?:          string
  depreciacionAcumulada?: number // real (Defontana); si se omite, se calcula lineal
}

/** Activos fijos PCCh — valores reales del balance Defontana 2025 (cuentas 1.2.1210.xx) */
export const ACTIVOS_BASE: Activo[] = [
  { codigo: 'TERR-001', descripcion: 'Terrenos (sede central Vicuña Mackenna #31)', categoria: 'Terrenos',   valorAdquisicion: 1_852_687_738, fechaAdquisicion: '2000-01-01', vidaUtilAnios:  0, ubicacion: 'Vicuña Mackenna #31, Santiago', estado: 'Operativo', depreciacionAcumulada: 0 },
  { codigo: 'ARTE-001', descripcion: 'Obras de arte y colecciones valiosas',         categoria: 'Obras de Arte', valorAdquisicion:   93_140_000, fechaAdquisicion: '2000-01-01', vidaUtilAnios:  0, ubicacion: 'Sede central',                  estado: 'Operativo', depreciacionAcumulada: 0 },
  { codigo: 'MOB-001',  descripcion: 'Mobiliario y objetos decorativos',             categoria: 'Mobiliario',   valorAdquisicion:   78_606_000, fechaAdquisicion: '2010-01-01', vidaUtilAnios: 10, ubicacion: 'Sedes y oficinas',              estado: 'Operativo' },
  { codigo: 'TRAN-001', descripcion: 'Bienes del activo fijo en tránsito',           categoria: 'Equipos',     valorAdquisicion:  141_546_587, fechaAdquisicion: '2024-01-01', vidaUtilAnios:  0, ubicacion: 'En tránsito',                  estado: 'Operativo', depreciacionAcumulada: 0 },
  { codigo: 'MOB-002',  descripcion: 'Muebles y útiles',                             categoria: 'Mobiliario',   valorAdquisicion:    7_955_633, fechaAdquisicion: '2010-01-01', vidaUtilAnios: 10, ubicacion: 'Oficinas',                     estado: 'Operativo', depreciacionAcumulada: 3_921_797 },
]

/**
 * Depreciación acumulada de Edificación y Construcción (Defontana cta 1.2.1210.60.01):
 * $362.586.454. El valor BRUTO de la edificación no figura desagregado en el balance
 * (está dentro de "Bienes raíces"). POR CONFIRMAR con el módulo Activo Fijo / contador
 * para registrar el edificio como activo con su valor bruto y depreciación.
 */
export const DEPRECIACION_EDIFICACION_PENDIENTE = 362_586_454
