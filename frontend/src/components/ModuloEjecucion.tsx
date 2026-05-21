import { AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { fmt } from '../utils'

interface LineaPresupuestaria {
  item: string
  presupuestoAnual: number
  ejecutadoYTD: number
}

const LINEAS: LineaPresupuestaria[] = [
  { item: 'Remuneraciones', presupuestoAnual: 36_000_000, ejecutadoYTD: 15_000_000 },
  { item: 'Arriendo y Servicios', presupuestoAnual: 12_000_000, ejecutadoYTD: 5_100_000 },
  { item: 'Comunicaciones', presupuestoAnual: 8_000_000, ejecutadoYTD: 7_100_000 },
  { item: 'Eventos y Jornadas', presupuestoAnual: 15_000_000, ejecutadoYTD: 5_600_000 },
  { item: 'Formación Ciudadana', presupuestoAnual: 10_000_000, ejecutadoYTD: 2_800_000 },
  { item: 'Administración General', presupuestoAnual: 6_000_000, ejecutadoYTD: 2_100_000 },
  { item: 'Fondo de Género', presupuestoAnual: 22_200_000, ejecutadoYTD: 17_500_000 },
]

const MES_ACTUAL = 5
const ALERTA_UMBRAL = 85

const modificaciones = [
  { fecha: '2026-03-15', origen: 'Comunicaciones', destino: 'Eventos y Jornadas', monto: 2_000_000, responsable: 'Ana Pérez', motivo: 'Congreso regional imprevisto' },
  { fecha: '2026-04-02', origen: 'Administración General', destino: 'Formación Ciudadana', monto: 500_000, responsable: 'Carlos Ruiz', motivo: 'Taller municipal La Florida' },
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
          { label: 'Ejecutado YTD (ene–may)', value: `${fmt(ejecutadoTotal)} (${pctTotal}%)` },
          { label: 'Ejecución esperada al mes 5', value: `${pctEsperado}% — ${pctTotal > pctEsperado ? 'SOBRE lo esperado' : 'dentro del rango'}` },
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
