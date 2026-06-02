import { AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { fmt } from '../utils'

interface LineaPresupuestaria {
  item: string
  presupuestoAnual: number
  ejecutadoYTD: number
}

// ─── Datos reales SERVEL — Gastos declarados ──────────────────────────────────
// Fuente: portal.servel.cl / portaltransparencia.cl — PP007 PCCh
// Módulo 12 Gastos + Módulo 14 Transferencias Q1 2026 (315 registros, total $243.4M)
//
// GASTOS REALES 2024 (fuente SERVEL):
//   Personal:       $380.3M anuales (prom. mensual $31.7M)
//   Adq.Bienes:     $267.7M anuales (excluye campaña)
//   Otros Admin:     $62.0M anuales
//   Fomento Fem.:    $37.1M anuales (supera cuota 10% — ver módulo Género)
//   Fomento Juv.:    $19.5M anuales
//
// GASTOS REALES Q1 2026 — Fuente: Transferencias SERVEL (Módulo 14, 315 filas):
//   Personal:          $135.805.744 (incluye nómina + PREVIRED $17.6M)
//   Adq. Bienes:        $22.429.172
//   Otros Admin:        $39.972.768 (incluye TGR/impuestos $36.7M)
//   Deuda Scotiabank:    $7.712.603 (mutuo + seguros — NUEVO)
//   Préstamos c/p:       $4.942.000 (Eric Olivares $2M + Raúl Montecinos $1M + otros)
//   Fomento Femenina:            $0 — ALERTA (ver módulo Género)
//   Fomento Juvenil:     $1.673.168
//
// NOTA CRÍTICA: Los "Gastos Financieros" incluyen préstamos otorgados a personas naturales
// (militantes), no pagos de deuda externa. El servicio de deuda Scotiabank ($7.7M/trimestre)
// NO estaba contemplado en el presupuesto original y es adicional a las líneas SERVEL.

const LINEAS: LineaPresupuestaria[] = [
  // Fuente: Transferencias SERVEL Q1 2026 — CONFIRMADO 315 registros
  { item: 'Gastos de Personal',               presupuestoAnual: 480_000_000, ejecutadoYTD: 135_805_744 },
  { item: 'Adquisición Bienes y Servicios',    presupuestoAnual: 250_000_000, ejecutadoYTD:  22_429_172 },
  { item: 'Otros Gastos de Administración',    presupuestoAnual: 170_000_000, ejecutadoYTD:  39_972_768 },
  // Préstamos otorgados a personas naturales (Eric Olivares $2M, Raúl Montecinos $1M, otros $1.9M)
  { item: 'Préstamos c/p a Militantes',        presupuestoAnual:  20_000_000, ejecutadoYTD:   4_942_000 },
  // NUEVO — Servicio deuda hipotecaria Scotiabank: mutuo $6.8M + seguros $0.9M (Módulo 14)
  { item: 'Servicio Deuda Scotiabank Mutuo',   presupuestoAnual:  30_000_000, ejecutadoYTD:   7_712_603 },
  // Q1 2026: sin ejecución reportada — ALERTA (ver módulo Género y Fondo Género)
  { item: 'Fomento Participación Femenina',     presupuestoAnual: 120_000_000, ejecutadoYTD:           0 },
  { item: 'Fomento Participación Juvenil',      presupuestoAnual:  25_000_000, ejecutadoYTD:   1_673_168 },
  { item: 'Eventos Partidarios',               presupuestoAnual:   5_000_000, ejecutadoYTD:           0 },
]
// Fuente ejecutado: Módulo 14 Transferencias PP007 Q1 2026 (315 filas, total $243.4M)

const MES_DATOS = 3    // corte de datos: Q1 2026 (ene–mar) — fuente SERVEL Módulo 14
const ALERTA_UMBRAL = 85

const modificaciones = [
  { fecha: '2026-02-11', origen: 'Otros Admin', destino: 'TGR (F29 enero)', monto: 20_244_943, responsable: 'Tesorería', motivo: 'Pago F29 enero 2026 — retenciones honorarios + PPM (confirmado Transferencias SERVEL)' },
  { fecha: '2026-03-17', origen: 'Gastos Extraordinarios', destino: 'Scotiabank Mutuo', monto: 6_803_562, responsable: 'Tesorería', motivo: 'Saldo deuda mutuo hipotecario Scotiabank — sede central (Módulo 14 Transferencias Q1 2026)' },
  { fecha: '2026-03-18', origen: 'Presupuesto No Contemplado', destino: 'Eric Olivares / Militantes', monto: 4_942_000, responsable: 'Tesorería', motivo: 'Préstamos corto plazo a personas naturales — requiere aprobación directiva (Ley 18.603 Art. 33)' },
]

export default function ModuloEjecucion() {
  const presupuestoTotal = LINEAS.reduce((s, l) => s + l.presupuestoAnual, 0)
  const ejecutadoTotal = LINEAS.reduce((s, l) => s + l.ejecutadoYTD, 0)
  const pctTotal = Math.round((ejecutadoTotal / presupuestoTotal) * 100)
  const pctEsperado = Math.round((MES_DATOS / 12) * 100)

  const sobreejecutadas = LINEAS.filter(l => {
    const pct = Math.round((l.ejecutadoYTD / l.presupuestoAnual) * 100)
    return pct >= ALERTA_UMBRAL
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
          { label: `Ejecución esperada al mes ${MES_DATOS} (Q1 disponible)`, value: `${pctEsperado}% — ${pctTotal > pctEsperado ? 'SOBRE lo esperado' : 'dentro del rango'}` },
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
            <p className="font-semibold text-sm">Ítem(s) sobre el {ALERTA_UMBRAL}% de ejecución en el mes {MES_DATOS}</p>
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
            const color = pct >= ALERTA_UMBRAL ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#003087'
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
            <Bar dataKey="Presupuesto" fill="#DDEAFF" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Ejecutado" fill="#003087" radius={[4, 4, 0, 0]} />
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
