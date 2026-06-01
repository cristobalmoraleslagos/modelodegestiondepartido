import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react'
import {
  RadialBarChart, RadialBar, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { fmt, APORTE_ESTATAL_ANUAL, MES_ACTUAL } from '../utils'
import { api, type GeneroProyeccion } from '../api'

const CUOTA_GENERO        = APORTE_ESTATAL_ANUAL * 0.10
const GASTO_GENERO_2026   = 0           // Q1 2026 sin datos cargados aún
const GASTO_GENERO_2025   = 6_337_464   // Real CSV SERVEL 2025

// Historial real extraído de CSVs SERVEL 2017–2025
const HISTORICO = [
  { año: '2017', pct:  53 }, { año: '2018', pct: 63 },
  { año: '2019', pct:  45 }, { año: '2020', pct: 36 },
  { año: '2021', pct:   4 }, { año: '2022', pct: 86 },
  { año: '2023', pct:  18 }, { año: '2024', pct: 38 },
  { año: '2025', pct:   5 },
]
const MESES_NOMBRE = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function AlertaGenero() {
  const [gastoGenero, setGastoGenero]   = useState(GASTO_GENERO_2026)
  const [proyeccion, setProyeccion]     = useState<GeneroProyeccion | null>(null)
  const [desdeApi, setDesdeApi]         = useState(false)

  useEffect(() => {
    api.gastosCategorias(2026).then(data => {
      if (!data) return
      const cat = data.categorias.find(c => c.categoria === 'genero')
      if (cat && cat.monto > 0) { setGastoGenero(cat.monto); setDesdeApi(true) }
    })
    api.generoProyeccion(2026).then(d => { if (d) setProyeccion(d) })
  }, [])

  const pctGenero    = Math.round((gastoGenero / CUOTA_GENERO) * 100)
  const generoOk     = pctGenero >= 100
  const generoAlerta = pctGenero >= 75 && pctGenero < 100
  const color        = generoOk ? '#22c55e' : generoAlerta ? '#f59e0b' : '#ef4444'
  const radialData   = [{ value: Math.min(pctGenero, 100) }]

  // Proyección simple si no hay API
  const promMensual    = MES_ACTUAL > 0 ? Math.round(gastoGenero / MES_ACTUAL) : 0
  const pctProyectado  = proyeccion
    ? proyeccion.pct_proyectado
    : Math.round((promMensual * 12) / CUOTA_GENERO * 100)
  const montoNecesario = proyeccion
    ? proyeccion.monto_mensual_needed
    : Math.max(Math.round((CUOTA_GENERO - gastoGenero) / Math.max(12 - MES_ACTUAL, 1)), 0)
  const mesesRestantes = 12 - MES_ACTUAL

  // Gráfico mensual real + proyectado
  const chartMensual = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const real = proyeccion?.gastos_por_mes.find(g => g.mes === m)?.monto
      ?? (m <= MES_ACTUAL ? Math.round(gastoGenero / MES_ACTUAL) : undefined)
    const proy = m > MES_ACTUAL ? (proyeccion?.promedio_mensual ?? promMensual) : undefined
    return { mes: MESES_NOMBRE[m], real, proy }
  })

  return (
    <div className="space-y-4">

      {/* ── Tarjeta principal ── */}
      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Alerta Fondo de Género — Ley 20.900</h2>
          <p className="text-xs text-slate-500">
            Cuota legal 2026: {fmt(CUOTA_GENERO)} · 10% del aporte estatal {fmt(APORTE_ESTATAL_ANUAL)}
            {desdeApi && <span className="ml-2 text-indigo-500">· datos desde BD</span>}
          </p>
        </div>

        <div className="flex items-center gap-8">
          <div className="relative w-36 h-36 flex items-center justify-center flex-shrink-0">
            <RadialBarChart width={144} height={144} innerRadius={50} outerRadius={68}
              data={radialData} startAngle={90} endAngle={-270}>
              <RadialBar dataKey="value" cornerRadius={8} background={{ fill: '#f1f5f9' }}>
                <Cell fill={color} />
              </RadialBar>
            </RadialBarChart>
            <span className="absolute text-2xl font-bold" style={{ color }}>{pctGenero}%</span>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Ejecutado 2026</span>
              <span className="font-medium text-slate-700">{fmt(gastoGenero)}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3">
              <div className="h-3 rounded-full transition-all"
                style={{ width: `${Math.min(pctGenero, 100)}%`, background: color }} />
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>$0</span><span>{fmt(CUOTA_GENERO)}</span>
            </div>
            {!generoOk && (
              <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium"
                style={{ background: generoAlerta ? '#fef3c7' : '#fee2e2',
                         color: generoAlerta ? '#92400e' : '#991b1b' }}>
                <AlertTriangle size={16} />
                {generoAlerta
                  ? 'ADVERTENCIA: Gasto de Género bajo el 75% de la cuota legal.'
                  : 'ALERTA CRÍTICA: Gasto insuficiente. El balance anual será rechazado por SERVEL.'}
              </div>
            )}
            {generoOk && (
              <div className="flex items-center gap-2 bg-green-50 text-green-800 rounded-xl px-4 py-3 text-sm font-medium">
                <CheckCircle size={16} /> Cuota de género cumplida.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Proyección predictiva ── */}
      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-indigo-500" />
          <h3 className="text-sm font-semibold text-slate-800">Proyección al 31 de Diciembre 2026</h3>
          <span className="text-xs text-slate-400 ml-auto">Basada en promedio de meses con datos</span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: 'Proyección anual al ritmo actual',
              value: `${pctProyectado}%`,
              sub: pctProyectado >= 100 ? '✓ Cumplirá la cuota' : `Solo ${fmt(Math.round(promMensual * 12))} al año`,
              color: pctProyectado >= 100 ? 'text-green-600' : 'text-red-600',
              bg: pctProyectado >= 100 ? 'bg-green-50' : 'bg-red-50',
            },
            {
              label: 'Necesario por mes para cumplir',
              value: fmt(montoNecesario),
              sub: `En los ${mesesRestantes} meses restantes`,
              color: 'text-amber-700',
              bg: 'bg-amber-50',
            },
            {
              label: 'Promedio actual / mes',
              value: fmt(promMensual),
              sub: `Mes ${MES_ACTUAL} de 12 · ${pctGenero}% acumulado`,
              color: 'text-slate-700',
              bg: 'bg-slate-50',
            },
          ].map((k, i) => (
            <div key={i} className={`${k.bg} rounded-xl p-4`}>
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className={`text-xl font-bold mt-1 ${k.color}`}>{k.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>

        {pctProyectado < 100 && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-800">
            <strong>Acción requerida:</strong> Al ritmo actual el partido cerrará 2026 con {pctProyectado}% de la cuota.
            Programar <strong>{fmt(montoNecesario)}/mes</strong> adicionales en actividades de fomento a la participación femenina.
            La referencia del año pasado (2025) fue solo {fmt(GASTO_GENERO_2025)}.
          </div>
        )}

        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartMensual} margin={{ top: 4, right: 0, left: 20, bottom: 0 }}>
            <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={v => `$${(v / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 10 }} />
            <Tooltip formatter={v => fmt(Number(v))} />
            <ReferenceLine
              y={Math.round(CUOTA_GENERO / 12)}
              stroke="#ef4444" strokeDasharray="4 2"
              label={{ value: 'Meta/mes', position: 'insideRight', fontSize: 9 }}
            />
            <Bar dataKey="real" name="Gasto real"   fill="#8b5cf6" radius={[3,3,0,0]} />
            <Bar dataKey="proy" name="Proyectado"   fill="#c4b5fd" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Historial 9 años ── */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">
          Historial 2017–2025 —{' '}
          <span className="text-red-600 font-bold">0/9 años han cumplido la cuota</span>
        </h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={HISTORICO} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="año" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={v => `${v}%`} domain={[0, 110]} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v) => [`${v}%`, 'Cumplimiento']} />
            <ReferenceLine y={100} stroke="#22c55e" strokeDasharray="4 2"
              label={{ value: '100%', position: 'right', fontSize: 9, fill: '#22c55e' }} />
            <Bar dataKey="pct" name="% cumplimiento" radius={[3,3,0,0]}>
              {HISTORICO.map((d, i) => (
                <Cell key={i} fill={d.pct >= 100 ? '#22c55e' : d.pct >= 75 ? '#f59e0b' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="border-t border-slate-100 pt-3 mt-2 grid grid-cols-9 gap-1 text-center">
          {HISTORICO.map(({ año, pct }) => (
            <div key={año}>
              <p className="text-xs text-slate-400">{año}</p>
              <p className={`text-xs font-bold ${pct >= 100 ? 'text-green-600' : pct >= 75 ? 'text-amber-500' : 'text-red-600'}`}>{pct}%</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
