/**
 * api.ts — Cliente HTTP para FinParty API
 * Si VITE_API_URL está definida, llama al backend local.
 * Si no, retorna null (el componente usa datos hardcodeados como fallback).
 */

const BASE = import.meta.env.VITE_API_URL as string | undefined

/** true cuando hay backend configurado */
export const API_DISPONIBLE = Boolean(BASE)

async function get<T>(ruta: string): Promise<T | null> {
  if (!BASE) return null
  try {
    const res = await fetch(`${BASE}${ruta}`, {
      signal: AbortSignal.timeout(5000), // timeout 5s
    })
    if (!res.ok) return null
    return res.json() as Promise<T>
  } catch {
    return null // backend caído → fallback silencioso
  }
}

// ─── Tipos de respuesta ───────────────────────────────────────────────────────

export interface DatoAnualAPI {
  año: number
  gastoTotal: number
  personal: number
  bienes_servicios: number
  otros_admin: number
  genero: number
  juvenil: number
  educacion_civica: number
  prestamos: number
  campana: number
  activo_fijo: number
  formacion: number
  otros: number
  aporteEstatal: number | null
  cuotaGenero: number | null
  cumplimientoGenero: number | null
}

export interface MesDetalle {
  mes: number
  nombre: string
  personal: number
  bienes_servicios: number
  otros_admin: number
  genero: number
  campana: number
  total: number
}

export interface UFResponse {
  fecha: string | null
  valor: number
  fuente: string
}

export interface Alerta {
  id: string
  tipo: 'critico' | 'advertencia' | 'info'
  titulo: string
  descripcion: string
  modulo: string
  valor?: number
  umbral?: number
}

// ─── Tipos nuevos ────────────────────────────────────────────────────────────

export interface IngresoTipo { tipo: string; monto: number }
export interface BalanceMes {
  mes: number; nombre: string; ingresos: number; egresos: number; saldo: number
}
export interface BalanceAnual {
  año: number; meses: BalanceMes[]
  total_ingresos: number; total_egresos: number; saldo_neto: number
}

export interface Prestamo {
  id: number; fecha_inicio: string; acreedor_rut: string; acreedor_nombre: string
  tipo_acreedor: string; monto_original: number; tasa_interes: number | null
  plazo_meses: number | null; monto_pendiente: number; estado: string
  numero_contrato: string | null; fecha_vencimiento: string | null
  es_legal: boolean; alerta_legal: string | null
}

export interface AporteCandidato {
  id: number; rut_candidato: string; nombre_candidato: string
  tipo_eleccion: string; monto: number; fecha: string
  cuenta_campana: string | null; dentro_limite: boolean
  pct_del_limite: number; mensaje_validacion: string
  declarado_servel: boolean; estado: string
}

export interface GeneroProyeccion {
  año: number; acumulado: number; promedio_mensual: number
  proyeccion_anual: number; pct_proyectado: number
  deficit_proyectado: number; monto_mensual_needed: number
  meses_restantes: number; cumple_proyeccion: boolean
  cuota_anual: number; aporte_estatal: number
  gastos_por_mes: { mes: number; monto: number }[]
}

export interface DocRequerido { tipo: string; label: string; obligatorio: boolean }

// ─── Endpoints ────────────────────────────────────────────────────────────────

export const api = {
  /** Serie anual completa 2017–2026 */
  gastosSerie: () =>
    get<{ serie: DatoAnualAPI[]; total_años: number }>('/api/gastos/serie'),

  /** Detalle mensual de un año */
  gastosMensual: (year: number) =>
    get<{ año: number; meses: MesDetalle[] }>(`/api/gastos/mensual?year=${year}`),

  /** Totales por categoría de un año */
  gastosCategorias: (year: number) =>
    get<{ año: number; categorias: { categoria: string; monto: number }[]; total: number }>(
      `/api/gastos/categorias?year=${year}`
    ),

  /** Valor UF del día */
  ufHoy: () => get<UFResponse>('/api/uf/hoy'),

  /** Alertas activas del sistema */
  alertas: () => get<{ alertas: Alerta[]; total: number }>('/api/alertas'),

  /** Años con datos disponibles */
  años: () => get<{ años: number[] }>('/api/años'),

  /** Verificación del estado del backend */
  health: () => get<{ status: string; db: string }>('/api/health'),

  // ── Ingresos ──────────────────────────────────────────────────────────────
  ingresos: (year: number) =>
    get<{ año: number; ingresos: IngresoTipo[]; total: number; aporte_estatal_referencia: number | null }>(
      `/api/ingresos?year=${year}`
    ),
  balanceAnual: (year: number) => get<BalanceAnual>(`/api/ingresos/balance?year=${year}`),

  // ── Préstamos ─────────────────────────────────────────────────────────────
  prestamos: (estado?: string) =>
    get<{ prestamos: Prestamo[]; total_deuda_vigente: number; cantidad_ilegales: number; alertas: string[] }>(
      `/api/prestamos${estado ? `?estado=${estado}` : ''}`
    ),

  // ── Aportes a candidatos ──────────────────────────────────────────────────
  aportesCandidatos: (year: number) =>
    get<{
      año: number; aportes: AporteCandidato[]; total_aportes: number
      cantidad_exceden_limite: number; cantidad_no_declarados_servel: number
      limites_por_cargo: Record<string, { uf: number; clp: number }>
    }>(`/api/aportes-candidatos?year=${year}`),

  // ── Analytics ─────────────────────────────────────────────────────────────
  generoProyeccion: (year: number) => get<GeneroProyeccion>(`/api/analytics/genero-proyeccion?year=${year}`),
  burnRate: (year: number) =>
    get<{ gasto_acumulado: number; gasto_esperado: number; pct_real: number; pct_esperado: number; variacion: number; estado: string }>(
      `/api/analytics/burn-rate?year=${year}`
    ),

  // ── Documentos por ítem SERVEL ────────────────────────────────────────────
  docsRequeridos: (categoria: string) =>
    get<{ categoria: string; documentos: DocRequerido[] }>(`/api/items-servel/documentos?categoria=${categoria}`),
  docsCategoriasAll: () =>
    get<{ categorias: { categoria: string; documentos: DocRequerido[]; total: number; obligatorios: number }[] }>(
      '/api/items-servel/documentos'
    ),
}
