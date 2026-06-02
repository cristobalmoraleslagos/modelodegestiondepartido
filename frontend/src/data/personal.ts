/**
 * personal.ts — Fuente única de datos de personal del partido.
 * Importar desde aquí en ModuloPersonal, ModuloRetenciones, ModuloAlertas.
 * Actualizar SOLO en este archivo — los cambios se propagan automáticamente.
 *
 * NOTA: En producción, reemplazar por carga desde API o localStorage.
 */

export interface Funcionario {
  nombre:          string
  rut:             string
  calidad:         string
  sueldo:          string   // CLP bruto mensual como string (compatible con formularios)
  banco:           string
  tipoCuenta:      string
  numeroCuenta:    string
  area:            string
  imputableGenero: boolean
  activo:          boolean
}

/** Nómina canónica PCCh — fuente: Módulo 14 SERVEL Q1 2026 */
export const FUNCIONARIOS_CANON: Funcionario[] = [
  { nombre: 'Lautaro Carmona Soto',      rut: '5892999-9',  calidad: 'Honorarios Permanente',           sueldo: '2245875', banco: 'Banco Estado', tipoCuenta: 'Corriente', numeroCuenta: '—', area: 'Dirección General',         imputableGenero: false, activo: true },
  { nombre: 'Juan Andrés Lagos Espinoza', rut: '5926570-9',  calidad: 'Honorarios Permanente',           sueldo: '1487363', banco: 'Banco Estado', tipoCuenta: 'Corriente', numeroCuenta: '—', area: 'Dirección General',         imputableGenero: false, activo: true },
  { nombre: 'Krupskaya Corvalán',         rut: '13713819-0', calidad: 'Honorarios Permanente',           sueldo: '1541602', banco: 'Banco Chile',  tipoCuenta: 'Corriente', numeroCuenta: '—', area: 'Secretaría',               imputableGenero: true,  activo: true },
  { nombre: 'Pamela Águila Cariz',        rut: '8178828-6',  calidad: 'Código del Trabajo - Indefinido', sueldo: '1800000', banco: '—',           tipoCuenta: '—',         numeroCuenta: '—', area: 'Administración y Finanzas',  imputableGenero: true,  activo: true },
  { nombre: 'Bárbara Figueroa Sandoval',  rut: '13664938-8', calidad: 'Honorarios Permanente',           sueldo: '1840000', banco: 'Banco Estado', tipoCuenta: 'Corriente', numeroCuenta: '—', area: 'Secretaría General',       imputableGenero: true,  activo: true },
  { nombre: 'Carlos Ugas Tapia',          rut: '12636656-6', calidad: 'Honorarios Permanente',           sueldo: '2300000', banco: '—',           tipoCuenta: '—',         numeroCuenta: '—', area: 'Dirección General',         imputableGenero: false, activo: true },
  { nombre: 'Catalina Lufin',             rut: '20637037-8', calidad: 'Honorarios Permanente',           sueldo: '1400000', banco: '—',           tipoCuenta: '—',         numeroCuenta: '—', area: 'Administración',            imputableGenero: true,  activo: true },
  { nombre: 'Guillermo Adriazola',        rut: '13847847-5', calidad: 'Honorarios Permanente',           sueldo: '1167000', banco: '—',           tipoCuenta: '—',         numeroCuenta: '—', area: 'Dirección General',         imputableGenero: false, activo: true },
  { nombre: 'Damián Trujillo',            rut: '5916399-4',  calidad: 'Honorarios por Proyecto',         sueldo: '4284000', banco: '—',           tipoCuenta: '—',         numeroCuenta: '—', area: 'Comunicaciones',            imputableGenero: false, activo: true },
]
