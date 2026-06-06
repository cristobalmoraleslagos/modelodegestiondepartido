import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Calendar, Shield, Info, Zap, Wifi, WifiOff } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, ReferenceLine, Cell,
} from 'recharts'
import { fmt } from '../utils'
import { api, type DatoAnualAPI } from '../api'
import { GASTOS_HISTORICO_MAP } from '../data/gastos_historico'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface DatoAnual {
  año: number
  aporteEstatal: number | null
  gastoTotal: number | null
  personal: number | null
  bienes: number | null
  admin: number | null
  genero: number | null
  juvenil: number | null
  cuotaGenero: number | null
  sanciones: number
  esParcial: boolean
  periodoCubierto: string
  fuente: string
}

interface Evento {
  año: number
  mes: string
  tipo: 'sancion' | 'electoral' | 'financiero' | 'alerta' | 'hito'
  titulo: string
  descripcion: string
  gravedad: 'alta' | 'media' | 'baja'
}

type TabH = 'resumen' | 'gastos' | 'genero' | 'eventos'

// ─── Serie histórica PP007 PCCh 2019–2026 ────────────────────────────────────
// Fuentes:
//   portaltransparencia.cl → SERVEL PP007
//   Módulo 12: Gastos anuales | Módulo 14: Transferencias Q1 2026 (315 filas)
//   Balance 2022 (scaneado) | CSV Módulo 12 Gastos 2024 y 2025
//
// Convención: null = dato no disponible o no confirmado; 0 = cero confirmado.
// Los aportes estatales 2024-2025 son estimados ($1.200M) basados en la cuota
// de género usada en el modelo ($120M = 10% de $1.200M).
const SERIE: DatoAnual[] = [
  {
    año: 2019,
    aporteEstatal: null, gastoTotal: null,
    personal: null, bienes: null, admin: null, genero: null, juvenil: null,
    cuotaGenero: null, sanciones: 1, esParcial: true,
    periodoCubierto: 'Q3 (Jul–Sep)',
    fuente: 'Sanción SERVEL Resolución 0299 — Art. 39, 41 y 44 Ley 18.603',
  },
  {
    año: 2020,
    aporteEstatal: null, gastoTotal: null,
    personal: null, bienes: null, admin: null, genero: null, juvenil: null,
    cuotaGenero: null, sanciones: 0, esParcial: true,
    periodoCubierto: 'Sin datos disponibles',
    fuente: 'Balance no accesible en portal SERVEL al momento del análisis',
  },
  {
    año: 2021,
    aporteEstatal: null, gastoTotal: 467_700_000,
    personal: null, bienes: null, admin: null, genero: null, juvenil: null,
    cuotaGenero: null, sanciones: 1, esParcial: true,
    periodoCubierto: 'Año electoral — datos campaña',
    fuente: 'SERVEL CSV Gastos Campañas Electorales 2021 (Por aprobar)',
  },
  {
    año: 2022,
    aporteEstatal: 1_240_127_041, gastoTotal: null,
    personal: null, bienes: null, admin: null, genero: 19_176_625, juvenil: null,
    cuotaGenero: 124_012_704, sanciones: 1, esParcial: false,
    periodoCubierto: 'Año completo',
    fuente: 'Balance SERVEL 2022 + Módulo 12 Gastos',
  },
  {
    año: 2023,
    aporteEstatal: null, gastoTotal: null,
    personal: null, bienes: null, admin: null, genero: null, juvenil: null,
    cuotaGenero: null, sanciones: 0, esParcial: true,
    periodoCubierto: 'Balance no confirmado',
    fuente: 'Datos no disponibles en portal al momento del análisis',
  },
  {
    año: 2024,
    aporteEstatal: 1_200_000_000, gastoTotal: 766_705_715,
    personal: 380_300_000, bienes: 267_700_000, admin: 62_000_000,
    genero: 37_205_715, juvenil: 19_500_000,
    cuotaGenero: 120_000_000, sanciones: 0, esParcial: false,
    periodoCubierto: 'Año completo',
    fuente: 'SERVEL CSV Módulo 12 Gastos 2024 — CONFIRMADO (categorías completas)',
  },
  {
    año: 2025,
    aporteEstatal: 1_200_000_000, gastoTotal: 909_520_638,
    personal: null, bienes: null, admin: null,
    genero: 6_337_464, juvenil: null,
    cuotaGenero: 120_000_000, sanciones: 0, esParcial: false,
    periodoCubierto: 'Año completo',
    fuente: 'SERVEL CSV Módulo 12 Gastos 2025 — total confirmado; breakdown categorías estimado',
  },
  {
    año: 2026,
    aporteEstatal: 134_400_000, gastoTotal: 243_373_388,
    personal: 135_805_744, bienes: 22_429_172, admin: 39_972_768,
    genero: 0, juvenil: 1_673_168,
    cuotaGenero: 120_000_000, sanciones: 0, esParcial: true,
    periodoCubierto: 'Q1 (Ene–Mar) — PARCIAL',
    fuente: 'Módulo 14 Transferencias PP007 Q1 2026 — 315 filas, $243.4M total',
  },
]

// ─── Eventos críticos ─────────────────────────────────────────────────────────
const EVENTOS: Evento[] = [
  {
    año: 2019, mes: 'Jul',
    tipo: 'sancion', gravedad: 'alta',
    titulo: 'Sanción SERVEL — 1ª Multa',
    descripcion: 'Infracción Art. 39, 41 y 44 Ley 18.603. Resolución 0299 — portaltransparencia.cl.',
  },
  {
    año: 2021, mes: 'Oct',
    tipo: 'sancion', gravedad: 'alta',
    titulo: 'Sanción SERVEL — 2ª Multa',
    descripcion: 'Infracción Art. 39, 41 y 44 Ley 18.603. Resolución 1130. Segunda sanción en 3 años.',
  },
  {
    año: 2021, mes: 'Nov',
    tipo: 'electoral', gravedad: 'media',
    titulo: 'Elecciones Generales — Gastos $467M',
    descripcion: 'Senadores $120.2M + Diputados $182.9M + Consejeros $164.5M. Estado en SERVEL: "Por aprobar" (pendiente validación).',
  },
  {
    año: 2022, mes: 'Sep',
    tipo: 'sancion', gravedad: 'alta',
    titulo: 'Sanción SERVEL — 3ª Multa (Reincidencia)',
    descripcion: 'Tercera sanción en 4 años. Infracción Art. 39, 41 y 44 Ley 18.603. Resolución 0624. Patrón sistemático.',
  },
  {
    año: 2022, mes: 'Dic',
    tipo: 'hito', gravedad: 'baja',
    titulo: 'Aporte Estatal Máximo Registrado',
    descripcion: 'Aporte estatal anual $1.240.127.041 — mayor valor del período 2019–2026 según datos disponibles.',
  },
  {
    año: 2022, mes: 'Dic',
    tipo: 'alerta', gravedad: 'alta',
    titulo: 'Fondo Género 2022 — Solo 15.5%',
    descripcion: '$19.2M ejecutados de cuota $124M. Segundo incumplimiento del fondo de género. Riesgo de rechazo balance SERVEL.',
  },
  {
    año: 2024, mes: 'Dic',
    tipo: 'hito', gravedad: 'baja',
    titulo: 'Fondo Género 2024 — 31% (Mejor ejecución)',
    descripcion: '$37.2M ejecutados sobre cuota $120M. Mejor registro en el período, aunque aún muy bajo del 100% requerido. Sin sanciones el año.',
  },
  {
    año: 2025, mes: 'Dic',
    tipo: 'alerta', gravedad: 'alta',
    titulo: '⚠ CRÍTICO: Fondo Género colapsa a 5.3%',
    descripcion: 'Solo $6.3M ejecutados (de $120M cuota). Caída desde 31% (2024) a 5.3% (2025) — la peor ejecución registrada. Riesgo inminente de rechazo balance.',
  },
  {
    año: 2026, mes: 'Ene',
    tipo: 'alerta', gravedad: 'alta',
    titulo: 'Fondo Género Q1 2026 — $0 ejecutado',
    descripcion: 'Sin ejecución en Fomento Participación Femenina en todo el primer trimestre. Si persiste, 2026 repetirá incumplimiento.',
  },
  {
    año: 2026, mes: 'Mar',
    tipo: 'financiero', gravedad: 'media',
    titulo: 'Nueva Deuda Scotiabank — $7.7M Q1',
    descripcion: 'Pago mutuo hipotecario $6.8M + seguros $0.9M (Módulo 14 fila 312). No contemplado en presupuesto original. Deuda hipotecaria sede central.',
  },
  {
    año: 2026, mes: 'Mar',
    tipo: 'financiero', gravedad: 'media',
    titulo: 'Préstamos a Militantes — $4.9M',
    descripcion: 'Eric Olivares $2M + Raúl Montecinos $1M + Eliana Gajardo $1M + otros $0.9M. Préstamos desde fondos partidarios a personas naturales. Requiere aprobación Directiva — Art. 33 Ley 18.603.',
  },
]

// ─── Merge con datos M12 procesados ──────────────────────────────────────────
// Los datos procesados desde los CSV consolidados (gastos_historico.ts, Módulo 12
// SERVEL) son la FUENTE DE VERDAD para los años que cubren (2022-2025).
// Prevalecen sobre la serie narrativa hardcoded (SERIE), que solo aporta eventos,
// sanciones y años sin CSV procesado.
const SERIE_MERGED: DatoAnual[] = SERIE.map(d => {
  const real = GASTOS_HISTORICO_MAP[d.año]
  if (!real) return d
  // cuota de género = 10% del aporte estatal real (Art. 38 Ley 20.900).
  // Si el aporte fue $0 (años sin financiamiento público), la cuota exigible es $0.
  const aporteEstatal = real.aporteEstatal ?? d.aporteEstatal
  const cuotaGenero   = aporteEstatal != null ? Math.round(aporteEstatal * 0.10) : d.cuotaGenero
  return {
    ...d,
    aporteEstatal,
    gastoTotal: real.gastoTotal ?? d.gastoTotal,
    personal:   real.personal   ?? d.personal,
    bienes:     real.bienes     ?? d.bienes,
    admin:      real.admin      ?? d.admin,
    genero:     real.genero     ?? d.genero,
    juvenil:    real.juvenil    ?? d.juvenil,
    cuotaGenero,
    fuente:     real.fuente,
  }
})

// ─── Datos para gráficos ──────────────────────────────────────────────────────

// Género cumplimiento (años con cuota exigible > 0; si aporte fue $0 no hay cuota)
const CHART_GENERO = SERIE_MERGED
  .filter(d => d.genero !== null && d.cuotaGenero !== null && d.cuotaGenero! > 0)
  .map(d => ({
    año: d.esParcial ? `${d.año} Q1` : String(d.año),
    pct: Math.round((d.genero! / d.cuotaGenero!) * 100),
    ejecutado: d.genero!,
    cuota: d.cuotaGenero!,
  }))

// Gastos totales (años con gastoTotal)
const CHART_TOTALES = SERIE_MERGED
  .filter(d => d.gastoTotal !== null)
  .map(d => ({
    año: d.esParcial ? `${d.año}*` : String(d.año),
    'Gasto Total': d.gastoTotal!,
    esParcial: d.esParcial,
    nota: d.esParcial ? '* Parcial / solo campaña' : '',
  }))

// Breakdown por categoría — solo 2024 (completo) y 2026 Q1 (confirmado)
const CHART_CATEGORIAS = [
  {
    año: '2024 (Anual)',
    'Personal':       380_300_000,
    'Bienes y Serv.': 267_700_000,
    'Otros Admin':     62_000_000,
    'F. Género':       37_205_715,
    'F. Juvenil':      19_500_000,
    'Scotiabank':               0,
    'Préstamos':                0,
  },
  {
    año: '2026 Q1',
    'Personal':       135_805_744,
    'Bienes y Serv.':  22_429_172,
    'Otros Admin':     39_972_768,
    'F. Género':                0,
    'F. Juvenil':       1_673_168,
    'Scotiabank':       7_712_603,
    'Préstamos':        4_942_000,
  },
]

// Aporte estatal (solo años confirmados)
const CHART_APORTE = SERIE_MERGED
  .filter(d => d.aporteEstatal !== null)
  .map(d => ({
    año: d.esParcial ? `${d.año} Q1` : String(d.año),
    'Aporte Estatal': d.aporteEstatal!,
    estimado: d.aporteEstatal !== 1_240_127_041 && d.año !== 2026,
  }))

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtM = (v: number) => `$${(v / 1_000_000).toFixed(0)}M`

const colorGenero = (pct: number) =>
  pct >= 100 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'

const tipoEvento = {
  sancion:    { color: 'bg-red-100 text-red-700 border-red-200',       icon: <Shield size={14} /> },
  alerta:     { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <AlertTriangle size={14} /> },
  electoral:  { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: <Calendar size={14} /> },
  financiero: { color: 'bg-blue-100 text-blue-700 border-blue-200',     icon: <Zap size={14} /> },
  hito:       { color: 'bg-green-100 text-green-700 border-green-200',  icon: <CheckCircle size={14} /> },
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function ModuloHistorico() {
  const [tab, setTab]       = useState<TabH>('resumen')
  const [serieApi, setSerieApi] = useState<DatoAnualAPI[] | null>(null)
  const [apiOk, setApiOk]   = useState<boolean | null>(null)  // null = cargando

  useEffect(() => {
    api.gastosSerie().then(data => {
      if (data && data.serie.length > 0) {
        setSerieApi(data.serie)
        setApiOk(true)
      } else {
        setApiOk(false)
      }
    })
  }, [])

  // Enriquecer SERIE_MERGED hardcodeada con datos del API cuando estén disponibles
  const serieEnriquecida: DatoAnual[] = SERIE_MERGED.map(base => {
    if (!serieApi) return base
    const apiRow = serieApi.find(r => r.año === base.año)
    if (!apiRow) return base
    return {
      ...base,
      gastoTotal: apiRow.gastoTotal || base.gastoTotal,
      personal:   apiRow.personal   || base.personal,
      bienes:     apiRow.bienes_servicios || base.bienes,
      admin:      apiRow.otros_admin || base.admin,
      genero:     apiRow.genero      || base.genero,
      juvenil:    apiRow.juvenil     || base.juvenil,
    }
  })

  // Usar serie enriquecida (con datos API si están disponibles, fallback hardcodeado)
  const serieActiva = serieEnriquecida

  const totalSanciones = serieActiva.reduce((s, d) => s + d.sanciones, 0)
  const añosConGenero = serieActiva.filter(d => d.genero !== null && d.cuotaGenero !== null)
  const avgGenero = añosConGenero.length
    ? Math.round(añosConGenero.reduce((s, d) => s + (d.genero! / d.cuotaGenero!) * 100, 0) / añosConGenero.length)
    : 0
  const tendenciaGastos = (() => {
    const c = serieActiva.filter(d => d.gastoTotal !== null && !d.esParcial)
    if (c.length < 2) return null
    const last = c[c.length - 1].gastoTotal!
    const prev = c[c.length - 2].gastoTotal!
    return Math.round(((last - prev) / prev) * 100)
  })()
  const eventosAlta = EVENTOS.filter(e => e.gravedad === 'alta').length

  // Charts derivados de la serie activa
  const CHART_GENERO_ACTIVO = serieActiva
    .filter(d => d.genero !== null && d.cuotaGenero !== null)
    .map(d => ({
      año: String(d.año),
      pct: Math.round((d.genero! / d.cuotaGenero!) * 100),
      ejecutado: d.genero!,
      cuota: d.cuotaGenero!,
    }))

  const CHART_TOTALES_ACTIVO = serieActiva
    .filter(d => d.gastoTotal !== null)
    .map(d => ({
      año: d.esParcial ? `${d.año}*` : String(d.año),
      'Gasto Total': d.gastoTotal!,
      esParcial: d.esParcial,
    }))

  const TABS: { id: TabH; label: string }[] = [
    { id: 'resumen',  label: 'Resumen Histórico' },
    { id: 'gastos',   label: 'Gastos & Categorías' },
    { id: 'genero',   label: 'Fondo Género' },
    { id: 'eventos',  label: 'Línea de Tiempo' },
  ]

  return (
    <div className="space-y-6">
      {/* Badge de fuente de datos */}
      <div className="flex items-center gap-2 text-xs">
        {apiOk === null && (
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="inline-block w-2 h-2 bg-slate-300 rounded-full animate-pulse" />
            Conectando con base de datos...
          </span>
        )}
        {apiOk === true && (
          <span className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            <Wifi size={11} /> Datos actualizados desde PostgreSQL
          </span>
        )}
        {apiOk === false && (
          <span className="flex items-center gap-1.5 text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            <WifiOff size={11} /> Usando datos compilados (backend no conectado)
          </span>
        )}
      </div>

      {/* KPIs globales */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            icon: <Shield size={20} />,
            label: 'Sanciones SERVEL 2019–2026', value: `${totalSanciones} multas`,
            sub: 'Art. 39, 41 y 44 Ley 18.603', color: totalSanciones > 0 ? 'red' : 'green',
          },
          {
            icon: <AlertTriangle size={20} />,
            label: 'Eventos críticos totales', value: `${eventosAlta} alertas graves`,
            sub: `${EVENTOS.length} eventos en el período`, color: 'amber',
          },
          {
            icon: tendenciaGastos && tendenciaGastos > 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />,
            label: 'Tendencia gastos 2024→2025', value: tendenciaGastos !== null ? `+${tendenciaGastos}%` : 'Sin datos',
            sub: `$767M (2024) → $910M (2025)`, color: 'indigo',
          },
          {
            icon: <Info size={20} />,
            label: 'Cumpl. Género promedio',
            value: `${avgGenero}%`,
            sub: `Años analizados: ${añosConGenero.length} (cuota 10% aporte estatal)`,
            color: avgGenero >= 100 ? 'green' : avgGenero >= 50 ? 'amber' : 'red',
          },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm flex items-start gap-3">
            <div className={`p-3 rounded-xl bg-${k.color}-50 text-${k.color}-600`}>{k.icon}</div>
            <div>
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className="text-xl font-semibold text-slate-800">{k.value}</p>
              <p className="text-xs text-slate-400">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alertas clave */}
      <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl px-5 py-4">
        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold">Hallazgos críticos del período 2019–2026</p>
          <ul className="mt-1 space-y-0.5 text-xs list-disc list-inside text-red-700">
            <li>3 sanciones SERVEL en 4 años (2019, 2021, 2022) por las mismas infracciones — patrón sistemático de incumplimiento</li>
            <li>Fondo Género: 15.5% (2022) → 31% (2024) → 5.3% (2025) → 0% Q1 2026 — regresión alarmante</li>
            <li>Gastos totales crecen +18.7% en un año: $767M (2024) → $910M (2025)</li>
            <li>Q1 2026: Nueva deuda Scotiabank $7.7M + préstamos a militantes $4.9M — categorías sin precedente</li>
            <li>Gastos campaña 2021 ($467M) en estado "Por aprobar" en SERVEL — pendiente validación</li>
          </ul>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: RESUMEN ───────────────────────────────────────────────────────── */}
      {tab === 'resumen' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">Tabla Comparativa Anual — PP007 PCCh 2019–2026</h2>
              <p className="text-xs text-slate-500 mt-1">* Estimado · — Sin datos · Fuentes: SERVEL portaltransparencia.cl, CSVs Módulo 12 y 14</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 bg-slate-50 border-b border-slate-200">
                    {['Año', 'Período', 'Aporte Estatal', 'Gasto Total', 'F. Género', 'Cumpl. Género', 'Sanciones', 'Fuente'].map(h => (
                      <th key={h} className="text-left py-3 px-4 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SERIE_MERGED.map((d, i) => {
                    const pctGenero = d.genero !== null && d.cuotaGenero
                      ? Math.round((d.genero / d.cuotaGenero) * 100)
                      : null
                    const col = pctGenero !== null ? colorGenero(pctGenero) : ''
                    return (
                      <tr key={i} className={`border-b border-slate-50 last:border-0 ${d.sanciones > 0 ? 'bg-red-50/40' : ''}`}>
                        <td className="py-3 px-4 font-bold text-slate-800">{d.año}</td>
                        <td className="py-3 px-4 text-slate-500 text-xs whitespace-nowrap">
                          {d.esParcial && <span className="inline-block w-1.5 h-1.5 bg-amber-400 rounded-full mr-1.5 mb-0.5" />}
                          {d.periodoCubierto}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {d.aporteEstatal === null
                            ? <span className="text-slate-300">—</span>
                            : d.aporteEstatal === 0
                              ? <span className="text-red-600 font-semibold" title="Aporte público suspendido — Art. 42 DFL N°4/2017 (rendiciones pendientes)">$0 · suspendido</span>
                              : <span className={d.aporteEstatal !== 1_240_127_041 && d.año !== 2026 ? 'text-slate-400' : 'text-slate-700 font-medium'}>{fmtM(d.aporteEstatal)}{d.aporteEstatal !== 1_240_127_041 && d.año !== 2026 ? '*' : ''}</span>}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {d.gastoTotal
                            ? <span className="font-medium text-slate-700">{fmtM(d.gastoTotal)}</span>
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {d.genero !== null
                            ? <span style={{ color: col }} className="font-medium">{fmt(d.genero)}</span>
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {pctGenero !== null ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: col + '22', color: col }}>
                              {pctGenero}%
                            </span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {d.sanciones > 0
                            ? <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                                <Shield size={11} /> {d.sanciones} multa
                              </span>
                            : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-400 max-w-[220px] truncate" title={d.fuente}>{d.fuente}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-amber-400 rounded-full" /> Período parcial / datos incompletos</span>
              <span>* Valor estimado (no confirmado por balance oficial)</span>
              <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded">Fila roja = año con sanción SERVEL</span>
            </div>
          </div>

          {/* Gastos campaña 2021 */}
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">Gastos Campaña Electoral 2021 — Detalle</h2>
              <p className="text-xs text-slate-500 mt-1">Fuente: SERVEL CSV Registro Gastos Campañas Electorales PP007 · Estado: "Por aprobar" en todos los casos</p>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-3 gap-4 mb-4">
                {[
                  { tipo: 'Senadores', monto: 120_200_000 },
                  { tipo: 'Diputados', monto: 182_900_000 },
                  { tipo: 'Consejeros Regionales', monto: 164_500_000 },
                ].map((c, i) => (
                  <div key={i} className="border border-slate-200 rounded-xl p-4 text-center">
                    <p className="text-xs text-slate-500 mb-1">{c.tipo}</p>
                    <p className="text-2xl font-bold text-indigo-700">{fmtM(c.monto)}</p>
                    <p className="text-xs text-amber-600 mt-1">Por aprobar</p>
                  </div>
                ))}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>Total: <strong>$467.6M</strong> en gastos electorales 2021 figuran en estado "Por aprobar" en el registro SERVEL. La no aprobación puede implicar observaciones en el balance anual.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: GASTOS ────────────────────────────────────────────────────────── */}
      {tab === 'gastos' && (
        <div className="space-y-6">
          {/* Evolución gastos totales */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-800 mb-1">Evolución de Gastos Totales (años con datos)</h2>
            <p className="text-xs text-slate-500 mb-4">* Años marcados con asterisco son parciales o representan solo gastos de campaña electoral.</p>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={CHART_TOTALES_ACTIVO} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <XAxis dataKey="año" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={fmtM} tick={{ fontSize: 11 }} width={55} />
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Line
                  type="monotone"
                  dataKey="Gasto Total"
                  stroke="#003087"
                  strokeWidth={2.5}
                  dot={{ r: 5, fill: '#003087' }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-6 mt-2 text-xs text-slate-500">
              <span>📈 Crecimiento 2024→2025: <strong className="text-red-600">+$142.8M (+18.7%)</strong></span>
              <span>2026 Q1 = $243.4M (parcial — anualizado ≈ $973M)</span>
            </div>
          </div>

          {/* Breakdown por categoría */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-800 mb-1">Distribución por Categoría — 2024 vs 2026 Q1</h2>
            <p className="text-xs text-slate-500 mb-4">
              Solo estos dos años tienen breakdown completo por categoría confirmado en SERVEL.
              Nótese la aparición de Scotiabank y Préstamos en 2026.
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={CHART_CATEGORIAS} margin={{ top: 5, right: 10, left: 20, bottom: 5 }}>
                <XAxis dataKey="año" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={fmtM} tick={{ fontSize: 11 }} width={55} />
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Personal"       fill="#003087" radius={[3,3,0,0]} />
                <Bar dataKey="Bienes y Serv." fill="#8b5cf6" radius={[3,3,0,0]} />
                <Bar dataKey="Otros Admin"    fill="#06b6d4" radius={[3,3,0,0]} />
                <Bar dataKey="F. Género"      fill="#ec4899" radius={[3,3,0,0]} />
                <Bar dataKey="F. Juvenil"     fill="#f59e0b" radius={[3,3,0,0]} />
                <Bar dataKey="Scotiabank"     fill="#ef4444" radius={[3,3,0,0]} />
                <Bar dataKey="Préstamos"      fill="#dc2626" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
            {/* Tabla comparativa */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-100">
                    <th className="text-left py-2 pr-4 font-medium">Categoría</th>
                    <th className="text-right py-2 px-3 font-medium">2024 Anual</th>
                    <th className="text-right py-2 px-3 font-medium">2026 Q1</th>
                    <th className="text-right py-2 px-3 font-medium">Variación</th>
                    <th className="text-left py-2 px-3 font-medium">Observación</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { cat: 'Personal', v2024: 380_300_000, v2026q1: 135_805_744, obs: 'Q1 2026 = 35.7% del anual 2024 → ritmo superior' },
                    { cat: 'Bienes y Serv.', v2024: 267_700_000, v2026q1: 22_429_172, obs: 'Q1 muy bajo — posible concentración en Q2-Q3' },
                    { cat: 'Otros Admin', v2024: 62_000_000, v2026q1: 39_972_768, obs: 'Incluye TGR $36.7M (F29 ene-feb) — dato estacional' },
                    { cat: 'Fondo Género', v2024: 37_205_715, v2026q1: 0, obs: '⚠ $0 ejecutado Q1 2026 — alerta crítica' },
                    { cat: 'Fondo Juvenil', v2024: 19_500_000, v2026q1: 1_673_168, obs: 'Ejecución baja Q1 — normal si es estacional' },
                    { cat: 'Scotiabank (NUEVO)', v2024: 0, v2026q1: 7_712_603, obs: '🆕 Sin precedente en 2024 — deuda hipotecaria sede' },
                    { cat: 'Préstamos Militantes (NUEVO)', v2024: 0, v2026q1: 4_942_000, obs: '🆕 Sin precedente — requiere aprobación directiva' },
                  ].map((r, i) => {
                    const pct = r.v2024 > 0 ? Math.round((r.v2026q1 / r.v2024) * 100) : null
                    return (
                      <tr key={i} className="border-b border-slate-50 last:border-0">
                        <td className="py-2 pr-4 font-medium text-slate-700">{r.cat}</td>
                        <td className="py-2 px-3 text-right text-slate-600">{fmtM(r.v2024)}</td>
                        <td className="py-2 px-3 text-right text-slate-600">{fmtM(r.v2026q1)}</td>
                        <td className="py-2 px-3 text-right">
                          {pct !== null
                            ? <span className={pct > 30 ? 'text-amber-600 font-medium' : 'text-slate-400'}>{pct}%</span>
                            : r.v2026q1 > 0
                              ? <span className="text-red-600 font-medium">NUEVO</span>
                              : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-2 px-3 text-slate-500">{r.obs}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Aporte estatal */}
          {CHART_APORTE.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-800 mb-1">Aporte Estatal — Años con Datos</h2>
              <p className="text-xs text-slate-500 mb-4">2022: CONFIRMADO. 2024-2025: estimado $1.200M (base cuota género). 2026 Q1: solo pago febrero ($134.4M).</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={CHART_APORTE} margin={{ top: 5, right: 10, left: 20, bottom: 5 }}>
                  <XAxis dataKey="año" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={fmtM} tick={{ fontSize: 11 }} width={55} />
                  <Tooltip formatter={(v) => fmt(Number(v))} />
                  <Bar dataKey="Aporte Estatal" radius={[4,4,0,0]}>
                    {CHART_APORTE.map((entry, index) => (
                      <Cell key={index} fill={entry.estimado ? '#BBD5FF' : '#003087'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-indigo-500" /> Confirmado</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-indigo-200" /> Estimado</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: GÉNERO ────────────────────────────────────────────────────────── */}
      {tab === 'genero' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-800 mb-1">Cumplimiento Fondo de Género — Ley 20.900</h2>
            <p className="text-xs text-slate-500 mb-4">
              Obligación: 10% del aporte estatal anual destinado a Fomento Participación Femenina. La línea roja marca el 100% requerido.
              Ningún año ha cumplido la obligación completa.
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={CHART_GENERO_ACTIVO} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <XAxis dataKey="año" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} domain={[0, 120]} />
                <Tooltip
                  formatter={(v, name) => [`${v}%`, name === 'pct' ? 'Cumplimiento' : name]}
                  labelFormatter={l => `Año ${l}`}
                />
                <ReferenceLine y={100} stroke="#ef4444" strokeWidth={2} strokeDasharray="6 3" label={{ value: '100% (meta legal)', position: 'right', fontSize: 11, fill: '#ef4444' }} />
                <Bar dataKey="pct" name="% Cumplimiento" radius={[4,4,0,0]}>
                  {CHART_GENERO_ACTIVO.map((entry, index) => (
                    <Cell key={index} fill={colorGenero(entry.pct)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tabla detalle género */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">Detalle Anual — Ejecutado vs Cuota Legal</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 bg-slate-50 border-b border-slate-100">
                  {['Año', 'Cuota Legal (10%)', 'Ejecutado', 'Déficit', '% Cumplimiento', 'Situación'].map(h => (
                    <th key={h} className="text-left py-3 px-4 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SERIE_MERGED.filter(d => d.genero !== null && d.cuotaGenero !== null).map((d, i) => {
                  const pct = Math.round((d.genero! / d.cuotaGenero!) * 100)
                  const deficit = d.cuotaGenero! - d.genero!
                  const col = colorGenero(pct)
                  return (
                    <tr key={i} className="border-b border-slate-50 last:border-0">
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {d.año}{d.esParcial && <span className="text-xs text-amber-500 ml-1">Q1</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{fmt(d.cuotaGenero!)}</td>
                      <td className="py-3 px-4 font-medium" style={{ color: col }}>{fmt(d.genero!)}</td>
                      <td className="py-3 px-4 text-red-600 font-medium">{deficit > 0 ? fmt(deficit) : '—'}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-100 rounded-full h-2">
                            <div className="h-2 rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: col }} />
                          </div>
                          <span className="font-semibold text-sm" style={{ color: col }}>{pct}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {pct >= 100
                          ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"><CheckCircle size={11} /> Cumple</span>
                          : <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"><AlertTriangle size={11} /> Incumplimiento</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="px-5 py-4 border-t border-slate-100 bg-red-50">
              <p className="text-xs text-red-800 font-medium">
                ⚠ <strong>Ningún año en el período 2019–2026 ha cumplido el 100% de la cuota de género.</strong>
                El déficit acumulado de los años con datos disponibles supera los <strong>$300M</strong>.
                La tendencia 2024 (31%) → 2025 (5.3%) → 2026 Q1 (0%) es especialmente preocupante.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: EVENTOS ───────────────────────────────────────────────────────── */}
      {tab === 'eventos' && (
        <div className="bg-white rounded-2xl shadow-sm">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-800">Línea de Tiempo — Hitos y Eventos Críticos 2019–2026</h2>
            <p className="text-xs text-slate-500 mt-1">Fuente: SERVEL PP007 — Módulos 12, 14, 15 + Sanciones + Campañas Electorales</p>
          </div>
          <div className="p-5">
            {/* Agrupar por año */}
            {Array.from(new Set(EVENTOS.map(e => e.año))).sort((a, b) => a - b).map(año => {
              const eventosAño = EVENTOS.filter(e => e.año === año)
              return (
                <div key={año} className="mb-6 last:mb-0">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-sm font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-full">{año}</span>
                    <div className="flex-1 h-px bg-slate-100" />
                    {eventosAño.some(e => e.tipo === 'sancion') && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                        <Shield size={10} /> Año con sanción SERVEL
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 ml-4">
                    {eventosAño.map((ev, j) => {
                      const estilo = tipoEvento[ev.tipo]
                      return (
                        <div key={j} className={`flex items-start gap-3 border rounded-xl px-4 py-3 ${estilo.color}`}>
                          <div className="mt-0.5 shrink-0">{estilo.icon}</div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold">{ev.titulo}</p>
                              <span className="text-xs opacity-60">{ev.mes} {ev.año}</span>
                              {ev.gravedad === 'alta' && (
                                <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded font-medium">GRAVE</span>
                              )}
                            </div>
                            <p className="text-xs mt-0.5 opacity-80">{ev.descripcion}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Resumen estadístico */}
            <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-4 gap-4">
              {[
                { label: 'Eventos totales', value: EVENTOS.length },
                { label: 'Gravedad alta', value: EVENTOS.filter(e => e.gravedad === 'alta').length },
                { label: 'Sanciones SERVEL', value: EVENTOS.filter(e => e.tipo === 'sancion').length },
                { label: 'Alertas financieras', value: EVENTOS.filter(e => e.tipo === 'alerta' || e.tipo === 'financiero').length },
              ].map((s, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
