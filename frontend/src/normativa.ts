/**
 * normativa.ts — Motor de Reglas Legales FinParty
 * ══════════════════════════════════════════════════
 * Centraliza TODA la normativa que rige a los partidos políticos en Chile.
 * Cada constante y función cita la fuente legal exacta con el texto refundido vigente.
 *
 * ─── TEXTOS REFUNDIDOS VIGENTES (BCN) ───────────────────────────────────────
 *   DFL N°4/2017   — Texto refundido Ley 18.603 — Partidos Políticos
 *                    Últ. modificación: Ley 21.311 (D.O. 16/02/2021)
 *   DFL N°3/2017   — Texto refundido Ley 19.884 — Gasto Electoral
 *                    Últ. modificación: Ley 21.693 (D.O. 26/08/2024)
 *
 * ─── LEYES COMPLEMENTARIAS ──────────────────────────────────────────────────
 *   Ley 20.900/2016  — Fortalecimiento y Transparencia de la Democracia
 *   Ley 20.915/2016  — Democratización interna de los partidos
 *   Ley 21.311/2021  — Modifica DFL N°4 (afiliación electrónica, elecciones internas)
 *   Ley 21.693/2024  — Modifica DFL N°3 (última reforma gasto electoral)
 *   Ley 19.885/2003  — Donaciones con franquicia tributaria
 *   Ley 20.880/2016  — Probidad en la función pública
 *   Ley 21.719/2024  — Protección de Datos Personales
 *   Constitución Política — Arts. 15, 19 N°15, 23, 62
 *
 * ─── NORMATIVA ADMINISTRATIVA ────────────────────────────────────────────────
 *   DS 1174/2016 SERVEL — Reglamento Rendición de Cuentas
 *   Instrucción SERVEL 2019 — Norma contable IFRS-PYME
 *   Res. exenta N°237/2026 Sup. Pensiones — Tope imponible AFP/Salud (90 UF)
 *   DL 824    — Ley de la Renta (Art. 74 N°2 retención honorarios)
 *   DL 3.500  — AFP / Sistema Previsional
 *   Ley 16.744 — Seguro Accidentes del Trabajo
 *   Ley 19.728 — Seguro de Cesantía
 *
 * ─── ADVERTENCIA ─────────────────────────────────────────────────────────────
 *   Documento de referencia — verificar textos en www.bcn.cl/leychile
 *   Fuentes: BCN · SERVEL · IIDH/CAPEL — Versión 2024 (actualizada junio 2025)
 */

import { VALOR_UF, MES_ACTUAL } from './utils'

// ════════════════════════════════════════════════════════════════════════
// SECCIÓN 0 — MARCO NORMATIVO GENERAL (referencia)
// ════════════════════════════════════════════════════════════════════════

/**
 * Instrumentos normativos principales del sistema de regulación de
 * partidos políticos en Chile (orden de jerarquía normativa).
 */
export const MARCO_NORMATIVO = [
  { instrumento: 'Constitución Política de la República', arts: 'Arts. 15, 19 N°15, 23, 62', materia: 'Libertad de asociación política; prohibiciones; incompatibilidades parlamentarias' },
  { instrumento: 'DFL N°4/2017 (texto refundido Ley 18.603)', vigencia: 'D.O. 06/09/2017 — últ. mod. Ley 21.311 (16/02/2021)', materia: 'Organización, constitución, financiamiento y transparencia de partidos políticos' },
  { instrumento: 'DFL N°3/2017 (texto refundido Ley 19.884)', vigencia: 'D.O. 06/09/2017 — últ. mod. Ley 21.693 (26/08/2024)', materia: 'Transparencia, límite y control del gasto electoral; cuenta general de ingresos y gastos' },
  { instrumento: 'Ley 20.900/2016', vigencia: 'D.O. 14/04/2016', materia: 'Financiamiento público permanente; prohibición aportes de personas jurídicas' },
  { instrumento: 'Ley 20.915/2016', vigencia: 'D.O. 15/04/2016', materia: 'Democracia interna; elecciones primarias; paridad; transparencia interna' },
  { instrumento: 'Ley 21.311/2021', vigencia: 'D.O. 16/02/2021', materia: 'Afiliación electrónica; elecciones internas; ajustes al DFL N°4' },
  { instrumento: 'Ley 21.693/2024', vigencia: 'D.O. 26/08/2024', materia: 'Última reforma al DFL N°3 sobre gasto electoral' },
  { instrumento: 'Resoluciones e Instrucciones SERVEL', vigencia: 'Periódicas desde 2016', materia: 'Plan de cuentas IFRS-PYME; instructivos de rendición; normas contables' },
] as const

// ════════════════════════════════════════════════════════════════════════
// SECCIÓN 1 — NATURALEZA JURÍDICA DEL PARTIDO (Art. 1, DFL N°4/2017)
// ════════════════════════════════════════════════════════════════════════

/**
 * Art. 1 DFL N°4/2017 — Persona jurídica de derecho público con autonomía privada.
 *
 * CONSECUENCIAS RELEVANTES:
 * - El personal NO es funcionario público → rige el Código del Trabajo
 * - No aplica Estatuto Administrativo ni escalas de remuneración del sector público
 * - Contratan libremente pero con límite "valor de mercado" (Art. 45 DFL N°4)
 */
export const NATURALEZA_JURIDICA = 'persona_juridica_derecho_publico' as const
export const PERSONAL_ES_FUNCIONARIO_PUBLICO = false

// ════════════════════════════════════════════════════════════════════════
// SECCIÓN 2 — FINANCIAMIENTO PÚBLICO (Arts. 40-43, DFL N°4/2017)
// ════════════════════════════════════════════════════════════════════════

/**
 * Art. 40 DFL N°4/2017 — Aporte público trimestral del Estado.
 * El SERVEL entrega 0,02 UF por cada voto obtenido en la última elección
 * parlamentaria, distribuido en cuatro pagos trimestrales iguales.
 */
export const APORTE_PUBLICO_UF_POR_VOTO = 0.02   // 0,02 UF × votos última elección parlamentaria

/**
 * Art. 17 DFL N°3/2017 — Reembolso fiscal post-electoral.
 * 0,04 UF por voto obtenido en la elección que genera el gasto.
 */
export const REEMBOLSO_FISCAL_UF_POR_VOTO = 0.04

/**
 * Art. 40 DFL N°4/2017 — Usos PERMITIDOS del aporte público trimestral.
 * Las remuneraciones son un gasto válido con aporte estatal, pero deben
 * rendirse detalladamente ante el SERVEL con documentación de respaldo
 * conservada por 5 años.
 */
export const USOS_PERMITIDOS_APORTE_PUBLICO = [
  'remuneraciones_formacion_civica',
  'remuneraciones_preparacion_candidatos',
  'remuneraciones_formacion_militantes',
  'remuneraciones_estudios_politicas',
  'remuneraciones_difusion_principios',
  'remuneraciones_fomento_femenino',
  'remuneraciones_fomento_jovenes',
  'gastos_administracion_partido',
  'actividades_educacion_civica',
  'actividades_investigacion',
  'bienes_servicios_operacionales',
] as const

/**
 * Art. 40 DFL N°4/2017 — Gastos PROHIBIDOS con aporte estatal (no imputables).
 */
export const GASTOS_PROHIBIDOS_APORTE_PUBLICO = [
  'gastos_electorales_campana',      // El aporte público NO puede usarse en campaña electoral
  'multas_y_sanciones',
  'deudas_preelectorales',
  'aportes_a_candidatos_individualmente', // El partido puede apoyar, pero no con aporte público
  'pagos_sin_respaldo_documental',
  'actividades_ajenas_al_partido',
] as const

/** Compatibilidad con código legacy — categorías permitidas */
export const GASTOS_PERMITIDOS_ART12 = [
  'personal', 'honorarios', 'bienes_servicios', 'otros_admin',
  'investigacion', 'educacion_civica', 'formacion', 'genero',
  'juvenil', 'preparacion_candidatos', 'activo_fijo', 'campana',
  'prestamos', 'transferencias',
] as const

/** Compatibilidad legacy — gastos prohibidos */
export const GASTOS_PROHIBIDOS_ART13 = [
  'multas',
  'deudas_preelectorales',
  'beneficios_personas_juridicas',
  'pagos_sin_respaldo_documental',
  'actividades_ajenas_al_partido',
  'gastos_ajenos_a_las_actividades_politicas',
] as const

// ════════════════════════════════════════════════════════════════════════
// SECCIÓN 3 — APORTES PRIVADOS Y DONACIONES (Arts. 39, DFL N°4/2017)
// ════════════════════════════════════════════════════════════════════════

/**
 * Art. 39 DFL N°4/2017 — Topes de donación al partido (fuente de financiamiento).
 *
 * DISTINCIÓN CRÍTICA:
 *   Afiliado al partido:     máximo 500 UF anuales
 *   No afiliado al partido:  máximo 300 UF anuales
 */
export const DONACION_PARTIDO_MAX_UF_AFILIADO    = 500  // Art. 39 DFL N°4/2017
export const DONACION_PARTIDO_MAX_UF_NO_AFILIADO = 300  // Art. 39 DFL N°4/2017
export const DONACION_PARTIDO_MAX_CLP_AFILIADO    = DONACION_PARTIDO_MAX_UF_AFILIADO    * VALOR_UF
export const DONACION_PARTIDO_MAX_CLP_NO_AFILIADO = DONACION_PARTIDO_MAX_UF_NO_AFILIADO * VALOR_UF

/** Compatibilidad legacy — usar DONACION_PARTIDO_MAX_UF_AFILIADO en nuevo código */
export const DONACION_PARTIDO_MAX_UF  = DONACION_PARTIDO_MAX_UF_AFILIADO
export const DONACION_PARTIDO_MAX_CLP = DONACION_PARTIDO_MAX_CLP_AFILIADO

/**
 * Art. 39 inc. final DFL N°4/2017 — Prohibiciones absolutas de financiamiento.
 * Sanción: pena penal para administradores + multa + nulidad del aporte.
 */
export const PERSONAS_JURIDICAS_PROHIBIDAS = true   // Prohibición absoluta — Ley 20.900 Art. 2
export const APORTES_EXTRANJEROS_PROHIBIDOS = true  // Art. 39 inc. final DFL N°4/2017

/**
 * Art. 10 DFL N°3/2017 — Tope GLOBAL por persona en elección.
 * (Este es el tope que una persona puede donar en total a candidatos + partido en la elección)
 */
export const TOPE_GLOBAL_APORTANTE_PRESIDENCIAL_UF  = 2_000  // Art. 10 DFL N°3/2017
export const TOPE_GLOBAL_APORTANTE_PARLAMENTARIO_UF = 2_000  // Art. 10 DFL N°3/2017
export const TOPE_GLOBAL_APORTANTE_MUNICIPAL_UF     = 1_000  // Art. 10 DFL N°3/2017

/**
 * Art. 13 DFL N°3/2017 — Topes de aportes sin publicidad (anónimos) por aportante.
 */
export const APORTE_SIN_PUBLICIDAD_PRESIDENCIAL_UF  = 40  // Art. 13 DFL N°3/2017
export const APORTE_SIN_PUBLICIDAD_PARLAMENTARIO_UF = 20  // Art. 13 DFL N°3/2017
export const APORTE_SIN_PUBLICIDAD_MUNICIPAL_UF     = 15  // Art. 13 DFL N°3/2017
export const APORTE_SIN_PUBLICIDAD_TOPE_ACUMULADO_UF = 120 // Art. 13 DFL N°3/2017 — tope total en elección

/**
 * Compatibilidad legacy — donación campaña.
 * CORRECCIÓN: el tope real es 2.000 UF por persona (Art. 10 DFL N°3), no 3.000.
 */
export const DONACION_CAMPANA_MAX_UF  = TOPE_GLOBAL_APORTANTE_PARLAMENTARIO_UF  // 2.000 UF
export const DONACION_CAMPANA_MAX_CLP = DONACION_CAMPANA_MAX_UF * VALOR_UF

/** Art. 13 DFL N°3/2017 — Publicación obligatoria de donaciones sobre este monto */
export const DONACION_UMBRAL_PUBLICACION_UF  = 20
export const DONACION_UMBRAL_PUBLICACION_CLP = DONACION_UMBRAL_PUBLICACION_UF * VALOR_UF
export const DONACION_PLAZO_PUBLICACION_DIAS = 10

// ════════════════════════════════════════════════════════════════════════
// SECCIÓN 4 — CRÉDITOS Y ACREEDORES (Art. 39 f) DFL N°4/2017)
// ════════════════════════════════════════════════════════════════════════

/**
 * Art. 39 letra f) DFL N°4/2017 + Arts. 19 y 21 DFL N°3/2017.
 * Solo pueden otorgar créditos a partidos:
 *   - Bancos (regulados por CMF)
 *   - Cooperativas de ahorro y crédito
 *   - Cajas de compensación y asignación familiar
 *
 * Backend analytics.py usa: {"banco","cooperativa","caja_compensacion"}
 */
export const TIPOS_ACREEDOR_LEGAL = ['banco', 'cooperativa', 'caja_compensacion'] as const

/**
 * Art. 47 DFL N°4/2017 — Inversión del patrimonio financiero proveniente
 * del aporte público. Solo instrumentos de renta fija:
 *   - Bonos del Banco Central de Chile
 *   - Depósitos a plazo bancarios
 *   - Fondos mutuos no calificados de renta fija
 */
export const INVERSIONES_PERMITIDAS = [
  'bonos_banco_central',
  'depositos_plazo_bancarios',
  'fondos_mutuos_renta_fija',
] as const

// ════════════════════════════════════════════════════════════════════════
// SECCIÓN 5 — REMUNERACIONES Y CONTRATOS (Art. 45, DFL N°4/2017)
// ════════════════════════════════════════════════════════════════════════

/**
 * Art. 45 DFL N°4/2017 — Regla general de contratación.
 *
 * "Los actos y contratos que celebren los partidos políticos se ajustarán
 *  a las condiciones normales del mercado."
 *
 * ⚠️  ADVERTENCIA LEGAL: NO EXISTE en el DFL N°4/2017 un límite nominal de
 * remuneración expresado en UF. El único estándar es "valor de mercado"
 * para el cargo específico (Art. 45). La cifra de "60 UF" que circuló en
 * versiones anteriores de este sistema NO tiene base legal en el texto vigente.
 *
 * El SERVEL puede objetar sueldos que superen significativamente el valor
 * de mercado del cargo durante la auditoría del balance anual (Art. 44).
 *
 * Fuente: normativa_partidos_politicos_chile.docx — Sección IV.B / Advertencia XI.
 */
export const SUELDO_ESTANDAR_MERCADO = true        // Art. 45 DFL N°4/2017 — único estándar legal
export const SUELDO_LIMITE_NOMINAL_EXISTE = false  // No existe límite numérico en la ley

/**
 * Compatibilidad — el validador de sueldo se mantiene pero ahora advierte
 * sobre el estándar de mercado en lugar de un límite rígido inexistente.
 * Se usa el tope imponible previsional (90 UF) como referencia de facto.
 */
export const SUELDO_REFERENCIA_UF   = 90           // Res. 237/2026 — tope imponible AFP/Salud
export const SUELDO_REFERENCIA_CLP  = SUELDO_REFERENCIA_UF * VALOR_UF

/** Compatibilidad legacy — evitar romper componentes existentes */
export const SUELDO_MAX_UF  = SUELDO_REFERENCIA_UF
export const SUELDO_MAX_CLP = SUELDO_REFERENCIA_CLP

/**
 * Art. 49 letra h) DFL N°4/2017 — Publicación obligatoria y permanente
 * de remuneraciones en el sitio web del partido.
 */
export const PUBLICACION_REMUNERACIONES_OBLIGATORIA = true

// ════════════════════════════════════════════════════════════════════════
// SECCIÓN 6 — OBLIGACIONES PREVISIONALES DEL PERSONAL
// ════════════════════════════════════════════════════════════════════════

/**
 * Res. exenta N°237/2026 Superintendencia de Pensiones — vigente desde 01/02/2026.
 * Base imponible máxima para cotizaciones previsionales (AFP + Salud + Accidentes).
 */
export const TOPE_IMPONIBLE_UF = 90.0    // 90,0 UF mensuales desde 01/02/2026

/**
 * DL 3.500/1980 — Cotización AFP obligatoria
 * (tasa varía por AFP; usar 10% como base mínima legal)
 */
export const TASA_AFP_OBLIGATORIA   = 0.10   // 10% base imponible (art. 17 DL 3.500)

/**
 * DL 3.500 + FONASA/ISAPRE — Cotización salud
 */
export const TASA_SALUD_OBLIGATORIA = 0.07   // 7% base imponible

/**
 * Ley 19.728 — Seguro de Cesantía
 */
export const TASA_CESANTIA_EMPLEADOR = 0.024  // 2,4% a cargo del empleador
export const TASA_CESANTIA_TRABAJADOR = 0.006 // 0,6% a cargo del trabajador

/**
 * Ley 16.744 — Seguro de Accidentes del Trabajo (tasa base actividad administrativa)
 */
export const TASA_MUTUAL_BASE = 0.0093   // 0,93% aproximado actividad administrativa

// ════════════════════════════════════════════════════════════════════════
// SECCIÓN 7 — TRANSPARENCIA Y RENDICIÓN DE CUENTAS
//             (Arts. 41, 44, 49, DFL N°4/2017 + DS 1174/2016 SERVEL)
// ════════════════════════════════════════════════════════════════════════

/**
 * Art. 41 DFL N°4/2017 — Libros contables obligatorios.
 * Desde ejercicio 2019: norma IFRS-PYME exigida por Instrucción SERVEL 2019.
 */
export const NORMA_CONTABLE_EXIGIDA = 'IFRS-PYME'  // Instrucción SERVEL 28/03/2019
export const NORMA_CONTABLE_DESDE_ANIO = 2019

/**
 * Art. 44 DFL N°4/2017 — Balance anual y revisión SERVEL.
 * Los partidos practican un balance anual y lo presentan al SERVEL antes del 30 de abril.
 */
export const BALANCE_ANUAL_PLAZO = '2027-04-30'   // Art. 44 DFL N°4/2017

/**
 * Art. 47 DFL N°3/2017 — Cuenta general de ingresos y gastos electorales.
 * Plazo: 60 días CORRIDOS desde la elección (no días hábiles).
 */
export const RENDICION_CUENTA_ELECTORAL_DIAS = 60   // Art. 47 DFL N°3/2017 — días corridos

/**
 * DS 1174/2016 SERVEL — Genera plazos de rendición trimestral para cualquier año.
 * Plazo: 30 días corridos después del cierre del trimestre.
 */
export function generarPlazosTrimestrales(anio: number) {
  return [
    { trimestre: 'Q1', inicio: `${anio}-01-01`, fin: `${anio}-03-31`, plazo: `${anio}-04-30`, label: `Q1 ${anio} (Ene–Mar)` },
    { trimestre: 'Q2', inicio: `${anio}-04-01`, fin: `${anio}-06-30`, plazo: `${anio}-07-31`, label: `Q2 ${anio} (Abr–Jun)` },
    { trimestre: 'Q3', inicio: `${anio}-07-01`, fin: `${anio}-09-30`, plazo: `${anio}-10-31`, label: `Q3 ${anio} (Jul–Sep)` },
    { trimestre: 'Q4', inicio: `${anio}-10-01`, fin: `${anio}-12-31`, plazo: `${anio + 1}-01-31`, label: `Q4 ${anio} (Oct–Dic)` },
  ]
}

/** Plazos del año en curso — evaluado dinámicamente */
export const PLAZOS_TRIMESTRALES_2026 = generarPlazosTrimestrales(new Date().getFullYear())

/** Alias dinámico para uso en componentes */
export const PLAZOS_TRIMESTRALES_VIGENTES = PLAZOS_TRIMESTRALES_2026

/** DS 1174/2016 — Módulos obligatorios de la rendición SERVEL */
export const MODULOS_SERVEL = [
  { id: 1,  nombre: 'Datos generales del partido',         periodicidad: 'anual'      },
  { id: 6,  nombre: 'Fuentes de financiamiento',           periodicidad: 'trimestral' },
  { id: 12, nombre: 'Gastos detallados',                   periodicidad: 'trimestral' },
  { id: 13, nombre: 'Donaciones recibidas',                periodicidad: 'trimestral' },
  { id: 14, nombre: 'Nómina de personal >20 UTM',         periodicidad: 'trimestral' },
  { id: 15, nombre: 'Balance general',                     periodicidad: 'anual'      },
  { id: 16, nombre: 'Inventario activos fijos',            periodicidad: 'anual'      },
  { id: 17, nombre: 'Detalle préstamos y créditos',        periodicidad: 'trimestral' },
]

/**
 * Art. 49 DFL N°4/2017 — Transparencia activa permanente obligatoria.
 * El partido debe mantener en su sitio web de forma permanente:
 */
export const TRANSPARENCIA_ACTIVA_OBLIGATORIA = [
  'estatutos_del_partido',
  'nomina_directiva_central_vigente',
  'remuneraciones_del_personal',        // Art. 49 letra h) — OBLIGATORIO
  'balance_anual_auditado',
  'cuenta_general_gastos_electorales',
  'nomina_afiliados_por_region',        // Art. 49 — actualización trimestral
  'declaracion_patrimonio_directivos',  // Ley 20.880 — directivos en comisión política
] as const

// ════════════════════════════════════════════════════════════════════════
// SECCIÓN 8 — FONDO DE GÉNERO (Art. 38 Ley 20.900)
// ════════════════════════════════════════════════════════════════════════

/**
 * Art. 38 Ley 20.900 — Mínimo Fondo de Género sobre el aporte estatal anual.
 * Dictamen CGR: requiere actividades ESPECÍFICAS dirigidas a mujeres con:
 *   - Programa del evento
 *   - Lista de asistentes firmada
 *   - Informe de actividad
 * El pago de sueldos de mujeres en funciones generales NO cuenta.
 */
export const GENERO_PCT_MINIMO                     = 0.10
export const GENERO_REQUIERE_ACTIVIDAD_ESPECIFICA  = true
export const GENERO_DOCS_OBLIGATORIOS = [
  'programa_evento',
  'lista_asistentes_firmada',
  'informe_actividad',
] as const

// ════════════════════════════════════════════════════════════════════════
// SECCIÓN 9 — LÍMITES DE GASTO ELECTORAL (DFL N°3/2017)
// ════════════════════════════════════════════════════════════════════════

/**
 * Art. 4 DFL N°3/2017 — Topes de gasto electoral por tipo de cargo.
 * (tope base en UF + variable por número de electores)
 */
export const TOPES_GASTO_ELECTORAL: Record<string, { base_uf: number; variable_desc: string; norma: string }> = {
  senador:        { base_uf: 1_500, variable_desc: '+0,02 UF × primeros 200.000 electores; +0,015 UF × siguientes 200k; +0,01 × resto', norma: 'Art. 4 inc. 1° DFL N°3/2017' },
  gobernador_reg: { base_uf: 1_500, variable_desc: 'Mismo tope que Senador', norma: 'Art. 4 inc. 1° DFL N°3/2017' },
  diputado:       { base_uf: 700,   variable_desc: '+0,015 UF × N° electores del distrito', norma: 'Art. 4 inc. 2° DFL N°3/2017' },
  alcalde:        { base_uf: 120,   variable_desc: '+0,03 UF × N° electores de la comuna', norma: 'Art. 4 inc. 3° DFL N°3/2017' },
  concejal:       { base_uf: 0,     variable_desc: 'Mitad del tope del alcalde respectivo', norma: 'Art. 4 inc. 3° DFL N°3/2017' },
  core:           { base_uf: 350,   variable_desc: '+0,01 UF × primeros 200k; +0,0075 × sig. 200k; +0,005 × resto', norma: 'Art. 4 inc. 4° DFL N°3/2017' },
  presidencial_1: { base_uf: 0,     variable_desc: '0,015 UF × total electores nacionales (1ª vuelta)', norma: 'Art. 4 inc. 5° DFL N°3/2017' },
  presidencial_2: { base_uf: 0,     variable_desc: '0,01 UF × total electores nacionales (2ª vuelta)', norma: 'Art. 4 inc. 5° DFL N°3/2017' },
}

/**
 * Art. 5 DFL N°3/2017 — Límite de gasto del partido como organización en campaña.
 * El partido puede gastar hasta 1/3 del total de gastos autorizados a sus candidatos.
 */
export const TOPE_GASTO_PARTIDO_FRACCION = 1 / 3  // Art. 5 DFL N°3/2017

/**
 * Compatibilidad legacy — aportes del partido a candidatos.
 * Estos son REFERENCIAS aproximadas; el tope real depende del cargo y electores.
 */
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
// SECCIÓN 10 — SANCIONES ADMINISTRATIVAS Y PENALES
//              (Arts. 65-66 DFL N°4/2017 + Art. 6 DFL N°3/2017 + Ley 20.900)
// ════════════════════════════════════════════════════════════════════════

/**
 * Arts. 65-66 DFL N°4/2017 — Sanciones al partido como organización.
 */
export const SANCIONES_ADMINISTRATIVAS = [
  { infraccion: 'No llevar libros contables',                      sancion: 'Multa 10-100 UTM',                               norma: 'Art. 65 DFL N°4/2017' },
  { infraccion: 'No presentar balance al SERVEL',                  sancion: 'Suspensión del aporte trimestral',               norma: 'Art. 42 DFL N°4/2017' },
  { infraccion: 'Destinar fondos públicos a fines electorales',    sancion: 'Multa + reintegro + suspensión aporte',          norma: 'Art. 40 + Art. 65 DFL N°4/2017' },
  { infraccion: 'Recibir aportes de personas jurídicas',           sancion: 'Multa + pena penal a administradores',           norma: 'Art. 66 DFL N°4/2017 + Ley 20.900' },
  { infraccion: 'No publicar información de transparencia activa', sancion: 'Multa; puede llegar a suspensión',               norma: 'Art. 65 DFL N°4/2017' },
  { infraccion: 'Contratos sobre valor de mercado',                sancion: 'Nulidad + multa + responsabilidad directivos',   norma: 'Art. 45 + Art. 65 DFL N°4/2017' },
  { infraccion: 'Reincidencia en infracciones graves',             sancion: 'Suspensión o disolución del partido',            norma: 'Art. 66 DFL N°4/2017' },
] as const

/**
 * Art. 6 DFL N°3/2017 — Multas por exceso de gasto electoral.
 */
export const MULTAS_EXCESO_GASTO = [
  { nivel: 'hasta_10pct',    descripcion: 'Exceso hasta 10% del tope',        multa: 'El doble del exceso',      norma: 'Art. 6 a) DFL N°3/2017' },
  { nivel: 'entre_10_25pct', descripcion: 'Exceso entre 10% y 25% del tope', multa: 'El triple del exceso',     norma: 'Art. 6 b) DFL N°3/2017' },
  { nivel: 'mas_25pct',      descripcion: 'Exceso mayor al 25% del tope',    multa: 'El quíntuple del exceso',  norma: 'Art. 6 c) DFL N°3/2017' },
] as const

/**
 * Ley 20.900 + DFL N°3/2017 — Sanciones penales.
 */
export const SANCIONES_PENALES = [
  { conducta: 'Aportes/recepción exceso >40% del tope',  pena_privativa: 'Presidio menor grado mín. a medio (61 días – 3 años 1 día)', pena_pecuniaria: 'Triple del monto', norma: 'Ley 20.900' },
  { conducta: 'Aportes de personas jurídicas',           pena_privativa: 'Presidio menor grado mín. a medio (61 días – 3 años 1 día)', pena_pecuniaria: 'Triple del monto', norma: 'Ley 20.900' },
  { conducta: 'AGF que entrega información falsa',       pena_privativa: 'Presidio menor grado máximo (3 años 1 día – 5 años)',        pena_pecuniaria: 'Multa',            norma: 'Ley 20.900' },
  { conducta: 'Actos dolosos en contabilidad',           pena_privativa: 'Inhabilidad 3-5 años cargos directivos',                    pena_pecuniaria: 'Multas duplicadas', norma: 'Art. 65 DFL N°4' },
  { conducta: 'Reincidencia dolosa Directiva Central',   pena_privativa: 'Inhabilidad 8 años cargos directivos',                      pena_pecuniaria: 'Disolución posible', norma: 'Art. 66 DFL N°4' },
] as const

// ════════════════════════════════════════════════════════════════════════
// SECCIÓN 11 — INHABILIDADES E INCOMPATIBILIDADES
//              (Arts. 18, 65-66 DFL N°4/2017 + Arts. 23, 62 CPR)
// ════════════════════════════════════════════════════════════════════════

/**
 * Art. 18 DFL N°4/2017 — Quiénes no pueden afiliarse a un partido político.
 * (Jueces, ministros de Corte, militares y carabineros en servicio activo,
 *  funcionarios del Ministerio Público, etc.)
 */
export const INHABILIDADES_AFILIACION = [
  'magistrados_poder_judicial',
  'ministros_tribunal_constitucional',
  'militares_activos_ffaa_carabineros',
  'funcionarios_ministerio_publico',
  'contralor_general_republica',
] as const

/**
 * Art. 39 bis DFL N°4/2017 — Prohibición de nepotismo.
 * No se puede contratar a cónyuge, conviviente civil o pariente hasta
 * 2° grado de consanguinidad o 1° de afinidad de la Directiva Central.
 *
 * SANCIÓN: nulidad del contrato + obligación de devolver lo pagado + multa hasta 50 UTM
 */
export const GRADOS_PARENTESCO_PROHIBIDOS = {
  consanguinidad: [1, 2],   // 1° (padres/hijos) y 2° (hermanos/abuelos/nietos)
  afinidad:       [1],      // 1° grado (padres/hijos del cónyuge o conviviente)
}

/**
 * RUT de miembros de la Directiva Central PCCh (validación antinepotismo).
 * Actualizar cuando cambie la directiva — fuente: Declaración SERVEL Módulo 1.
 */
export const DIRECTIVA_CENTRAL_RUTS: string[] = [
  // Completar con RUTs de la Directiva Central vigente
  // Ejemplo: '5892999-9', '5926570-9'
]

/**
 * Art. 23 CPR — Incompatibilidad cargos directivos gremiales y políticos.
 * Son incompatibles los cargos directivos superiores de organizaciones
 * gremiales con los cargos directivos superiores de partidos políticos.
 */
export const INCOMPATIBILIDAD_GREMIAL_POLITICA = true  // Art. 23 CPR

/**
 * Art. 65-66 DFL N°4/2017 — Inhabilidad para cargos directivos del partido
 * por infracciones graves (impuesta por SERVEL).
 */
export const INHABILIDAD_DIRECTIVOS_ANOS_MIN = 3   // Art. 65 DFL N°4 — infracciones dolosas
export const INHABILIDAD_DIRECTIVOS_ANOS_MAX = 5   // Art. 65 DFL N°4
export const INHABILIDAD_DIRECTIVA_REINCIDENCIA_ANOS = 8  // Art. 66 DFL N°4

// ════════════════════════════════════════════════════════════════════════
// SECCIÓN 12 — RÉGIMEN TRIBUTARIO (Arts. 48, DFL N°4/2017 + DL 824)
// ════════════════════════════════════════════════════════════════════════

/**
 * Art. 48 DFL N°4/2017 — Exenciones tributarias del partido.
 * Exentos de impuesto a herencias y donaciones (hasta 30 UTM).
 * Los aportes de campaña tampoco constituyen renta (Art. 11 DFL N°3).
 *
 * EXCEPCIÓN IMPORTANTE: Las REMUNERACIONES del personal SÍ constituyen
 * renta y tributan según reglas generales (Impuesto Único 2ª Categoría).
 */
export const PARTIDO_EXENTO_IMPUESTOS = true          // Art. 48 DFL N°4/2017
export const APORTES_CAMPANA_NO_CONSTITUYEN_RENTA = true  // Art. 11 DFL N°3/2017
export const REMUNERACIONES_PERSONAL_TRIBUTAN = true  // Art. 43 Ley de Renta — escala progresiva

/**
 * Ley 19.885 — Beneficio tributario para donantes personas naturales.
 * Rebaja de hasta el 50% del IGC sobre el monto donado (máx. 500 UF).
 */
export const BENEFICIO_TRIBUTARIO_DONANTE_PCT = 0.50  // 50% del IGC sobre monto donado
export const BENEFICIO_TRIBUTARIO_DONANTE_MAX_UF = 500 // Máximo 500 UF anuales por donante

/**
 * Art. 74 N°2 DL 824 — Tasa de retención de honorarios (BHE).
 * El partido, como receptor/pagador de la BHE, retiene el 10,75% del
 * honorario bruto y lo declara mensualmente en el F29.
 */
export const TASA_RETENCION_HONORARIOS = 0.1075    // Art. 74 N°2 DL 824

/** F29 — Vence el día 20 de cada mes (por retenciones del mes anterior) */
export const F29_DIA_VENCIMIENTO = 20

/** PREVIRED — Vence el día 10 de cada mes */
export const PREVIRED_DIA_VENCIMIENTO = 10

/**
 * DL 824 Art. 88 — Multa por no declarar F29.
 * 10% del impuesto adeudado + 1,5% adicional por cada mes de atraso.
 */
export const F29_MULTA_BASE_PCT    = 0.10   // 10% del impuesto adeudado
export const F29_MULTA_MENSUAL_PCT = 0.015  // 1,5% adicional por mes de atraso

// ════════════════════════════════════════════════════════════════════════
// SECCIÓN 13 — PROTECCIÓN DE DATOS PERSONALES (Ley 21.719/2024)
// ════════════════════════════════════════════════════════════════════════

/** Ley 21.719 — La filiación política es un dato SENSIBLE (Art. 16) */
export const AFILIACION_DATO_SENSIBLE = true

/** Ley 21.719 — Multa máxima por incumplimiento: 5.000 UTM */
export const MULTA_MAX_LEY21719_UTM = 5_000

/** Ley 21.719 — El partido debe designar un Delegado de Protección de Datos (DPD) */
export const REQUIERE_DPD = true

/**
 * Ley 21.719 — Plazo de conservación de datos.
 * Datos tributarios (nómina, contratos): 6 años.
 * Documentos de respaldo SERVEL: 5 años (DS 1174/2016).
 */
export const PLAZO_CONSERVACION_DATOS_TRIBUTARIOS_ANOS = 6   // Código Tributario
export const PLAZO_CONSERVACION_DOCS_SERVEL_ANOS       = 5   // DS 1174/2016

// ════════════════════════════════════════════════════════════════════════
// SECCIÓN 14 — FUNCIONES DE VALIDACIÓN
// ════════════════════════════════════════════════════════════════════════

export interface AlertaLegal {
  id:          string
  gravedad:    'critica' | 'advertencia' | 'info'
  titulo:      string
  descripcion: string
  accion:      string
  ley:         string
  modulo:      string
  plazo?:      string
  monto?:      number
}

/**
 * Valida si un sueldo supera el tope imponible previsional como referencia.
 *
 * NOTA LEGAL: El Art. 45 DFL N°4/2017 exige "valor de mercado" como único
 * estándar. No existe límite nominal de 60 UF en la ley. Esta función usa
 * el tope imponible (90 UF) como referencia de alerta, no como límite legal.
 */
export function validarSueldo(nombreFuncionario: string, sueldoBruto: number): AlertaLegal | null {
  if (sueldoBruto <= SUELDO_REFERENCIA_CLP) return null
  const exceso = sueldoBruto - SUELDO_REFERENCIA_CLP
  return {
    id:          `sueldo_exceso_${nombreFuncionario.replace(/\s/g, '_')}`,
    gravedad:    'advertencia',
    titulo:      `Sueldo supera tope imponible previsional — ${nombreFuncionario}`,
    descripcion: `Sueldo bruto ${sueldoBruto.toLocaleString('es-CL', {style:'currency',currency:'CLP',maximumFractionDigits:0})} supera ${SUELDO_REFERENCIA_UF} UF (tope imponible AFP/Salud desde 01/02/2026). El exceso de ${exceso.toLocaleString('es-CL', {style:'currency',currency:'CLP',maximumFractionDigits:0})} no tributa previsional pero el partido puede ser cuestionado si supera el "valor de mercado" del cargo (Art. 45 DFL N°4/2017).`,
    accion:      'Verificar que el sueldo corresponde al valor de mercado del cargo (Art. 45 DFL N°4/2017). No existe límite nominal en la ley, pero SERVEL puede objetar sueldos que excedan el valor de mercado durante la auditoría del balance anual.',
    ley:         'Art. 45 DFL N°4/2017 + Res. exenta N°237/2026 Sup. Pensiones',
    modulo:      'personal',
    monto:       exceso,
  }
}

/**
 * Valida si una donación al partido supera el límite legal según condición
 * de afiliado del donante.
 */
export function validarDonacionPartido(
  donante: string,
  acumuladoAnual: number,
  esAfiliado = true
): AlertaLegal | null {
  const tope    = esAfiliado ? DONACION_PARTIDO_MAX_CLP_AFILIADO : DONACION_PARTIDO_MAX_CLP_NO_AFILIADO
  const topeUF  = esAfiliado ? DONACION_PARTIDO_MAX_UF_AFILIADO  : DONACION_PARTIDO_MAX_UF_NO_AFILIADO
  if (acumuladoAnual <= tope) return null
  const exceso = acumuladoAnual - tope
  return {
    id:          `donacion_exceso_${donante.replace(/\s/g, '_')}`,
    gravedad:    'critica',
    titulo:      `Donación al partido excede límite — ${donante}`,
    descripcion: `Acumulado anual ${acumuladoAnual.toLocaleString('es-CL', {style:'currency',currency:'CLP',maximumFractionDigits:0})} supera ${topeUF} UF (${esAfiliado ? 'afiliado' : 'no afiliado'}). El exceso de ${exceso.toLocaleString('es-CL', {style:'currency',currency:'CLP',maximumFractionDigits:0})} debe devolverse.`,
    accion:      'Devolver el exceso al donante. Registrar la devolución con documentación. Notificar a SERVEL.',
    ley:         'Art. 39 DFL N°4/2017',
    modulo:      'donaciones',
    monto:       exceso,
  }
}

/** Detecta donación de persona jurídica (prohibida absolutamente) */
export function validarPersonaJuridica(donante: string, esJuridica: boolean): AlertaLegal | null {
  if (!esJuridica) return null
  return {
    id:          `persona_juridica_${donante.replace(/\s/g, '_')}`,
    gravedad:    'critica',
    titulo:      `INFRACCIÓN PENAL — Donación de persona jurídica: ${donante}`,
    descripcion: 'Las personas jurídicas (empresas, fundaciones, corporaciones, etc.) tienen PROHIBICIÓN ABSOLUTA de aportar a partidos o campañas. Pena: presidio menor grado mín. a medio para administradores + multa triple.',
    accion:      'Devolver el monto íntegro INMEDIATAMENTE. Reportar a SERVEL. Consultar abogado — posibles consecuencias penales para el representante legal del partido (AGF).',
    ley:         'Art. 39 DFL N°4/2017 + Art. 2 Ley 20.900',
    modulo:      'donaciones',
  }
}

/** Valida acreedor de préstamo según Art. 39 f) DFL N°4/2017 */
export function validarAcreedor(tipo: string, nombre: string): AlertaLegal | null {
  const tipos = TIPOS_ACREEDOR_LEGAL as readonly string[]
  if (tipos.includes(tipo)) return null
  return {
    id:          `acreedor_ilegal_${nombre.replace(/\s/g, '_')}`,
    gravedad:    'critica',
    titulo:      `Préstamo de acreedor no autorizado — ${nombre}`,
    descripcion: `El tipo de acreedor "${tipo}" no está permitido. Solo bancos, cooperativas de ahorro y crédito, y cajas de compensación pueden prestar a partidos políticos.`,
    accion:      'Regularizar el préstamo con una institución financiera autorizada. Consultar abogado del partido.',
    ley:         'Art. 39 letra f) DFL N°4/2017',
    modulo:      'deuda',
  }
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

/** Calcula días hasta el próximo F29 (día 20 del mes actual) */
export function diasHastaf29(): number {
  const hoy = new Date()
  const vencimiento = new Date(hoy.getFullYear(), hoy.getMonth(), F29_DIA_VENCIMIENTO)
  return Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
}

/** Calcula días hasta el próximo PREVIRED */
export function diasHastaPrevired(): number {
  const hoy = new Date()
  let vencimiento = new Date(hoy.getFullYear(), hoy.getMonth(), PREVIRED_DIA_VENCIMIENTO)
  if (vencimiento <= hoy) vencimiento = new Date(hoy.getFullYear(), hoy.getMonth() + 1, PREVIRED_DIA_VENCIMIENTO)
  return Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
}

/** Calcula días hasta la rendición trimestral SERVEL más crítica */
export function proximaRendicionServel(): { trimestre: string; plazo: string; diasRestantes: number } | null {
  const hoy = new Date()
  for (let i = PLAZOS_TRIMESTRALES_2026.length - 1; i >= 0; i--) {
    const t = PLAZOS_TRIMESTRALES_2026[i]
    const plazo = new Date(t.plazo)
    if (plazo < hoy) {
      const diff = Math.ceil((plazo.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
      if (diff >= -90) return { trimestre: t.label, plazo: t.plazo, diasRestantes: diff }
      break
    }
  }
  for (const t of PLAZOS_TRIMESTRALES_2026) {
    const plazo = new Date(t.plazo)
    if (plazo >= hoy) {
      const diff = Math.ceil((plazo.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
      return { trimestre: t.label, plazo: t.plazo, diasRestantes: diff }
    }
  }
  return null
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
      ? 'Declarar y pagar F29 inmediatamente en sii.cl. Calcular multa acumulada (10% base + 1,5%/mes).'
      : 'Preparar y declarar F29 antes del día 20 en sii.cl (Código 92 retención honorarios).',
    ley:         'Art. 74 N°2 DL 824 (Ley de la Renta)',
    modulo:      'retenciones',
    plazo:       'Día 20 de este mes',
    monto:       montoRetencion,
  }
}

/** Genera alerta de rendición SERVEL */
export function alertaRendicionServel(diasRestantes: number, trimestre: string): AlertaLegal | null {
  if (diasRestantes > 30) return null
  const nivel = diasRestantes <= 5 ? 'critica' : 'advertencia'
  return {
    id:          `rendicion_servel_${trimestre}`,
    gravedad:    nivel,
    titulo:      diasRestantes <= 0
      ? `RENDICIÓN SERVEL VENCIDA — ${trimestre}`
      : `Rendición SERVEL ${trimestre} vence en ${diasRestantes} días`,
    descripcion: `Módulos 6, 12, 13, 14 y 17 deben estar completos y publicados en el portal SERVEL. El incumplimiento suspende el pago del aporte estatal (Art. 42 DFL N°4/2017).`,
    accion:      'Completar todos los módulos en portaltransparencia.servel.cl y publicar dentro del plazo.',
    ley:         'Art. 42 + Art. 44 DFL N°4/2017 + DS 1174/2016 SERVEL',
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
    descripcion: `Déficit: ${deficit.toLocaleString('es-CL', {style:'currency',currency:'CLP',maximumFractionDigits:0})}. Quedan ${mesesRestantes} meses para completar el 10% del aporte estatal en actividades de fomento a la participación femenina (programa + lista asistentes + informe — dictamen CGR).`,
    accion:      `Programar actividades de género por al menos ${Math.ceil(deficit / Math.max(mesesRestantes, 1)).toLocaleString('es-CL', {style:'currency',currency:'CLP',maximumFractionDigits:0})}/mes. El incumplimiento implica rechazo del balance anual por SERVEL.`,
    ley:         'Art. 38 Ley 20.900 + Dictamen CGR',
    modulo:      'genero',
    monto:       deficit,
  }
}

/** Detecta si un RUT corresponde a una persona jurídica (heurística por rango) */
export function detectarPersonaJuridica(rut: string): { esJuridica: boolean; confianza: 'alta' | 'media' | 'baja' } {
  const limpio = rut.replace(/\./g, '').replace(/-/g, '').toLowerCase()
  const numeroStr = limpio.endsWith('k') ? limpio.slice(0, -1) : limpio.slice(0, -1)
  const numero = parseInt(numeroStr)
  if (isNaN(numero)) return { esJuridica: false, confianza: 'baja' }
  // RUTs ≥ 60.000.001: empresas, fundaciones, organismos
  if (numero >= 60_000_001) return { esJuridica: true, confianza: 'alta' }
  return { esJuridica: false, confianza: 'alta' }
}

// ════════════════════════════════════════════════════════════════════════
// SECCIÓN 15 — GENERADOR CENTRALIZADO DE ALERTAS
// ════════════════════════════════════════════════════════════════════════

export interface ResumenCompliance {
  total:        number
  criticas:     number
  advertencias: number
  info:         number
  alertas:      AlertaLegal[]
}

export function generarAlertasCompliance(datos: {
  funcionarios:       Array<{ nombre: string; sueldo: number }>
  donaciones:         Array<{ donante: string; esJuridica: boolean; acumuladoAnual: number; esAfiliado?: boolean }>
  prestamos:          Array<{ nombre: string; tipo: string }>
  gastoGenero:        number
  aporteEstatal:      number
  retencionPendiente: number
  directivaCentral:   string[]
}): ResumenCompliance {
  const alertas: AlertaLegal[] = []

  // 1. Sueldos sobre referencia previsional (Art. 45 DFL N°4/2017)
  for (const f of datos.funcionarios) {
    const a = validarSueldo(f.nombre, f.sueldo)
    if (a) alertas.push(a)
  }

  // 2. Donaciones: personas jurídicas y excesos de tope
  for (const d of datos.donaciones) {
    const a1 = validarPersonaJuridica(d.donante, d.esJuridica)
    if (a1) alertas.push(a1)
    const a2 = validarDonacionPartido(d.donante, d.acumuladoAnual, d.esAfiliado ?? true)
    if (a2) alertas.push(a2)
  }

  // 3. Préstamos de acreedores no autorizados (Art. 39 f) DFL N°4/2017)
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

  // 6. Rendición SERVEL (Art. 42 DFL N°4/2017)
  const rendicion = proximaRendicionServel()
  if (rendicion) {
    const aRendicion = alertaRendicionServel(rendicion.diasRestantes, rendicion.trimestre)
    if (aRendicion) alertas.push(aRendicion)
  }

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
