/**
 * egresos.ts — Fuente canónica de egresos base (hardcoded reales SERVEL 2026).
 * Los nuevos egresos ingresados por el formulario se guardan en localStorage['fp_egresos_nuevos'].
 * El exportador combina ambas fuentes.
 */

export type TipoDoc = 'Factura' | 'Boleta' | 'Boleta Honorarios' | 'Liquidación' | 'Sin documento'

export interface EgresoBase {
  id:             number
  fecha:          string        // YYYY-MM-DD
  proveedor:      string
  rut:            string
  concepto:       string
  tipoDoc:        TipoDoc
  nroDoc:         string
  monto:          number
  cuenta:         string
  responsable:    string
  categoriaSERVEL:string        // ítem SERVEL (texto libre — mejorar con catálogo de 63 ítems)
}

/** Egresos reales PCCh — fuente: Módulo 14 Transferencias SERVEL Q2 2026 */
export const EGRESOS_BASE: EgresoBase[] = [
  { id:  1, fecha: '2026-05-02', proveedor: 'Lautaro Carmona Soto',       rut: '5.892.999-9',   concepto: 'Honorarios — Presidente Comité Central',           tipoDoc: 'Factura',            nroDoc: 'OC-2026-051',  monto: 2_245_875, cuenta: 'Operacional',         responsable: 'P. Águila Cariz', categoriaSERVEL: 'Gastos de Personal' },
  { id:  2, fecha: '2026-05-02', proveedor: 'Juan Andrés Lagos Espinoza', rut: '5.926.570-9',   concepto: 'Honorarios — Integrante Comisión Política',        tipoDoc: 'Factura',            nroDoc: 'OC-2026-052',  monto: 1_487_363, cuenta: 'Operacional',         responsable: 'P. Águila Cariz', categoriaSERVEL: 'Gastos de Personal' },
  { id:  3, fecha: '2026-05-02', proveedor: 'Krupskaya Corvalán',         rut: '13.713.819-0',  concepto: 'Honorarios — Secretaría Comité Central',           tipoDoc: 'Factura',            nroDoc: 'OC-2026-053',  monto: 1_541_602, cuenta: 'Operacional',         responsable: 'P. Águila Cariz', categoriaSERVEL: 'Gastos de Personal' },
  { id:  4, fecha: '2026-05-05', proveedor: 'Radio Nuevo Mundo',          rut: '99.510.820-8',  concepto: 'Espacio radial — contrato mensual',                tipoDoc: 'Factura',            nroDoc: 'F-NM-2026-05', monto: 5_000_000, cuenta: 'Campaña',            responsable: 'P. Águila Cariz', categoriaSERVEL: 'Adquisición de Bienes o Servicios y Gastos corrientes' },
  { id:  5, fecha: '2026-05-05', proveedor: 'Andres Varela Prop Ltda',    rut: '76.095.423-3',  concepto: 'Arriendo estacionamiento sede central',            tipoDoc: 'Factura',            nroDoc: 'F-AV-0412',    monto: 1_680_000, cuenta: 'Operacional',         responsable: 'P. Águila Cariz', categoriaSERVEL: 'Adquisición de Bienes o Servicios y Gastos corrientes' },
  { id:  6, fecha: '2026-05-07', proveedor: 'Multitud SpA',               rut: '77.110.848-2',  concepto: 'Servicios comunicacionales — pauta digital',       tipoDoc: 'Factura',            nroDoc: 'F-MU-0219',    monto: 1_400_000, cuenta: 'Campaña',            responsable: 'P. Águila Cariz', categoriaSERVEL: 'Publicidad Electoral' },
  { id:  7, fecha: '2026-05-10', proveedor: 'Siglo XXI',                  rut: '77.610.160-5',  concepto: 'Material impreso y papelería',                     tipoDoc: 'Factura',            nroDoc: 'F-SX-0311',    monto: 2_200_000, cuenta: 'Formación Ciudadana', responsable: 'P. Águila Cariz', categoriaSERVEL: 'Gastos de las actividades de formación de militantes' },
  { id:  8, fecha: '2026-05-12', proveedor: 'Acta Consultores SpA',       rut: '76.451.472-6',  concepto: 'Auditoría EEFF — balance SERVEL 2025',             tipoDoc: 'Factura',            nroDoc: 'F-AC-0089',    monto: 2_159_235, cuenta: 'Operacional',         responsable: 'P. Águila Cariz', categoriaSERVEL: 'Otros gastos de Administración' },
  { id:  9, fecha: '2026-05-14', proveedor: 'Telefónica Chile S.A.',      rut: '89.862.200-2',  concepto: 'Telefonía e internet — sede central',              tipoDoc: 'Factura',            nroDoc: 'F-TF-198843',  monto: 2_717_320, cuenta: 'Operacional',         responsable: 'P. Águila Cariz', categoriaSERVEL: 'Adquisición de Bienes o Servicios y Gastos corrientes' },
  { id: 10, fecha: '2026-05-15', proveedor: 'Sin identificar',            rut: '—',             concepto: 'Gasto terreno — actividad regional no rendida',    tipoDoc: 'Sin documento',      nroDoc: '—',            monto:    95_000, cuenta: 'Operacional',         responsable: 'Por regularizar', categoriaSERVEL: 'Otros gastos de Administración' },
  { id: 11, fecha: '2026-05-18', proveedor: 'Editorial Continental SpA',  rut: '77.236.959-K',  concepto: 'Material de formación política',                   tipoDoc: 'Factura',            nroDoc: 'F-EC-2041',    monto: 1_547_952, cuenta: 'Formación Ciudadana', responsable: 'P. Águila Cariz', categoriaSERVEL: 'Gastos de las actividades de formación de militantes' },
  { id: 12, fecha: '2026-05-20', proveedor: 'Gastronomía y Prod SpA',     rut: '77.905.547-7',  concepto: 'Alimentación reunión Comité Central',              tipoDoc: 'Sin documento',      nroDoc: '—',            monto:   124_000, cuenta: 'Operacional',         responsable: 'Sin respaldo',    categoriaSERVEL: 'Otros gastos de Administración' },
]
