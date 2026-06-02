import { useState, useMemo } from 'react'
import {
  Receipt, AlertTriangle, FileText, TrendingUp,
  CheckSquare, Square, ChevronDown, ChevronRight,
  FolderOpen, Upload, CheckCircle, XCircle, Eye,
  ShieldAlert, Scale, Filter, Search,
} from 'lucide-react'
import { fmt, VALOR_UF } from '../utils'
import { detectarPersonaJuridica } from '../normativa'

// ════════════════════════════════════════════════════════════════════════
// SECCIÓN 1 — DOCUMENTOS REQUERIDOS POR CATEGORÍA SERVEL
// Cada categoría tiene documentos obligatorios que SERVEL puede exigir
// para aprobar el egreso en la rendición trimestral.
// ════════════════════════════════════════════════════════════════════════

interface DocSpec {
  tipo:          string
  label:         string
  obligatorio:   boolean
  ley:           string        // fuente legal exacta
  validacionSII?: string       // qué verificar en SII
  umbralMonto?:  number        // solo obligatorio si monto > este valor
}

const DOCS_POR_CATEGORIA: Record<string, DocSpec[]> = {
  'Gastos de Personal': [
    { tipo: 'liquidacion',   label: 'Liquidación de sueldo firmada',       obligatorio: true,  ley: 'DS 1174/2016 SERVEL — Módulo 14' },
    { tipo: 'transferencia', label: 'Comprobante transferencia bancaria',  obligatorio: true,  ley: 'DS 1174/2016 — respaldo pago' },
    { tipo: 'contrato',      label: 'Contrato de trabajo vigente',         obligatorio: true,  ley: 'Código del Trabajo Art. 9' },
    { tipo: 'previred',      label: 'Comprobante PREVIRED (AFP + Salud)',  obligatorio: true,  ley: 'DL 3.500 — cotizaciones previsionales' },
    { tipo: 'cert_afp',      label: 'Certificado AFP del trabajador',      obligatorio: false, ley: 'DL 3.500 — acredita cotización real' },
  ],
  'Honorarios': [
    { tipo: 'bhe_sii',       label: 'BHE SII — estado "pagada"',          obligatorio: true,  ley: 'Art. 74 N°2 DL 824', validacionSII: 'Verificar en www4.sii.cl/bolecivinternetui que BHE existe y está pagada' },
    { tipo: 'transferencia', label: 'Comprobante transferencia bancaria',  obligatorio: true,  ley: 'DS 1174/2016 — respaldo pago' },
    { tipo: 'contrato',      label: 'Contrato u orden de trabajo',         obligatorio: true,  ley: 'Código Civil Art. 2006 / Código del Trabajo' },
    { tipo: 'f29_retencion', label: 'F29 con Código 92 declarado y pagado',obligatorio: true,  ley: 'Art. 74 N°2 DL 824 — retención 10,75%', validacionSII: 'Verificar que F29 del mes siguiente incluye esta retención en Código 92' },
  ],
  'Bienes y Servicios': [
    { tipo: 'factura_dte',   label: 'Factura electrónica DTE tipo 33 — aceptada SII', obligatorio: true,  ley: 'DL 825 IVA + DS 1174/2016', validacionSII: 'Verificar en maullin.sii.cl que factura está "aceptada" y no anulada' },
    { tipo: 'transferencia', label: 'Comprobante transferencia bancaria',  obligatorio: true,  ley: 'DS 1174/2016 — respaldo pago' },
    { tipo: 'cotizacion_1',  label: 'Cotización previa (firmada)',         obligatorio: false, ley: 'Buenas prácticas — no exigido legalmente', umbralMonto: 198_000 },
    { tipo: 'cotizacion_3',  label: '3 cotizaciones comparativas',         obligatorio: false, ley: 'Recomendación auditoría — CGR Dictamen', umbralMonto: 1_980_000 },
    { tipo: 'oc_interna',    label: 'Orden de compra / aprobación interna',obligatorio: false, ley: 'Control interno' },
  ],
  'Fondo Género (Art. 38 Ley 20.900)': [
    { tipo: 'factura_dte',   label: 'Factura o BHE del proveedor',         obligatorio: true,  ley: 'DS 1174/2016 — respaldo de gasto' },
    { tipo: 'transferencia', label: 'Comprobante transferencia bancaria',  obligatorio: true,  ley: 'DS 1174/2016 — respaldo pago' },
    { tipo: 'programa',      label: 'Programa oficial del evento (PDF)',   obligatorio: true,  ley: 'Art. 38 Ley 20.900 + Dictamen CGR — debe indicar: título, fecha, lugar, público objetivo mujeres' },
    { tipo: 'lista',         label: 'Lista asistentes CON FIRMAS',        obligatorio: true,  ley: 'Dictamen CGR — registro de participación efectiva' },
    { tipo: 'informe',       label: 'Informe de actividad realizada',      obligatorio: true,  ley: 'Dictamen CGR — resultado, N° asistentes, evaluación' },
    { tipo: 'fotos',         label: 'Registro fotográfico del evento',     obligatorio: false, ley: 'Recomendación SERVEL — evidencia visual para auditoría' },
  ],
  'Fomento Juvenil': [
    { tipo: 'factura_dte',   label: 'Factura o BHE del proveedor',         obligatorio: true,  ley: 'DS 1174/2016 — respaldo de gasto' },
    { tipo: 'transferencia', label: 'Comprobante transferencia bancaria',  obligatorio: true,  ley: 'DS 1174/2016 — respaldo pago' },
    { tipo: 'programa',      label: 'Programa del evento (con rango etario)',obligatorio: true, ley: 'Art. 12 N°7 Ley 20.900 — dirigido a jóvenes' },
    { tipo: 'lista',         label: 'Lista asistentes (con fecha nacimiento)',obligatorio: true, ley: 'DS 1174/2016 — acreditar que son jóvenes' },
    { tipo: 'informe',       label: 'Informe de actividad realizada',       obligatorio: true,  ley: 'DS 1174/2016 — rendición' },
  ],
  'Educación Cívica / Investigación': [
    { tipo: 'factura_dte',   label: 'Factura o BHE del ejecutor',          obligatorio: true,  ley: 'DS 1174/2016' },
    { tipo: 'transferencia', label: 'Comprobante transferencia bancaria',  obligatorio: true,  ley: 'DS 1174/2016' },
    { tipo: 'programa',      label: 'Temario o programa de la actividad',  obligatorio: true,  ley: 'Art. 12 N°3/N°4 Ley 20.900' },
    { tipo: 'entregable',    label: 'Entregable (informe, publicación)',    obligatorio: true,  ley: 'DS 1174/2016 — producto demostrable' },
    { tipo: 'lista',         label: 'Lista de asistentes (si presencial)',  obligatorio: false, ley: 'DS 1174/2016' },
  ],
  'Activo Fijo / Inversiones': [
    { tipo: 'factura_dte',   label: 'Factura DTE de compra — aceptada SII', obligatorio: true,  ley: 'DS 1174/2016 Módulo 16', validacionSII: 'Verificar factura en SII' },
    { tipo: 'transferencia', label: 'Comprobante transferencia bancaria',   obligatorio: true,  ley: 'DS 1174/2016' },
    { tipo: 'acta_recepcion',label: 'Acta de recepción del bien (firmada)', obligatorio: true,  ley: 'DS 1174/2016 — quién recibe, fecha, estado del bien' },
    { tipo: 'ficha_inv',     label: 'Ficha inventario: código, descripción, vida útil, ubicación', obligatorio: true, ley: 'DS 1174/2016 Módulo 16 + Decreto 1172 SII (tasas depreciación)' },
    { tipo: 'foto_activo',   label: 'Fotografía del activo (ubicación)',    obligatorio: false, ley: 'Recomendación auditoría' },
  ],
  'Campaña Electoral': [
    { tipo: 'factura_dte',       label: 'Factura del proveedor',                obligatorio: true,  ley: 'Ley 19.884 Art. 5 — gasto electoral documentado' },
    { tipo: 'pago_cta_campana',  label: 'Pago DESDE cuenta corriente campaña',  obligatorio: true,  ley: 'Art. 30 Ley 19.884 — cuenta exclusiva obligatoria. Pago desde cuenta ordinaria = irregularidad grave' },
    { tipo: 'declaracion_servel',label: 'Declaración de gastos ante SERVEL',     obligatorio: true,  ley: 'Art. 24 Ley 19.884 — dentro de 15 días hábiles desde el gasto' },
    { tipo: 'muestra_material',  label: 'Muestra del material (foto/captura)',   obligatorio: false, ley: 'Ley 19.884 — evidencia de publicidad' },
    { tipo: 'admin_electoral',   label: 'Nombre del Administrador Electoral',    obligatorio: true,  ley: 'Art. 31 Ley 19.884 — responsable legal de los gastos' },
  ],
  'Formación / Preparación': [
    { tipo: 'factura_dte',   label: 'Factura o BHE del relator/institución', obligatorio: true,  ley: 'DS 1174/2016 + Art. 12 N°5/N°8 Ley 20.900' },
    { tipo: 'transferencia', label: 'Comprobante transferencia bancaria',   obligatorio: true,  ley: 'DS 1174/2016' },
    { tipo: 'programa',      label: 'Programa / contenidos del curso',      obligatorio: true,  ley: 'DS 1174/2016 — demostrar contenido formativo' },
    { tipo: 'lista',         label: 'Registro de participantes',            obligatorio: true,  ley: 'DS 1174/2016 — asistencia efectiva' },
    { tipo: 'certificados',  label: 'Certificados de participación',        obligatorio: false, ley: 'Recomendación' },
  ],
  'Préstamos / Créditos': [
    { tipo: 'contrato',      label: 'Contrato de mutuo (SOLO banco/CMF)',   obligatorio: true,  ley: 'Art. 14 Ley 20.900 — solo bancos e inst. financieras' },
    { tipo: 'transferencia', label: 'Comprobante de desembolso',            obligatorio: true,  ley: 'DS 1174/2016 Módulo 17' },
    { tipo: 'amortizacion',  label: 'Tabla de amortización firmada',        obligatorio: true,  ley: 'DS 1174/2016 Módulo 17 — cuotas capital + interés' },
    { tipo: 'acred_cmf',     label: 'Acreditación acreedor como inst. CMF', obligatorio: true,  ley: 'Art. 14 Ley 20.900 — verificar en cmfchile.cl' },
  ],
  'Otros Gastos de Administración': [
    { tipo: 'factura_dte',   label: 'Factura o boleta electrónica',         obligatorio: true,  ley: 'DS 1174/2016' },
    { tipo: 'transferencia', label: 'Comprobante transferencia bancaria',   obligatorio: true,  ley: 'DS 1174/2016' },
  ],
}

const CATEGORIAS_SERVEL = Object.keys(DOCS_POR_CATEGORIA)

// ════════════════════════════════════════════════════════════════════════
// SECCIÓN 2 — MODELO DE EGRESO CON CARPETA DOCUMENTAL
// ════════════════════════════════════════════════════════════════════════

type EstadoDoc = 'pendiente' | 'cargado' | 'validado' | 'rechazado'
type EstadoEgreso = 'incompleto' | 'completo' | 'validado' | 'observado'

interface DocAdjunto {
  tipo:     string
  label:    string
  estado:   EstadoDoc
  archivo?: string    // nombre del archivo subido
  fecha?:   string    // fecha de carga
  nota?:    string    // observación del validador
}

interface EgresoCompleto {
  id:            number
  fecha:         string
  proveedor:     string
  rut:           string
  concepto:      string
  tipoDoc:       'Factura' | 'Boleta' | 'Sin documento'
  nroDoc:        string
  monto:         number
  cuenta:        string
  responsable:   string
  categoriaSERVEL: string
  estadoEgreso:  EstadoEgreso
  documentos:    DocAdjunto[]
  alertas:       string[]
}

// Generar carpeta documental para un egreso según su categoría
function generarCarpetaDocumental(categoria: string, monto: number): DocAdjunto[] {
  const specs = DOCS_POR_CATEGORIA[categoria] ?? DOCS_POR_CATEGORIA['Otros Gastos de Administración']
  return specs
    .filter(s => s.obligatorio || (s.umbralMonto && monto >= s.umbralMonto))
    .map(s => ({
      tipo:   s.tipo,
      label:  s.label,
      estado: 'pendiente' as EstadoDoc,
    }))
}

function calcularEstadoEgreso(docs: DocAdjunto[]): EstadoEgreso {
  if (docs.length === 0) return 'incompleto'
  const obligatorios = docs // en este contexto todos los de la carpeta son "necesarios"
  const todosOk = obligatorios.every(d => d.estado === 'validado' || d.estado === 'cargado')
  const algunoRechazado = obligatorios.some(d => d.estado === 'rechazado')
  if (algunoRechazado) return 'observado'
  if (todosOk) return 'completo'
  return 'incompleto'
}

// Detectar alertas legales automáticas por egreso
function detectarAlertas(e: Omit<EgresoCompleto, 'alertas'>): string[] {
  const alertas: string[] = []
  // RUT proveedor es persona jurídica con RUT >60M pero concepto es "honorarios"
  if (e.concepto.toLowerCase().includes('honorario')) {
    const det = detectarPersonaJuridica(e.rut)
    if (det.esJuridica && det.confianza === 'alta') {
      alertas.push('RUT del proveedor es de persona jurídica pero el concepto dice "honorarios" — las BHE solo pueden ser emitidas por personas naturales (Art. 74 N°2 DL 824)')
    }
  }
  // Campaña sin cuenta campaña
  if (e.cuenta === 'Campaña' && e.categoriaSERVEL !== 'Campaña Electoral') {
    alertas.push('Gasto clasificado como "Campaña" pero la categoría SERVEL no es "Campaña Electoral" — reclasificar o verificar cuenta')
  }
  // Gasto de campaña desde cuenta operacional
  if (e.categoriaSERVEL === 'Campaña Electoral' && e.cuenta !== 'Campaña') {
    alertas.push('Art. 30 Ley 19.884: Gasto de campaña debe pagarse DESDE la cuenta corriente exclusiva de campaña — no desde cuenta operacional')
  }
  // Sin documento
  if (e.tipoDoc === 'Sin documento') {
    alertas.push('Egreso sin documento tributario — no rendible ante SERVEL. Regularizar con factura o boleta antes del cierre trimestral')
  }
  // Monto alto sin 3 cotizaciones
  if (e.monto > 1_980_000 && e.categoriaSERVEL === 'Bienes y Servicios') {
    alertas.push('Monto > 30 UTM ($1.980.000) — se recomienda contar con 3 cotizaciones comparativas para la auditoría')
  }
  // Sueldo sobre 60 UF
  if ((e.categoriaSERVEL === 'Gastos de Personal' || e.categoriaSERVEL === 'Honorarios') && e.monto > 60 * VALOR_UF) {
    alertas.push(`Art. 5 Ley 20.900: El monto (${fmt(e.monto)}) supera el límite de 60 UF = ${fmt(60 * VALOR_UF)}. El exceso no puede imputarse al aporte estatal.`)
  }
  return alertas
}

// ════════════════════════════════════════════════════════════════════════
// SECCIÓN 3 — DATOS (12 egresos reales + carpeta documental simulada)
// ════════════════════════════════════════════════════════════════════════

const EGRESOS_RAW = [
  { id: 1,  fecha: '2026-05-02', proveedor: 'Lautaro Carmona Soto',       rut: '5.892.999-9',   concepto: 'Honorarios — Presidente Comité Central',      tipoDoc: 'Factura' as const, nroDoc: 'OC-2026-051', monto: 2_245_875, cuenta: 'Operacional',          responsable: 'P. Águila Cariz', categoriaSERVEL: 'Honorarios' },
  { id: 2,  fecha: '2026-05-02', proveedor: 'Juan Andrés Lagos Espinoza', rut: '5.926.570-9',   concepto: 'Honorarios — Integrante Comisión Política',    tipoDoc: 'Factura' as const, nroDoc: 'OC-2026-052', monto: 1_487_363, cuenta: 'Operacional',          responsable: 'P. Águila Cariz', categoriaSERVEL: 'Honorarios' },
  { id: 3,  fecha: '2026-05-02', proveedor: 'Krupskaya Corvalán',         rut: '13.713.819-0',  concepto: 'Honorarios — Secretaría Comité Central',       tipoDoc: 'Factura' as const, nroDoc: 'OC-2026-053', monto: 1_541_602, cuenta: 'Operacional',          responsable: 'P. Águila Cariz', categoriaSERVEL: 'Honorarios' },
  { id: 4,  fecha: '2026-05-05', proveedor: 'Radio Nuevo Mundo',          rut: '99.510.820-8',  concepto: 'Espacio radial — contrato mensual',             tipoDoc: 'Factura' as const, nroDoc: 'F-NM-2026-05', monto: 5_000_000, cuenta: 'Campaña',             responsable: 'P. Águila Cariz', categoriaSERVEL: 'Bienes y Servicios' },
  { id: 5,  fecha: '2026-05-05', proveedor: 'Andres Varela Prop Ltda',    rut: '76.095.423-3',  concepto: 'Arriendo estacionamiento sede central',         tipoDoc: 'Factura' as const, nroDoc: 'F-AV-0412',   monto: 1_680_000, cuenta: 'Operacional',          responsable: 'P. Águila Cariz', categoriaSERVEL: 'Bienes y Servicios' },
  { id: 6,  fecha: '2026-05-07', proveedor: 'Multitud SpA',               rut: '77.110.848-2',  concepto: 'Servicios comunicacionales — pauta digital',    tipoDoc: 'Factura' as const, nroDoc: 'F-MU-0219',   monto: 1_400_000, cuenta: 'Campaña',             responsable: 'P. Águila Cariz', categoriaSERVEL: 'Campaña Electoral' },
  { id: 7,  fecha: '2026-05-10', proveedor: 'Siglo XXI',                  rut: '77.610.160-5',  concepto: 'Material impreso y papelería',                  tipoDoc: 'Factura' as const, nroDoc: 'F-SX-0311',   monto: 2_200_000, cuenta: 'Formación Ciudadana',  responsable: 'P. Águila Cariz', categoriaSERVEL: 'Formación / Preparación' },
  { id: 8,  fecha: '2026-05-12', proveedor: 'Acta Consultores SpA',       rut: '76.451.472-6',  concepto: 'Auditoría EEFF — balance SERVEL 2025',          tipoDoc: 'Factura' as const, nroDoc: 'F-AC-0089',   monto: 2_159_235, cuenta: 'Operacional',          responsable: 'P. Águila Cariz', categoriaSERVEL: 'Bienes y Servicios' },
  { id: 9,  fecha: '2026-05-14', proveedor: 'Telefónica Chile S.A.',      rut: '89.862.200-2',  concepto: 'Telefonía e internet — sede central',           tipoDoc: 'Factura' as const, nroDoc: 'F-TF-198843', monto: 2_717_320, cuenta: 'Operacional',          responsable: 'P. Águila Cariz', categoriaSERVEL: 'Bienes y Servicios' },
  { id: 10, fecha: '2026-05-15', proveedor: 'Sin identificar',            rut: '—',             concepto: 'Gasto terreno — actividad regional no rendida', tipoDoc: 'Sin documento' as const, nroDoc: '—',  monto: 95_000,    cuenta: 'Operacional',          responsable: 'Por regularizar', categoriaSERVEL: 'Otros Gastos de Administración' },
  { id: 11, fecha: '2026-05-18', proveedor: 'Editorial Continental SpA',  rut: '77.236.959-K',  concepto: 'Material de formación política',                tipoDoc: 'Factura' as const, nroDoc: 'F-EC-2041',   monto: 1_547_952, cuenta: 'Formación Ciudadana',  responsable: 'P. Águila Cariz', categoriaSERVEL: 'Formación / Preparación' },
  { id: 12, fecha: '2026-05-20', proveedor: 'Gastronomía y Prod SpA',     rut: '77.905.547-7',  concepto: 'Alimentación reunión Comité Central',           tipoDoc: 'Sin documento' as const, nroDoc: '—',  monto: 124_000,   cuenta: 'Operacional',          responsable: 'Sin respaldo',    categoriaSERVEL: 'Otros Gastos de Administración' },
]

// Simulación: algunos documentos ya "cargados" para mostrar el flujo
function generarEgresosCompletos(): EgresoCompleto[] {
  return EGRESOS_RAW.map(raw => {
    const docs = generarCarpetaDocumental(raw.categoriaSERVEL, raw.monto)
    // Simular estado documental: los 3 primeros tienen docs cargados
    if (raw.id <= 3) {
      docs.forEach(d => {
        if (d.tipo === 'bhe_sii' || d.tipo === 'transferencia') {
          d.estado = 'validado'
          d.archivo = `${raw.nroDoc}_${d.tipo}.pdf`
          d.fecha = raw.fecha
        } else if (d.tipo === 'contrato') {
          d.estado = 'cargado'
          d.archivo = `contrato_${raw.rut.replace(/\./g, '')}.pdf`
          d.fecha = '2026-01-15'
        }
      })
    }
    const estadoEgreso = calcularEstadoEgreso(docs)
    const alertas = detectarAlertas({ ...raw, estadoEgreso, documentos: docs })
    return { ...raw, estadoEgreso, documentos: docs, alertas }
  })
}

const CUENTAS = ['Todas', 'Operacional', 'Campaña', 'Formación Ciudadana']
const ESTADOS_FILTRO = ['Todos', 'incompleto', 'completo', 'validado', 'observado']

// ════════════════════════════════════════════════════════════════════════
// SECCIÓN 4 — COMPONENTE CARPETA DOCUMENTAL
// ════════════════════════════════════════════════════════════════════════

function CarpetaDocumental({ egreso, onClose }: { egreso: EgresoCompleto; onClose: () => void }) {
  const [docs, setDocs] = useState(egreso.documentos)
  const specs = DOCS_POR_CATEGORIA[egreso.categoriaSERVEL] ?? []
  const obligatorios = specs.filter(s => s.obligatorio)
  const completados = docs.filter(d => d.estado === 'cargado' || d.estado === 'validado').length
  const total = docs.length
  const pct = total > 0 ? Math.round((completados / total) * 100) : 0

  function simularCarga(tipo: string) {
    setDocs(prev => prev.map(d =>
      d.tipo === tipo
        ? { ...d, estado: 'cargado' as EstadoDoc, archivo: `${egreso.nroDoc}_${tipo}.pdf`, fecha: new Date().toISOString().slice(0, 10) }
        : d
    ))
  }

  const iconEstado = (e: EstadoDoc) => {
    switch (e) {
      case 'validado': return <CheckCircle size={14} className="text-green-500" />
      case 'cargado':  return <CheckSquare size={14} className="text-blue-500" />
      case 'rechazado':return <XCircle size={14} className="text-red-500" />
      default:         return <Square size={14} className="text-slate-300" />
    }
  }

  const colorEstado = (e: EstadoDoc) =>
    e === 'validado' ? 'bg-green-100 text-green-700' :
    e === 'cargado'  ? 'bg-blue-100 text-blue-700'  :
    e === 'rechazado'? 'bg-red-100 text-red-700'     :
    'bg-slate-100 text-slate-500'

  return (
    <div className="bg-slate-50 border-y border-slate-200 px-5 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <FolderOpen size={18} className="text-indigo-600" />
          <div>
            <p className="text-sm font-semibold text-slate-800">Carpeta documental — Egreso #{egreso.id}</p>
            <p className="text-xs text-slate-500">
              {egreso.proveedor} · {egreso.categoriaSERVEL} · {fmt(egreso.monto)}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1">Cerrar</button>
      </div>

      {/* Barra de progreso */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-slate-600 font-medium">{completados}/{total} documentos ({pct}%)</span>
          <span className={pct === 100 ? 'text-green-600 font-semibold' : 'text-amber-600 font-semibold'}>
            {pct === 100 ? '✓ Carpeta completa' : `Faltan ${total - completados}`}
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? '#22c55e' : '#f59e0b' }} />
        </div>
      </div>

      {/* Alertas del egreso */}
      {egreso.alertas.length > 0 && (
        <div className="space-y-1.5">
          {egreso.alertas.map((a, i) => (
            <div key={i} className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <ShieldAlert size={13} className="text-red-600 mt-0.5 shrink-0" />
              <p className="text-xs text-red-800">{a}</p>
            </div>
          ))}
        </div>
      )}

      {/* Lista de documentos */}
      <div className="space-y-1">
        {docs.map((doc, i) => {
          const spec = specs.find(s => s.tipo === doc.tipo)
          return (
            <div key={i} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2.5 border border-slate-100">
              {iconEstado(doc.estado)}
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium ${doc.estado === 'validado' ? 'text-green-700' : doc.estado === 'cargado' ? 'text-blue-700' : 'text-slate-700'}`}>
                  {doc.label}
                </p>
                {spec && (
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{spec.ley}</p>
                )}
                {spec?.validacionSII && doc.estado === 'cargado' && (
                  <p className="text-xs text-indigo-500 mt-0.5 italic">{spec.validacionSII}</p>
                )}
                {doc.archivo && (
                  <p className="text-xs text-slate-400 mt-0.5">📎 {doc.archivo} · {doc.fecha}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full ${colorEstado(doc.estado)}`}>
                  {doc.estado}
                </span>
                {spec?.obligatorio && doc.estado === 'pendiente' && (
                  <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">obligatorio</span>
                )}
                {doc.estado === 'pendiente' && (
                  <button onClick={() => simularCarga(doc.tipo)}
                    className="text-xs bg-indigo-600 text-white px-2.5 py-1 rounded-lg hover:bg-indigo-700 flex items-center gap-1">
                    <Upload size={11} /> Cargar
                  </button>
                )}
                {doc.estado === 'cargado' && (
                  <button className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                    <Eye size={11} /> Ver
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Estado final */}
      <div className={`text-xs rounded-lg px-3 py-2 ${
        pct === 100 ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'
      }`}>
        <strong>Estado SERVEL:</strong> {pct === 100
          ? 'Carpeta documental completa. Este egreso es rendible en la declaración trimestral.'
          : `Carpeta incompleta — no rendible. Cargar los ${total - completados} documentos faltantes antes del cierre trimestral (DS 1174/2016).`
        }
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// SECCIÓN 5 — FORMULARIO NUEVO EGRESO
// ════════════════════════════════════════════════════════════════════════

function FormNuevoEgreso({ onClose }: { onClose: () => void }) {
  const [categoria, setCategoria] = useState(CATEGORIAS_SERVEL[0])
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({})
  const [showDocs, setShowDocs] = useState(true)
  const [monto, setMonto] = useState('')

  const specs = DOCS_POR_CATEGORIA[categoria] ?? []
  const montoNum = parseInt(monto) || 0
  const docsAplicables = specs.filter(s => s.obligatorio || (s.umbralMonto && montoNum >= s.umbralMonto))
  const obligatorios = docsAplicables.filter(s => s.obligatorio)
  const opcionales   = docsAplicables.filter(s => !s.obligatorio)
  const completados  = obligatorios.filter(d => checkedDocs[d.tipo]).length
  const pctCompleto  = obligatorios.length > 0 ? Math.round((completados / obligatorios.length) * 100) : 0
  const puedeGuardar = pctCompleto === 100

  return (
    <div className="border-b border-slate-100 bg-slate-50">
      <div className="p-5 grid grid-cols-2 gap-5">
        {/* Columna izquierda */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Datos del egreso</h3>
          {[
            { label: 'Proveedor / razón social', ph: 'Ej: Editorial Continental SpA', type: 'text' },
            { label: 'RUT proveedor', ph: '77.236.959-K', type: 'text' },
            { label: 'N° documento (factura/boleta)', ph: 'F-EC-2041', type: 'text' },
          ].map(({ label, ph, type }) => (
            <div key={label} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">{label}</label>
              <input type={type} placeholder={ph}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          ))}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Monto (CLP)</label>
            <input type="number" placeholder="1547952" value={monto} onChange={e => setMonto(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            {montoNum > 60 * VALOR_UF && (categoria === 'Gastos de Personal' || categoria === 'Honorarios') && (
              <p className="text-xs text-red-600 font-medium mt-1">⚠ Supera 60 UF ({fmt(60 * VALOR_UF)}) — Art. 5 Ley 20.900</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Categoría SERVEL</label>
            <select value={categoria} onChange={e => { setCategoria(e.target.value); setCheckedDocs({}) }}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
              {CATEGORIAS_SERVEL.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Columna derecha — árbol documental */}
        <div>
          <button onClick={() => setShowDocs(v => !v)}
            className="flex items-center gap-2 w-full text-sm font-semibold text-slate-700 mb-3">
            {showDocs ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Documentos — {categoria}
            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${puedeGuardar ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {completados}/{obligatorios.length}
            </span>
          </button>

          {showDocs && (
            <div className="space-y-1">
              <div className="w-full bg-slate-200 rounded-full h-1.5 mb-3">
                <div className="h-1.5 rounded-full transition-all"
                  style={{ width: `${pctCompleto}%`, background: puedeGuardar ? '#22c55e' : '#f59e0b' }} />
              </div>

              {obligatorios.map(doc => (
                <button key={doc.tipo} onClick={() => setCheckedDocs(p => ({ ...p, [doc.tipo]: !p[doc.tipo] }))}
                  className="flex items-start gap-2.5 w-full text-left px-3 py-2 rounded-lg hover:bg-white transition-colors">
                  {checkedDocs[doc.tipo]
                    ? <CheckSquare size={14} className="text-green-500 mt-0.5 shrink-0" />
                    : <Square size={14} className="text-slate-300 mt-0.5 shrink-0" />}
                  <div>
                    <span className={`text-xs ${checkedDocs[doc.tipo] ? 'text-green-700 line-through' : 'text-slate-700'}`}>
                      {doc.label}
                    </span>
                    <p className="text-xs text-slate-400">{doc.ley}</p>
                  </div>
                  <span className="ml-auto text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded shrink-0 mt-0.5">req.</span>
                </button>
              ))}

              {opcionales.length > 0 && (
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-3 mb-1 px-3">Opcionales</p>
              )}
              {opcionales.map(doc => (
                <button key={doc.tipo} onClick={() => setCheckedDocs(p => ({ ...p, [doc.tipo]: !p[doc.tipo] }))}
                  className="flex items-start gap-2.5 w-full text-left px-3 py-2 rounded-lg hover:bg-white transition-colors">
                  {checkedDocs[doc.tipo]
                    ? <CheckSquare size={14} className="text-green-500 mt-0.5 shrink-0" />
                    : <Square size={14} className="text-slate-300 mt-0.5 shrink-0" />}
                  <div>
                    <span className={`text-xs ${checkedDocs[doc.tipo] ? 'text-green-700 line-through' : 'text-slate-500'}`}>
                      {doc.label}
                    </span>
                    <p className="text-xs text-slate-400">{doc.ley}</p>
                    {doc.umbralMonto && <p className="text-xs text-amber-500">Aplica si monto ≥ {fmt(doc.umbralMonto)}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-5 pb-4 gap-3">
        {!puedeGuardar && (
          <p className="text-xs text-amber-700 flex items-center gap-1.5">
            <AlertTriangle size={13} /> Marcar todos los documentos obligatorios antes de guardar — DS 1174/2016 SERVEL.
          </p>
        )}
        <div className="flex gap-2 ml-auto">
          <button onClick={onClose}
            className="text-sm text-slate-500 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors">
            Cancelar
          </button>
          <button disabled={!puedeGuardar}
            className={`text-sm font-medium px-5 py-2 rounded-lg transition-colors ${puedeGuardar ? 'bg-amaranto-600 hover:bg-amaranto-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
            {puedeGuardar ? 'Guardar egreso' : `Faltan ${obligatorios.length - completados} doc(s)`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// SECCIÓN 6 — MÓDULO PRINCIPAL
// ════════════════════════════════════════════════════════════════════════

export default function ModuloEgresos() {
  const egresos = useMemo(() => generarEgresosCompletos(), [])
  const [filtroCuenta, setFiltroCuenta] = useState('Todas')
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [showForm, setShowForm] = useState(false)
  const [carpetaAbierta, setCarpetaAbierta] = useState<number | null>(null)
  const [busqueda, setBusqueda] = useState('')

  // Filtrar
  const filtrados = egresos.filter(e => {
    if (filtroCuenta !== 'Todas' && e.cuenta !== filtroCuenta) return false
    if (filtroEstado !== 'Todos' && e.estadoEgreso !== filtroEstado) return false
    if (busqueda && !e.proveedor.toLowerCase().includes(busqueda.toLowerCase()) &&
        !e.concepto.toLowerCase().includes(busqueda.toLowerCase())) return false
    return true
  })

  // KPIs
  const totalMes       = egresos.reduce((s, e) => s + e.monto, 0)
  const sinDoc         = egresos.filter(e => e.tipoDoc === 'Sin documento')
  const incompletos    = egresos.filter(e => e.estadoEgreso === 'incompleto')
  const completos      = egresos.filter(e => e.estadoEgreso === 'completo' || e.estadoEgreso === 'validado')
  const conAlertas     = egresos.filter(e => e.alertas.length > 0)
  const pctRendible    = Math.round((completos.length / egresos.length) * 100)

  const colorEstadoEgreso = (e: EstadoEgreso) =>
    e === 'validado'   ? 'bg-green-100 text-green-700' :
    e === 'completo'   ? 'bg-blue-100 text-blue-700'   :
    e === 'observado'  ? 'bg-red-100 text-red-700'     :
    'bg-amber-100 text-amber-700'

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: <Receipt size={18} />,       label: 'Total egresos mayo',    value: fmt(totalMes),              sub: `${egresos.length} transacciones`, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { icon: <CheckCircle size={18} />,    label: 'Rendibles SERVEL',     value: `${pctRendible}%`,          sub: `${completos.length}/${egresos.length} con carpeta completa`, color: completos.length === egresos.length ? 'text-green-600' : 'text-amber-600', bg: completos.length === egresos.length ? 'bg-green-50' : 'bg-amber-50' },
          { icon: <AlertTriangle size={18} />,  label: 'Carpetas incompletas', value: String(incompletos.length), sub: 'Documentos pendientes de cargar', color: incompletos.length > 0 ? 'text-red-600' : 'text-green-600', bg: incompletos.length > 0 ? 'bg-red-50' : 'bg-green-50' },
          { icon: <ShieldAlert size={18} />,    label: 'Alertas legales',      value: String(conAlertas.length),  sub: 'Egresos con observaciones normativas', color: conAlertas.length > 0 ? 'text-red-600' : 'text-green-600', bg: conAlertas.length > 0 ? 'bg-red-50' : 'bg-green-50' },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm flex items-start gap-3">
            <div className={`p-2.5 rounded-xl ${k.bg} ${k.color}`}>{k.icon}</div>
            <div>
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className={`text-xl font-semibold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-slate-400">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alertas globales */}
      {sinDoc.length > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl px-5 py-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Egresos sin documento tributario ({sinDoc.length})</p>
            <p className="text-xs mt-0.5">{sinDoc.map(e => `#${e.id} ${e.proveedor}`).join(' · ')} — No rendibles ante SERVEL (DS 1174/2016). Regularizar antes del cierre trimestral.</p>
          </div>
        </div>
      )}

      {/* Nota normativa */}
      <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-200 rounded-2xl px-5 py-3">
        <Scale size={14} className="text-indigo-600 mt-0.5 shrink-0" />
        <p className="text-xs text-indigo-800">
          <strong>DS 1174/2016 SERVEL:</strong> Cada egreso requiere respaldo documental completo según su categoría.
          Los egresos con carpeta incompleta no se incluyen en la rendición trimestral.
          Hacer clic en <strong>📁 Carpeta</strong> para ver y cargar los documentos requeridos por cada egreso.
        </p>
      </div>

      {/* Tabla de egresos */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 gap-3 flex-wrap">
          <h2 className="text-base font-semibold text-slate-800">Libro de Egresos — Mayo 2026</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar proveedor..."
                className="border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-sm w-44" />
            </div>
            <select value={filtroCuenta} onChange={e => setFiltroCuenta(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm">
              {CUENTAS.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm">
              {ESTADOS_FILTRO.map(e => <option key={e} value={e}>{e === 'Todos' ? 'Estado: Todos' : `Estado: ${e}`}</option>)}
            </select>
            <button onClick={() => setShowForm(v => !v)}
              className="bg-amaranto-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-amaranto-700 transition-colors">
              + Nuevo egreso
            </button>
          </div>
        </div>

        {showForm && <FormNuevoEgreso onClose={() => setShowForm(false)} />}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100">
                {['Fecha', 'Proveedor', 'Categoría SERVEL', 'Documento', 'Monto', 'Carpeta', 'Estado', ''].map(h => (
                  <th key={h} className="text-left py-3 px-4 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(e => {
                const totalDocs = e.documentos.length
                const docsOk = e.documentos.filter(d => d.estado === 'cargado' || d.estado === 'validado').length
                const isOpen = carpetaAbierta === e.id
                return (
                  <>
                    <tr key={e.id} className={`border-b border-slate-50 last:border-0 ${
                      e.alertas.length > 0 ? 'bg-red-50/50' :
                      e.estadoEgreso === 'completo' ? 'bg-green-50/30' :
                      'hover:bg-slate-50'
                    }`}>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{e.fecha}</td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-800 whitespace-nowrap">{e.proveedor}</p>
                        <p className="text-xs text-slate-400 truncate max-w-48">{e.concepto}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs text-indigo-600 font-medium">{e.categoriaSERVEL}</span>
                      </td>
                      <td className="py-3 px-4">
                        {e.tipoDoc === 'Sin documento'
                          ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Sin doc.</span>
                          : <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{e.tipoDoc} {e.nroDoc}</span>}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700 whitespace-nowrap">{fmt(e.monto)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-14 bg-slate-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full" style={{
                              width: `${totalDocs > 0 ? (docsOk / totalDocs) * 100 : 0}%`,
                              background: docsOk === totalDocs ? '#22c55e' : '#f59e0b',
                            }} />
                          </div>
                          <span className="text-xs text-slate-500">{docsOk}/{totalDocs}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${colorEstadoEgreso(e.estadoEgreso)}`}>
                          {e.estadoEgreso}
                        </span>
                        {e.alertas.length > 0 && (
                          <span className="ml-1 text-red-500" title={e.alertas[0]}>⚠</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button onClick={() => setCarpetaAbierta(isOpen ? null : e.id)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                          <FolderOpen size={13} />
                          {isOpen ? 'Cerrar' : 'Carpeta'}
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`carpeta-${e.id}`}>
                        <td colSpan={8} className="p-0">
                          <CarpetaDocumental egreso={e} onClose={() => setCarpetaAbierta(null)} />
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td colSpan={4} className="py-3 px-4 text-sm font-semibold text-slate-700">
                  Total filtrado ({filtrados.length} egresos)
                </td>
                <td className="py-3 px-4 text-right font-bold text-slate-800">
                  {fmt(filtrados.reduce((s, e) => s + e.monto, 0))}
                </td>
                <td colSpan={3} className="py-3 px-4 text-xs text-slate-500">
                  {completos.length}/{egresos.length} rendibles SERVEL
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Contexto gastos electorales 2025 */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <TrendingUp size={16} className="text-amber-500" />
            Contexto: Gastos Electorales 2025 — Nómina SERVEL
          </h2>
          <p className="text-xs text-slate-500 mt-1">Fuente: SERVEL PP007 Módulo 15 Nómina &gt;20 UTM, Q2–Q3 2025</p>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <p className="text-xs">
              <strong>Art. 30 Ley 19.884:</strong> Los gastos de campaña deben pagarse desde la cuenta corriente exclusiva del candidato.
              <strong> Art. 24 Ley 19.884:</strong> Declarar ante SERVEL dentro de 15 días hábiles.
              Verificar que estos pagos salieron de la cuenta de campaña y no de la cuenta operacional del partido.
            </p>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-100">
                {['Contratista', 'RUT', 'Período', 'Concepto', 'Monto', 'Docs req.'].map(h => (
                  <th key={h} className="text-left py-2 px-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { nombre: 'Distrito Lab',             rut: '78.158.072-4', periodo: 'May 2025', concepto: 'Publicidad Electoral (2 × $22.5M)', monto: 45_000_000, docs: 'Factura + pago cta campaña + declaración SERVEL' },
                { nombre: 'Francisco Mena',           rut: '8.964.981-1',  periodo: 'Jun–Sep 2025', concepto: 'Adq. B/S — múltiples pagos', monto: 73_000_000, docs: 'Factura + pago cta campaña + declaración SERVEL' },
                { nombre: 'Radio Nuevo Mundo',        rut: '99.510.820-8', periodo: 'Q1–Q3 2025', concepto: 'Espacio radial cadena nacional', monto: 81_000_000, docs: 'Factura + transferencia + contrato arriendo espacio' },
                { nombre: 'Multitud Comunicaciones',  rut: '77.110.848-2', periodo: 'Jul–Sep 2025', concepto: 'Pauta digital y difusión', monto: 11_000_000, docs: 'Factura + pago cta campaña + muestra material' },
              ].map((r, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0">
                  <td className="py-2 px-3 font-medium text-slate-800">{r.nombre}</td>
                  <td className="py-2 px-3 text-slate-500">{r.rut}</td>
                  <td className="py-2 px-3 text-slate-500">{r.periodo}</td>
                  <td className="py-2 px-3 text-slate-600">{r.concepto}</td>
                  <td className="py-2 px-3 font-semibold text-slate-800 text-right">{fmt(r.monto)}</td>
                  <td className="py-2 px-3 text-indigo-600">{r.docs}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50">
                <td colSpan={4} className="py-2 px-3 font-semibold text-slate-700">Total</td>
                <td className="py-2 px-3 font-bold text-slate-800 text-right">{fmt(210_000_000)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
