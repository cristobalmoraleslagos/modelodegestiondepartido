import { AlertTriangle, TrendingDown } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { fmt } from '../utils'
import { FLUJO_CAJA_REAL_2026 } from '../data/defontana'

// Meses a proyectar (run-rate real) tras los meses ya contabilizados.
const MESES_PROY = ['Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

interface Punto { mes: string; ingresos: number; egresos: number; neto: number; saldo: number; real: boolean }

const SERIE: Punto[] = (() => {
  const out: Punto[] = []
  let saldo = FLUJO_CAJA_REAL_2026.saldoInicialEne
  for (const m of FLUJO_CAJA_REAL_2026.meses) {
    const neto = m.ingresos - m.egresos; saldo += neto
    out.push({ mes: m.mes, ingresos: m.ingresos, egresos: m.egresos, neto, saldo, real: true })
  }
  const ing = FLUJO_CAJA_REAL_2026.ingresoMensualProm
  const egr = FLUJO_CAJA_REAL_2026.egresoMensualProm
  for (const mes of MESES_PROY) {
    const neto = ing - egr; saldo += neto
    out.push({ mes, ingresos: ing, egresos: egr, neto, saldo, real: false })
  }
  return out
})()

export default function ModuloFlujoCaja() {
  const saldoInicial = FLUJO_CAJA_REAL_2026.saldoInicialEne
  const ultReal = SERIE.filter(p => p.real).at(-1)!
  const saldoFinAnio = SERIE.at(-1)!.saldo
  const primerNeg = SERIE.find(p => p.saldo < 0)
  const deficitMensual = FLUJO_CAJA_REAL_2026.egresoMensualProm - FLUJO_CAJA_REAL_2026.ingresoMensualProm
  const chartData = SERIE.map(p => ({ mes: p.mes, saldo: Math.round(p.saldo / 1_000), real: p.real }))

  return (
    <div className="space-y-6">
      {/* KPIs (datos reales 2026) */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Saldo inicial Ene-2026 (real)', value: fmt(saldoInicial), sub: 'Caja real Dic-2025 (EEFF)', neg: false },
          { label: `Saldo real a ${ultReal.mes}-2026`, value: fmt(ultReal.saldo), sub: 'Libro Mayor Defontana 2026', neg: ultReal.saldo < 0 },
          { label: 'Déficit mensual (run-rate real)', value: fmt(-deficitMensual), sub: `Ingreso ~${fmt(FLUJO_CAJA_REAL_2026.ingresoMensualProm)} vs gasto ~${fmt(FLUJO_CAJA_REAL_2026.egresoMensualProm)}`, neg: true },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm flex items-start gap-4">
            <div className={`p-3 rounded-xl ${k.neg ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}><TrendingDown size={20} /></div>
            <div>
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className={`text-xl font-semibold ${k.neg ? 'text-red-600' : 'text-slate-800'}`}>{k.value}</p>
              <p className="text-xs text-slate-400">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alerta de caja negativa */}
      {primerNeg && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl px-5 py-4">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Crisis de liquidez: la caja se volvió NEGATIVA en {primerNeg.mes}-2026 ({fmt(primerNeg.saldo)})</p>
            <p className="text-xs mt-0.5">
              Datos REALES del Libro Mayor 2026 (Ene-May). Con el run-rate actual (déficit ~{fmt(deficitMensual)}/mes y sin aporte estatal),
              la proyección a Dic-2026 llega a {fmt(saldoFinAnio)}. El partido opera con caja negativa cubierta por el crédito / sobregiro.
            </p>
          </div>
        </div>
      )}

      {/* Gráfico mensual */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800 mb-1">Saldo de caja 2026 — real (Ene-May) + proyección</h2>
        <p className="text-xs text-slate-400 mb-4">Valores en miles de CLP (M$). Fuente: {FLUJO_CAJA_REAL_2026.fuente}</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 30, bottom: 0 }}>
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={v => `$${v.toLocaleString('es-CL')}K`} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v) => fmt(Number(v) * 1_000)} labelFormatter={(l) => `Mes: ${l}-2026`} />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Saldo 0', position: 'right', fontSize: 10, fill: '#ef4444' }} />
            <Line type="monotone" dataKey="saldo" stroke="#003087" strokeWidth={2.5} dot={{ fill: '#003087', r: 4 }} name="Saldo (M$)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla mensual */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Detalle mensual 2026</h2>
          <p className="text-xs text-slate-400 mt-0.5">Ene-May = real (Libro Mayor) · Jun-Dic = proyección con run-rate real</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100">
                {['Mes', 'Tipo', 'Ingresos', 'Egresos', 'Flujo neto', 'Saldo acumulado'].map(h => (
                  <th key={h} className="text-left py-3 px-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SERIE.map((s, i) => (
                <tr key={i} className={`border-b border-slate-50 last:border-0 ${s.saldo < 0 ? 'bg-red-50' : 'hover:bg-slate-50'}`}>
                  <td className="py-3 px-4 font-medium text-slate-700">{s.mes}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.real ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{s.real ? 'Real' : 'Proyección'}</span>
                  </td>
                  <td className="py-3 px-4 text-green-700">{fmt(s.ingresos)}</td>
                  <td className="py-3 px-4 text-red-600">{fmt(s.egresos)}</td>
                  <td className={`py-3 px-4 font-medium ${s.neto >= 0 ? 'text-green-700' : 'text-red-600'}`}>{s.neto >= 0 ? '+' : ''}{fmt(s.neto)}</td>
                  <td className={`py-3 px-4 font-bold ${s.saldo < 0 ? 'text-red-700' : 'text-slate-800'}`}>{fmt(s.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
