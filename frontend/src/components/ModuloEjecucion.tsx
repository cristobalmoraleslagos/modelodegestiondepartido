import { AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { fmt } from '../utils'

interface LineaPresupuestaria {
  item: string
  presupuestoAnual: number
  ejecutadoYTD: number
}

// ─── Datos reales SERVEL — Gastos declarados ──────────────────────────────────
// Presupuesto 2026: proyectado en base a ejecución real 2025 (fuente: SERVEL)
// Ejecutado YTD: Q1 2026 (Ene–Mar) según reporte trimestral SERVEL
// Datos disponibles hasta Q1 2026; Q2 (Abr–Jun) aún no reportado.

const LINEAS: LineaPresupuestaria[] = [
  { item: 'Gastos de Personal',               presupuestoAnual: 480_000_000, ejecutadoYTD: 135_805_744 },
  { item: 'Adquisición Bienes y Servicios',    presupuestoAnual: 250_000_000, ejecutadoYTD:  22_429_172 },
  { item: 'Otros Gastos de Administración',    presupuestoAnual: 170_000_000, ejecutadoYTD:  39_972_768 },
  { item: 'Gastos Financieros (Préstamos)',     presupuestoAnual:  45_000_000, ejecutadoYTD:   4_942_000 },
  { item: 'Fomento Participación Femenina',     presupuestoAnual:   8_000_000, ejecutadoYTD:           0 },
  { item: 'Fomento Participación Juvenil',      presupuestoAnual:   8_000_000, ejecutadoYTD:           0 },
  { item: 'Eventos Partidarios',               presupuestoAnual:   5_000_000, ejecutadoYTD:           0 },
]
// Nota: presupuesto anual = estimación propia; ejecución = cifras reales SERVEL Q1 2026

const MES_ACTUAL = 3   // datos disponibles hasta marzo (Q1 SERVEL); mes calendario = 5
const ALERTA_UMBRAL = 85

const modificaciones = [
  { fecha: '2026-02-28', origen: 'Adquisición Bienes', destino: 'Otros Gastos Admin', monto: 15_000_000, responsable: 'Tesorería', motivo: 'Reclasificación contable Q1 según SERVEL' },
  { fecha: '2026-03-31', origen: 'Gastos Financieros', destino: 'Gastos de Personal', monto: 4_942_000, responsable: 'Tesorería', motivo: 'Abono a préstamo de corto plazo — vencimiento marzo' },
]

export default function ModuloEjecucion() {
  const presupuestoTotal = LINEAS.reduce((s, l) => s + l.presupuestoAnual, 0)
  const ejecutadoTotal = LINEAS.reduce((s, l) => s + l.ejecutadoYTD, 0)
  const pctTotal = Math.round((ejecutadoTotal / presupuestoTotal) * 100)
  const pctEsperado = Math.round((MES_ACTUAL / 12) * 100)

  const sobreejecutadas = LINEAS.filter(l => {
    const pct = Math.round((l.ejecutadoYTD / l.presupuestoAnual) * 100)
    return pct >= ALERTA_UMBRAL && MES_ACTUAL < 10
  })

  const chartData = LINEAS.map(l => ({
    item: l.item.split(' ')[0],
    Presupuesto: l.presupuestoAnual,
    Ejecutado: l.ejecutadoYTD,
  }))

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Presupuesto total anual', value: fmt(presupuestoTotal) },
          { label: 'Ejecutado YTD (ene–mar) — Fuente: SERVEL Q1', value: `${fmt(ejecutadoTotal)} (${pctTotal}%)` },
          { label: `Ejecución esperada al mes ${MES_ACTUAL} (Q1 disponible)`, value: `${pctEsperado}% — ${pctTotal > pctEsperado ? 'SOBRE lo esperado' : 'dentro del rango'}` },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-slate-500">{k.label}</p>
            <p className="text-lg font-semibold text-slate-800 mt-1">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Alerta sobrejecución */}
      {sobreejecutadas.length > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl px-5 py-4">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Ítem(s) sobre el {ALERTA_UMBRAL}% de ejecución en el mes {MES_ACTUAL}</p>
            <p className="text-xs mt-0.5">
              {sobreejecutadas.map(l => l.item).join(', ')} — requieren aprobación de directiva para modificación presupuestaria.
            </p>
          </div>
        </div>
      )}

      {/* Tabla de ejecución */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Ejecución por Ítem Presupuestario</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {LINEAS.map((l, i) => {
            const pct = Math.round((l.ejecutadoYTD / l.presupuestoAnual) * 100)
            const saldo = l.presupuestoAnual - l.ejecutadoYTD
            const color = pct >= ALERTA_UMBRAL ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#6366f1'
            return (
              <div key={i} className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">{l.item}</span>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-slate-400">Presupuesto: {fmt(l.presupuestoAnual)}</span>
                    <span className="text-slate-600">Ejecutado: {fmt(l.ejecutadoYTD)}</span>
                    <span className={`font-semibold ${saldo < 0 ? 'text-red-600' : 'text-green-600'}`}>Saldo: {fmt(saldo)}</span>
                    <span className="font-bold w-12 text-right" style={{ color }}>{pct}%</span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="h-2 rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Gráfico */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Presupuesto vs Ejecutado por Ítem</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
            <XAxis dataKey="item" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={v => `$${(v / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => fmt(Number(v))} />
            <Legend />
            <Bar dataKey="Presupuesto" fill="#e0e7ff" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Ejecutado" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Modificaciones presupuestarias */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Historial de Modificaciones Presupuestarias</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500 border-b border-slate-100">
              {['Fecha', 'Ítem origen', 'Ítem destino', 'Monto', 'Responsable', 'Motivo'].map(h => (
                <th key={h} className="text-left py-3 px-4 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modificaciones.map((m, i) => (
              <tr key={i} className="border-b border-slate-50 last:border-0">
                <td className="py-3 px-4 text-slate-500">{m.fecha}</td>
                <td className="py-3 px-4 text-red-600">{m.origen}</td>
                <td className="py-3 px-4 text-green-700">{m.destino}</td>
                <td className="py-3 px-4 font-medium">{fmt(m.monto)}</td>
                <td className="py-3 px-4 text-slate-500">{m.responsable}</td>
                <td className="py-3 px-4 text-slate-500">{m.motivo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
