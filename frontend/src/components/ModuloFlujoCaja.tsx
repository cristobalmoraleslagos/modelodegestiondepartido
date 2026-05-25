import { AlertTriangle, TrendingUp } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { fmt } from '../utils'

interface Semana {
  semana: string
  ingresosEsperados: number
  egresosComprometidos: number
  saldo: number
}

interface Compromiso {
  concepto: string
  monto: number
  fechaVencimiento: string
  tipo: 'Fijo' | 'Variable'
  cuenta: string
}

// ─── Datos reales y proyecciones — Fuente: SERVEL Q1 2026 ────────────────────
// Fuente: portaltransparencia.cl — PP007 PCCh, Módulo 11 Ingresos Q1 2026
//
// INGRESOS REALES Q1 2026 (SERVEL):
//   Enero:    $107.3M (cuotas $11M + patrimonio $28.4M + cheque caja $67.9M)
//   Febrero:  $176.4M (cuotas $7.6M + patrimonio $8.5M + aporte estatal $134.4M + transf. $26M)
//   Marzo:     $32.5M (cuotas $14.1M + patrimonio $18.4M)
//   Total Q1: $316.2M
//
// NOTA: El aporte estatal de $134.4M se recibe en Febrero — próximo pago estimado: Agosto 2026
// Promedio mensual sin aporte estatal: ~$40M/mes (cuotas + patrimonio)
//
// EGRESOS REALES PROMEDIO Q1 2026 (base 2024 SERVEL, ajustado):
//   Personal: ~45.3M/mes · Adq.Bienes: ~7.5M/mes · Otros: ~13.3M/mes → ~66M/mes total
//
// Saldo inicial: estimado — reemplazar con cartola bancaria real
const SALDO_INICIAL = 85_000_000   // estimado — actualizar con saldo real cartola BancoEstado

// Proyección basada en patrón real Q1 2026 SERVEL:
// - Sin aporte estatal mayo-jul (próximo: agosto ~$134M)
// - Ingresos recurrentes: cuotas ~$11M/mes + rendimientos patrimonio ~$18M/mes
// - Egresos: contratos nómina SERVEL Q1 2026 + gastos fijos sede
const SEMANAS_RAW = [
  // ── Mayo 2026 (semanas restantes) ──────────────────────────────────────────
  { semana: 'S3 May', ingresos: 11_500_000, egresos: 16_500_000 },  // cuotas + patrimonio parcial
  { semana: 'S4 May', ingresos:  4_500_000, egresos: 28_000_000 },  // pago nómina fin de mes
  // ── Junio 2026 (proyectado) ────────────────────────────────────────────────
  { semana: 'S1 Jun', ingresos: 12_000_000, egresos: 16_500_000 },  // cuotas junio
  { semana: 'S2 Jun', ingresos:  9_000_000, egresos: 16_500_000 },  // rendimiento patrimonio
  { semana: 'S3 Jun', ingresos:  7_000_000, egresos: 16_500_000 },
  { semana: 'S4 Jun', ingresos:  4_000_000, egresos: 28_000_000 },  // pago nómina fin de mes
  // ── Julio 2026 (proyectado) ────────────────────────────────────────────────
  { semana: 'S1 Jul', ingresos: 11_000_000, egresos: 16_500_000 },  // cuotas julio
  { semana: 'S2 Jul', ingresos:  8_000_000, egresos: 16_500_000 },
  { semana: 'S3 Jul', ingresos:  6_000_000, egresos: 16_500_000 },
  { semana: 'S4 Jul', ingresos:  4_000_000, egresos: 28_000_000 },  // pago nómina fin de mes
]

const FLUJO: Semana[] = (() => {
  let saldoAcum = SALDO_INICIAL
  return SEMANAS_RAW.map(s => {
    saldoAcum = saldoAcum + s.ingresos - s.egresos
    return { semana: s.semana, ingresosEsperados: s.ingresos, egresosComprometidos: s.egresos, saldo: saldoAcum }
  })
})()

// Compromisos basados en promedios reales Q1 2026 (SERVEL) + obligaciones fijas
const COMPROMISOS: Compromiso[] = [
  // ── Junio 2026 ────────────────────────────────────────────────────────────
  { concepto: 'Nómina junio (Personal)',          monto: 45_268_581, fechaVencimiento: '2026-06-05', tipo: 'Fijo',     cuenta: 'Operacional' },
  { concepto: 'Adquisición bienes/servicios jun', monto:  7_476_391, fechaVencimiento: '2026-06-15', tipo: 'Variable', cuenta: 'Operacional' },
  { concepto: 'Otros gastos adm. junio',          monto: 13_324_256, fechaVencimiento: '2026-06-20', tipo: 'Variable', cuenta: 'Operacional' },
  { concepto: 'Fomento Participación Femenina',   monto:  1_584_366, fechaVencimiento: '2026-06-30', tipo: 'Fijo',     cuenta: 'Fondo Género' },
  { concepto: 'Fomento Participación Juvenil',    monto:  1_850_005, fechaVencimiento: '2026-06-30', tipo: 'Fijo',     cuenta: 'Actividades' },
  // ── Julio 2026 ────────────────────────────────────────────────────────────
  { concepto: 'Nómina julio (Personal)',          monto: 45_268_581, fechaVencimiento: '2026-07-05', tipo: 'Fijo',     cuenta: 'Operacional' },
  { concepto: 'Adquisición bienes/servicios jul', monto:  7_476_391, fechaVencimiento: '2026-07-15', tipo: 'Variable', cuenta: 'Operacional' },
  { concepto: 'Otros gastos adm. julio',          monto: 13_324_256, fechaVencimiento: '2026-07-20', tipo: 'Variable', cuenta: 'Operacional' },
  // ── Agosto 2026 ───────────────────────────────────────────────────────────
  { concepto: 'Nómina agosto (Personal)',         monto: 45_268_581, fechaVencimiento: '2026-08-05', tipo: 'Fijo',     cuenta: 'Operacional' },
]
// Promedio mensual calculado: Personal=135.8M/3=45.3M · Bienes=22.4M/3=7.5M · Admin=40M/3=13.3M

export default function ModuloFlujoCaja() {
  const semanasNegativas = FLUJO.filter(s => s.saldo < 0)
  const saldoMinimo = Math.min(...FLUJO.map(s => s.saldo))
  const saldoMaximo = Math.max(...FLUJO.map(s => s.saldo))
  const totalCompromisosFixed = COMPROMISOS.filter(c => c.tipo === 'Fijo').reduce((s, c) => s + c.monto, 0)

  const chartData = FLUJO.map(s => ({ ...s, saldo: Math.round(s.saldo / 1_000) }))

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: <TrendingUp size={20} />, label: 'Saldo disponible hoy', value: fmt(SALDO_INICIAL), sub: 'Cuenta corriente operacional' },
          { icon: <TrendingUp size={20} />, label: 'Saldo mínimo proyectado', value: fmt(saldoMinimo), sub: `Semana ${FLUJO.find(s => s.saldo === saldoMinimo)?.semana}` },
          { icon: <TrendingUp size={20} />, label: 'Compromisos fijos próximos 90 días', value: fmt(totalCompromisosFixed), sub: `${COMPROMISOS.filter(c => c.tipo === 'Fijo').length} contratos` },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm flex items-start gap-4">
            <div className={`p-3 rounded-xl ${saldoMinimo < 0 && i === 1 ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>{k.icon}</div>
            <div>
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className={`text-xl font-semibold ${saldoMinimo < 0 && i === 1 ? 'text-red-600' : 'text-slate-800'}`}>{k.value}</p>
              <p className="text-xs text-slate-400">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alerta liquidez */}
      {semanasNegativas.length > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl px-5 py-4">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">ALERTA DE LIQUIDEZ — saldo negativo proyectado en {semanasNegativas.length} semana(s)</p>
            <p className="text-xs mt-0.5">
              {semanasNegativas.map(s => `${s.semana}: ${fmt(s.saldo)}`).join(' · ')} — Adelantar cobro de cotizaciones o gestionar anticipo de aporte estatal.
            </p>
          </div>
        </div>
      )}

      {/* Gráfico flujo */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800 mb-1">Proyección Saldo Disponible — Próximas 10 Semanas</h2>
        <p className="text-xs text-slate-400 mb-4">Valores en miles de CLP (M$)</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 30, bottom: 0 }}>
            <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={v => `$${v.toLocaleString('es-CL')}K`} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v) => fmt(Number(v) * 1_000)} labelFormatter={(l) => `Semana: ${l}`} />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Saldo 0', position: 'right', fontSize: 10, fill: '#ef4444' }} />
            <Line type="monotone" dataKey="saldo" stroke="#003087" strokeWidth={2.5} dot={{ fill: '#003087', r: 4 }} name="Saldo proyectado (M$)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla semanal */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Detalle Semanal</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100">
                {['Semana', 'Ingresos esperados', 'Egresos comprometidos', 'Flujo neto', 'Saldo acumulado'].map(h => (
                  <th key={h} className="text-left py-3 px-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FLUJO.map((s, i) => {
                const flujoNeto = s.ingresosEsperados - s.egresosComprometidos
                return (
                  <tr key={i} className={`border-b border-slate-50 last:border-0 ${s.saldo < 0 ? 'bg-red-50' : 'hover:bg-slate-50'}`}>
                    <td className="py-3 px-4 font-medium text-slate-700">{s.semana}</td>
                    <td className="py-3 px-4 text-green-700">{fmt(s.ingresosEsperados)}</td>
                    <td className="py-3 px-4 text-red-600">{fmt(s.egresosComprometidos)}</td>
                    <td className={`py-3 px-4 font-medium ${flujoNeto >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {flujoNeto >= 0 ? '+' : ''}{fmt(flujoNeto)}
                    </td>
                    <td className={`py-3 px-4 font-bold ${s.saldo < 0 ? 'text-red-700' : 'text-slate-800'}`}>
                      {fmt(s.saldo)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compromisos */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Compromisos y Pagos Futuros</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100">
                {['Concepto', 'Vencimiento', 'Tipo', 'Cuenta', 'Monto'].map(h => (
                  <th key={h} className="text-left py-3 px-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPROMISOS.sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento)).map((c, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="py-3 px-4 text-slate-700">{c.concepto}</td>
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{c.fechaVencimiento}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.tipo === 'Fijo' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-700'}`}>
                      {c.tipo}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">{c.cuenta}</td>
                  <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">{fmt(c.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
