/**
 * normativa.ts — Motor de Reglas Legales FinParty
 * Centraliza TODA la normativa que rige a los partidos políticos en Chile.
 * Cada constante y función cita la fuente legal exacta.
 *
 * Fuentes:
 *  - Ley 18.603  — LOC Partidos Políticos
 *  - Ley 19.884  — Transparencia, Límite y Control del Gasto Electoral
 *  - Ley 20.900  — Fortalecimiento y Transparencia de la Democracia
 *  - Ley 21.442  — Modifica Ley 20.900 (2022)
 *  - Ley 21.719  — Protección de Datos Personales (2024)
 *  - DL 824      — Ley de la Renta (Art. 74 N°2 retención honorarios)
 *  - DL 3.500    — AFP / Sistema Previsional
 *  - DS 1174/2016 SERVEL — Reglamento Rendición de Cuentas
 *  - Dictámenes CGR relevantes
 */

import { VALOR_UF, MES_ACTUAL } from './utils'

// ════════════════════════════════════════════════════════════════════════
// SECCIÓN 1 — LEY 20.900: FINANCIAMIENTO ESTATAL
// ════════════════════════════════════════════════════════════════════════

/** Art. 5 Ley 20.900 — Remuneración máxima por funcionario del partido */
export const SUELDO_MAX_UF              = 60
export const SUELDO_MAX_CLP             = SUELDO_MAX_UF * VALOR_UF           // ~$2.426.520

/** Art. 15 Ley 20.900 — Límite de aporte de persona natural AL PARTIDO (no campaña) */
export const DONACION_PARTIDO_MAX_UF    = 500
export const DONACION_PARTIDO_MAX_CLP   = DONACION_PARTIDO_MAX_UF * VALOR_UF // ~$20.221.000

/** Art. 38 Ley 20.900 — Mínimo Fondo de Género sobre aporte estatal */
export const GENERO_PCT_MINIMO          = 0.10

/** Art. 14 Ley 20.900 — Solo bancos e instituciones financieras CMF */
export const TIPOS_ACREEDOR_LEGAL       = ['banco', 'cooperativa_ahorro', 'caja_compensacion'] as const

/** Art. 12 Ley 20.900 — Categorías de gasto permitidas con aporte estatal */
export const GASTOS_PERMITIDOS_ART12 = [
  'personal', 'honorarios', 'bienes_servicios', 'otros_admin',
  'investigacion', 'educacion_civica', 'formacion', 'genero',
  'juvenil', 'preparacion_candidatos', 'activo_fijo', 'campana',
  'prestamos', 'transferencias',
] as const

/** Art. 13 Ley 20.900 — Gastos PROHIBIDOS con aporte estatal */
export const GASTOS_PROHIBIDOS_ART13 = [
  'multas',
  'deudas_preelectorales',
  'beneficios_personas_juridicas',
  'pagos_sin_respaldo_documental',
  'actividades_ajenas_al_partido',
  'gastos_ajenos_a_las_actividades_politicas',
] as const

/**
 * Dictamen CGR — El Fondo de Género (Art. 38 Ley 20.900) exige actividades
 * ESPECÍFICAS dirigidas a mujeres. El pago de sueldos de mujeres en funciones
 * generales NO cuenta. Deben ser actividades con programa, lista de asistentes e informe.
 */
export const GENERO_REQUIERE_ACTIVIDAD_ESPECIFICA = true
export const GENERO_DOCS_OBLIGATORIOS = [
  'programa_evento',
  'lista_asistentes_firmada',
  'informe_actividad',
] as const

// ════════════════════════════════════════════════════════════════════════
// SECCIÓN 2 — LEY 19.884: GASTO ELECTORAL
// ════════════════════════════════════════════════════════════════════════

/** Art. 6 Ley 19.884 — Límite de donación de persona natural a CAMPAÑA ELECTORAL */
export const DONACION_CAMPANA_MAX_UF    = 3_000
export const DONACION_CAMPANA_MAX_CLP   = DONACION_CAMPANA_MAX_UF * VALOR_UF // ~$121.326.000

/** Art. 17 Ley 19.884 — Personas jurídicas NO pueden aportar ni a partido ni a campaña */
export const PERSONAS_JURIDICAS_PROHIBIDAS = true

/** Art. 13 Ley 19.884 — Publicación obligatoria de donaciones sobre este monto */
export const DONACION_UMBRAL_PUBLICACION_UF  = 20
export const DONACION_UMBRAL_PUBLICACION_CLP = DONACION_UMBRAL_PUBLICACION_UF * VALOR_UF // ~$808.840

/** Art. 13 Ley 19.884 — Plazo de publicación: 10 días corridos desde la recepción */
export const DONACION_PLAZO_PUBLICACION_DIAS = 10

/** Art. 24 Ley 19.884 — Plazo para declarar gastos electorales a SERVEL */
export const GASTO_ELECTORAL_PLAZO_DECLARACION_DIAS_HABILES = 15

/** Art. 30 Ley 19.884 — Cuenta corriente exclusiva de campaña (obligatoria) */
export const CUENTA_CAMPANA_OBLIGATORIA = true

/** Límites de aporte de partido a candidato por tipo de cargo (Ley 19.884 Art. 35 + decretos) */
export const LIMITES_APORTE_CANDIDATO_UF: Record<string, number> = {
  presidencial: 10_000,
  senador:       3_000,
  diputado:      1_000,
  alcalde:         500,
  concejal:        200,
  gore:          3_000,
  core:            200,
}

// ════════════════════════════════════════════════════════════════════════
// SECCIÓN 3 — LEY 18.603: ORGANIZACIÓN DEL PARTIDO
// ════════════════════════════════════════════════════════════════════════

/**
 * Art. 39 bis Ley 18.603 — Prohibición de nepotismo.
 * No se puede contratar a cónyuge, conviviente civil o pariente hasta
 * 2° grado de consanguinidad o 1° de afinidad de miembros de la Directiva Central.
 *
 * Grados prohibidos:
 *  - Consanguinidad 1°: padres, hijos
 *  - Consanguinidad 2°: hermanos, abuelos, nietos
 *  - Afinidad 1°: cónyuge o conviviente civil + sus padres e hijos
 *
 * SANCIÓN: nulidad del contrato + obligación de devolver lo pagado + multa hasta 50 UTM
 */
export const GRADOS_PARENTESCO_PROHIBIDOS = {
  consanguinidad: [1, 2],  // 1° y 2° grado
  afinidad:       [1],     // 1° grado
}

/**
 * RUT de miembros de la Directiva Central PCCh (para validación antinepotismo).
 * DEBE ACTUALIZARSE cuando cambia la directiva.
 * Fuente: Declaración SERVEL Módulo 1 — actualizar con datos reales.
 */
export const DIRECTIVA_CENTRAL_RUTS: string[] = [
  // Agregar RUTs de la Directiva Central cuando estén disponibles
  // Ejemplo: '5.892.999-9', '5.926.570-9', etc.
]

// ════════════════════════════════════════════════════════════════════════
// SECCIÓN 4 — DS 1174/2016 SERVEL: RENDICIÓN DE CUENTAS
// ════════════════════════════════════════════════════════════════════════

/** DS 1174/2016 — Plazos de rendición trimestral (30 días corridos después del trimestre) */
export const PLAZOS_TRIMESTRALES_2026 = [
  { trimestre: 'Q1', inicio: '2026-01-01', fin: '2026-03-31', plazo: '2026-04-30', label: 'Q1 2026 (Ene–Mar)' },
  { trimestre: 'Q2', inicio: '2026-04-01', fin: '2026-06-30', plazo: '2026-07-31', label: 'Q2 2026 (Abr–Jun)' },
  { trimestre: 'Q3', inicio: '2026-07-01', fin: '2026-09-30', plazo: '2026-10-31', label: 'Q3 2026 (Jul–Sep)' },
  { trimestre: 'Q4', inicio: '2026-10-01', fin: '2026-12-31', plazo: '2027-01-31', label: 'Q4 2026 (Oct–Dic)' },
]

/** DS 1174/2016 — Balance anual: antes del 30 de abril del año siguiente */
export const BALANCE_ANUAL_PLAZO = '2027-04-30'

/** DS 1174/2016 — Módulos obligatorios de la rendición SERVEL */
export const MODULOS_SERVEL = [
  { id: 1,  nombre: 'Datos generales del partido',         periodicidad: 'anual'     },
  { id: 6,  nombre: 'Fuentes de financiamiento',           periodicidad: 'trimestral' },
  { id: 12, nombre: 'Gastos detallados',                   periodicidad: 'trimestral' },
  { id: 13, nombre: 'Donaciones recibidas',                periodicidad: 'trimestral' },
  { id: 14, nombre: 'Nómina de personal',                  periodicidad: 'trimestral' },
  { id: 15, nombre: 'Balance general',                     periodicidad: 'anual'     },
  { id: 16, nombre: 'Inventario activos fijos',            periodicidad: 'anual'     },
  { id: 17, nombre: 'Detalle préstamos y créditos',        periodicidad: 'trimestral' },
]

// ════════════════════════════════════════════════════════════════════════
// SECCIÓN 5 — DL 824 / DL 3.500: OBLIGACIONES TRIBUTARIAS Y PREVISIONALES
// ════════════════════════════════════════════════════════════════════════

/** Art. 74 N°2 DL 824 — Tasa de retención de honorarios */
export const TASA_RETENCION_HONORARIOS  = 0.1075

/** DL 824 — F29: vence el día 20 de cada mes (por honorarios del mes anterior) */
export const F29_DIA_VENCIMIENTO        = 20

/** DL 3.500 — PREVIRED: vence el día 10 de cada mes */
export const PREVIRED_DIA_VENCIMIENTO   = 10

/** DL 824 Art. 88 — Multa por no declarar F29: 10% del impuesto + 1,5% por cada mes de atraso */
export const F29_MULTA_BASE_PCT         = 0.10
export const F29_MULTA_MENSUAL_PCT      = 0.015

// ════════════════════════════════════════════════════════════════════════
// SECCIÓN 6 — LEY 21.719: PROTECCIÓN DE DATOS PERSONALES (2024)
// ════════════════════════════════════════════════════════════════════════

/** Ley 21.719 — La filiación política es un dato SENSIBLE (Art. 16) */
export const AFILIACION_DATO_SENSIBLE   = true

/** Ley 21.719 — Multa máxima por incumplimiento: 5.000 UTM */
export const MULTA_MAX_LEY21719_UTM     = 5_000

/** Ley 21.719 — El partido debe designar un Delegado de Protección de Datos (DPD) */
export const REQUIERE_DPD               = true

/** Ley 21.719 — Plazo de conservación de datos tributarios (nómina, contratos) */
export const PLAZO_CONSERVACION_DATOS_TRIBUTARIOS_AÑOS = 6

// ════════════════════════════════════════════════════════════════════════
// SECCIÓN 7 — FUNCIONES DE VALIDACIÓN
// ════════════════════════════════════════════════════════════════════════

export interface AlertaLegal {
  id:           string
  gravedad:     'critica' | 'advertencia' | 'info'
  titulo:       string
  descripcion:  string
  accion:       string
  ley:          string
  modulo:       string
  plazo?:       string
  monto?:       number
}

/** Valida si un sueldo supera el límite del Art. 5 Ley 20.900 */
export function validarSueldo(nombreFuncionario: string, sueldoBruto: number): AlertaLegal | null {
  if (sueldoBruto <= SUELDO_MAX_CLP) return null
  const exceso = sueldoBruto - SUELDO_MAX_CLP
  return {
    id:          `sueldo_exceso_${nombreFuncionario.replace(/\s/g, '_')}`,
    gravedad:    'critica',
    titulo:      `Sueldo excede límite legal — ${nombreFuncionario}`,
    descripcion: `Sueldo bruto: ${sueldoBruto.toLocaleString('es-CL', {style:'currency',currency:'CLP',maximumFractionDigits:0})} supera el límite de ${SUELDO_MAX_UF} UF = ${SUELDO_MAX_CLP.toLocaleString('es-CL', {style:'currency',currency:'CLP',maximumFractionDigits:0})}. Exceso: ${exceso.toLocaleString('es-CL', {style:'currency',currency:'CLP',maximumFractionDigits:0})}`,
    accion:      'Ajustar el sueldo al límite máximo de 60 UF. El exceso no puede imputarse al aporte estatal.',
    ley:         'Art. 5 Ley 20.900',
    modulo:      'personal',
    monto:       exceso,
  }
}

/** Valida si una donación al partido supera el límite del Art. 15 Ley 20.900 */
export function validarDonacionPartido(donante: string, acumuladoAnual: number): AlertaLegal | null {
  if (acumuladoAnual <= DONACION_PARTIDO_MAX_CLP) return null
  const exceso = acumuladoAnual - DONACION_PARTIDO_MAX_CLP
  return {
    id:          `donacion_exceso_${donante.replace(/\s/g, '_')}`,
    gravedad:    'critica',
    titulo:      `Donación al partido excede límite — ${donante}`,
    descripcion: `Acumulado anual: ${acumuladoAnual.toLocaleString('es-CL', {style:'currency',currency:'CLP',maximumFractionDigits:0})} supera ${DONACION_PARTIDO_MAX_UF} UF = ${DONACION_PARTIDO_MAX_CLP.toLocaleString('es-CL', {style:'currency',currency:'CLP',maximumFractionDigits:0})}. El exceso debe devolverse.`,
    accion:      'Devolver el exceso al donante. Registrar la devolución. Notificar a SERVEL.',
    ley:         'Art. 15 Ley 20.900',
    modulo:      'donaciones',
    monto:       exceso,
  }
}

/** Detecta donación de persona jurídica (prohibida) */
export function validarPersonaJuridica(donante: string, esJuridica: boolean): AlertaLegal | null {
  if (!esJuridica) return null
  return {
    id:          `persona_juridica_${donante.replace(/\s/g, '_')}`,
    gravedad:    'critica',
    titulo:      `INFRACCIÓN — Donación de persona jurídica: ${donante}`,
    descripcion: 'Las personas jurídicas (empresas, fundaciones, corporaciones) tienen PROHIBICIÓN ABSOLUTA de aportar a partidos o campañas.',
    accion:      'Devolver el monto íntegro inmediatamente. Reportar a SERVEL. Posibles consecuencias penales para el representante legal.',
    ley:         'Art. 17 Ley 19.884 + Art. 16 Ley 20.900',
    modulo:      'donaciones',
  }
}

/** Calcula días hasta el próximo F29 (día 20 del mes actual).
 *  Retorna valor negativo si ya venció — activa alerta "VENCIDO" en alertaF29(). */
export function diasHastaf29(): number {
  const hoy = new Date()
  const año = hoy.getFullYear()
  const mes = hoy.getMonth() // 0-indexed — NO sumar 1
  // Vencimiento = día 20 del mes en curso
  const vencimiento = new Date(año, mes, F29_DIA_VENCIMIENTO)
  // Si ya pasó el día 20: retorna negativo (vencido). días 1-20: positivo.
  return Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
}

/** Calcula días hasta el próximo PREVIRED */
export function diasHastaPrevired(): number {
  const hoy = new Date()
  const año = hoy.getFullYear()
  const mes = hoy.getMonth()
  let vencimiento = new Date(año, mes, PREVIRED_DIA_VENCIMIENTO)
  if (vencimiento <= hoy) vencimiento = new Date(año, mes + 1, PREVIRED_DIA_VENCIMIENTO)
  const diff = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

/** Calcula días hasta la próxima rendición trimestral SERVEL */
export function proximaRendicionServel(): { trimestre: string; plazo: string; diasRestantes: number } | null {
  const hoy = new Date()
  for (const t of PLAZOS_TRIMESTRALES_2026) {
    const plazo = new Date(t.plazo)
    if (plazo >= hoy) {
      const diff = Math.ceil((plazo.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
      return { trimestre: t.label, plazo: t.plazo, diasRestantes: diff }
    }
  }
  return null
}

/** Calcula el cumplimiento del Fondo de Género */
export function cumplimientoGenero(gastoGenero: number, aporteEstatal: number): {
  pct: number; cuota: number; deficit: number; enRiesgo: boolean
} {
  const cuota   = aporteEstatal * GENERO_PCT_MINIMO
  const pct     = cuota > 0 ? Math.round((gastoGenero / cuota) * 100) : 0
  const deficit = Math.max(cuota - gastoGenero, 0)
  return { pct, cuota, deficit, enRiesgo: pct < 100 }
}

/** Valida acreedor de préstamo según Art. 14 Ley 20.900 */
export function validarAcreedor(tipo: string, nombre: string): AlertaLegal | null {
  const tipos = TIPOS_ACREEDOR_LEGAL as readonly string[]
  if (tipos.includes(tipo)) return null
  return {
    id:          `acreedor_ilegal_${nombre.replace(/\s/g, '_')}`,
    gravedad:    'critica',
    titulo:      `Préstamo de acreedor no autorizado — ${nombre}`,
    descripcion: `El tipo de acreedor "${tipo}" no está permitido por ley. Solo bancos, cooperativas de ahorro y cajas de compensación pueden prestar a partidos políticos.`,
    accion:      'Regularizar el préstamo con una institución financiera autorizada CMF. Consultar abogado del partido.',
    ley:         'Art. 14 Ley 20.900',
    modulo:      'deuda',
  }
}

/** Genera alerta de F29 según días restantes */
export function alertaF29(diasRestantes: number, montoRetencion: number): AlertaLegal | null {
  if (diasRestantes > 10) return null
  const nivel = diasRestantes <= 0 ? 'critica' : diasRestantes <= 3 ? 'critica' : 'advertencia'
  return {
    id:          'f29_vencimiento',
    gravedad:    nivel,
    titulo:      diasRestantes <= 0
      ? 'F29 VENCIDO — Multa e intereses acumulando'
      : `F29 vence en ${diasRestantes} día${diasRestantes === 1 ? '' : 's'}`,
    descripcion: `Retención de honorarios a declarar: ${montoRetencion.toLocaleString('es-CL', {style:'currency',currency:'CLP',maximumFractionDigits:0})}. ${diasRestantes <= 0 ? 'Ya venció el día 20. Cada mes de atraso agrega 1,5% de multa sobre el impuesto.' : ''}`,
    accion:      diasRestantes <= 0
      ? 'Declarar y pagar F29 inmediatamente en sii.cl. Calcular multa acumulada.'
      : 'Preparar y declarar F29 antes del día 20 en sii.cl (Código 92 retención honorarios).',
    ley:         'Art. 74 N°2 DL 824 (Ley de la Renta)',
    modulo:      'retenciones',
    plazo:       `Día 20 de este mes`,
    monto:       montoRetencion,
  }
}

/** Genera alerta de rendición SERVEL según días restantes */
export function alertaRendicionServel(diasRestantes: number, trimestre: string): AlertaLegal | null {
  if (diasRestantes > 30) return null
  const nivel = diasRestantes <= 5 ? 'critica' : 'advertencia'
  return {
    id:          `rendicion_servel_${trimestre}`,
    gravedad:    nivel,
    titulo:      diasRestantes <= 0
      ? `RENDICIÓN SERVEL VENCIDA — ${trimestre}`
      : `Rendición SERVEL ${trimestre} vence en ${diasRestantes} días`,
    descripcion: `Módulos 6, 12, 13, 14 y 17 deben estar completos y publicados en el portal SERVEL. El incumplimiento suspende el pago del aporte estatal.`,
    accion:      'Completar todos los módulos en portaltransparencia.servel.cl y publicar dentro del plazo.',
    ley:         'Art. 33 Ley 20.900 + DS 1174/2016 SERVEL',
    modulo:      'datos',
    plazo:       trimestre,
  }
}

/** Genera alerta de Fondo de Género */
export function alertaFondoGenero(pct: number, deficit: number, mes: number): AlertaLegal | null {
  if (pct >= 100) return null
  const mesesRestantes = 12 - mes
  const nivel = pct < 30 ? 'critica' : 'advertencia'
  return {
    id:          'fondo_genero_incumplimiento',
    gravedad:    nivel,
    titulo:      `Fondo de Género: ${pct}% ejecutado — cuota incumplida`,
    descripcion: `Déficit: ${deficit.toLocaleString('es-CL', {style:'currency',currency:'CLP',maximumFractionDigits:0})}. Quedan ${mesesRestantes} meses para completar el 10% del aporte estatal en actividades de fomento a la participación femenina (programa + lista asistentes + informe requeridos por dictamen CGR).`,
    accion:      `Programar actividades de género por al menos ${Math.ceil(deficit / Math.max(mesesRestantes, 1)).toLocaleString('es-CL', {style:'currency',currency:'CLP',maximumFractionDigits:0})}/mes. El incumplimiento implica rechazo del balance anual por SERVEL.`,
    ley:         'Art. 38 Ley 20.900 + Dictamen CGR',
    modulo:      'genero',
    monto:       deficit,
  }
}

/** Detecta si un RUT corresponde a una persona jurídica (heurística básica) */
export function detectarPersonaJuridica(rut: string): { esJuridica: boolean; confianza: 'alta' | 'media' | 'baja' } {
  const limpio = rut.replace(/\./g, '').replace(/-/g, '').toLowerCase()
  const numeroStr = limpio.endsWith('k') ? limpio.slice(0, -1) : limpio.slice(0, -1)
  const numero = parseInt(numeroStr)

  // RUTs < 1.000.000: personas naturales antiguas (jubilados, extranjeros)
  // RUTs 1.000.001–60.000.000: personas naturales
  // RUTs 60.000.001–79.999.999: empresas
  // RUTs 80.000.000–99.999.999: fundaciones, corporaciones, organismos del Estado
  if (isNaN(numero)) return { esJuridica: false, confianza: 'baja' }
  if (numero >= 60_000_001) return { esJuridica: true, confianza: 'alta' }
  if (numero <= 60_000_000) return { esJuridica: false, confianza: 'alta' }
  return { esJuridica: false, confianza: 'media' }
}

// ════════════════════════════════════════════════════════════════════════
// SECCIÓN 8 — GENERADOR CENTRALIZADO DE ALERTAS
// ════════════════════════════════════════════════════════════════════════

export interface ResumenCompliance {
  total:        number
  criticas:     number
  advertencias: number
  info:         number
  alertas:      AlertaLegal[]
}

/**
 * Genera todas las alertas activas del sistema.
 * Llamar con los datos actuales de cada módulo.
 */
export function generarAlertasCompliance(datos: {
  funcionarios:       Array<{ nombre: string; sueldo: number }>
  donaciones:         Array<{ donante: string; esJuridica: boolean; acumuladoAnual: number }>
  prestamos:          Array<{ nombre: string; tipo: string }>
  gastoGenero:        number
  aporteEstatal:      number
  retencionPendiente: number
  directivaCentral:   string[]  // RUTs de la directiva
}): ResumenCompliance {
  const alertas: AlertaLegal[] = []

  // 1. Sueldos sobre límite (Art. 5 Ley 20.900)
  for (const f of datos.funcionarios) {
    const a = validarSueldo(f.nombre, f.sueldo)
    if (a) alertas.push(a)
  }

  // 2. Donaciones personas jurídicas (Art. 16/17)
  for (const d of datos.donaciones) {
    const a1 = validarPersonaJuridica(d.donante, d.esJuridica)
    if (a1) alertas.push(a1)
    const a2 = validarDonacionPartido(d.donante, d.acumuladoAnual)
    if (a2) alertas.push(a2)
  }

  // 3. Préstamos ilegales (Art. 14 Ley 20.900)
  for (const p of datos.prestamos) {
    const a = validarAcreedor(p.tipo, p.nombre)
    if (a) alertas.push(a)
  }

  // 4. Fondo de Género (Art. 38 Ley 20.900)
  const genero = cumplimientoGenero(datos.gastoGenero, datos.aporteEstatal)
  const aGenero = alertaFondoGenero(genero.pct, genero.deficit, MES_ACTUAL)
  if (aGenero) alertas.push(aGenero)

  // 5. F29 vencimiento (Art. 74 N°2 DL 824)
  const diasF29 = diasHastaf29()
  const aF29 = alertaF29(diasF29, datos.retencionPendiente)
  if (aF29) alertas.push(aF29)

  // 6. Rendición SERVEL (Art. 33 Ley 20.900)
  const rendicion = proximaRendicionServel()
  if (rendicion) {
    const aRendicion = alertaRendicionServel(rendicion.diasRestantes, rendicion.trimestre)
    if (aRendicion) alertas.push(aRendicion)
  }

  // Ordenar por gravedad
  const orden = { critica: 0, advertencia: 1, info: 2 }
  alertas.sort((a, b) => orden[a.gravedad] - orden[b.gravedad])

  return {
    total:        alertas.length,
    criticas:     alertas.filter(a => a.gravedad === 'critica').length,
    advertencias: alertas.filter(a => a.gravedad === 'advertencia').length,
    info:         alertas.filter(a => a.gravedad === 'info').length,
    alertas,
  }
}
