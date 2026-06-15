import { AlertTriangle, Building2, Info } from 'lucide-react'
import { fmt } from '../utils'
import { CUENTAS_BANCARIAS, BANCOS_RESUMEN, type CuentaBancaria } from '../data/bancos'

const colorBanco = (b: CuentaBancaria['banco']) =>
  b === 'BCI' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'

export default function ModuloConciliacion() {
  const totalContable = CUENTAS_BANCARIAS.reduce((s, c) => s + c.saldoContable2025, 0)
  const difEEFF = BANCOS_RESUMEN.totalEEFF2025 - totalContable
  const operacionales = CUENTAS_BANCARIAS.filter(c => c.proposito === 'Operacional')
  const electorales = CUENTAS_BANCARIAS.filter(c => c.proposito === 'Electoral')

  return (
    <div className="space-y-6">
      {/* Aviso: datos reales, conciliación pendiente de cartola */}
      <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-2xl px-5 py-4">
        <Info size={18} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sm">Cuentas bancarias reales (Libro Mayor Defontana 2025)</p>
          <p className="text-xs mt-0.5">
            Saldos <strong>contables</strong>. La conciliación contra el saldo del banco requiere la <strong>cartola bancaria</strong> (pendiente).
            La suma de saldos contables ({fmt(totalContable)}) cuadra con los EEFF 2025 ({fmt(BANCOS_RESUMEN.totalEEFF2025)}).
          </p>
        </div>
      </div>

      {/* Colapso de liquidez 2024 → 2025 */}
      <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl px-5 py-4">
        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sm">Colapso de liquidez: {fmt(BANCOS_RESUMEN.totalContable2024)} (2024) → {fmt(totalContable)} (2025)</p>
          <p className="text-xs mt-0.5">
            Caída de −{(BANCOS_RESUMEN.caidaPct * 100).toFixed(1)}%. La cuenta principal BCI 13950223 pasó de $406,96M a $66K.
            Solo el crédito electoral $480M evitó la insolvencia en 2025.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Saldo bancos 2024', value: fmt(BANCOS_RESUMEN.totalContable2024), sub: `EEFF: ${fmt(BANCOS_RESUMEN.totalEEFF2024)} — cuadra` },
          { label: 'Saldo bancos 2025', value: fmt(totalContable), sub: `${CUENTAS_BANCARIAS.length} cuentas · cuadre EEFF ${Math.abs(difEEFF) < 2000 ? 'exacto' : fmt(Math.abs(difEEFF))}`, ok: true },
          { label: 'Conciliación cartola', value: 'Pendiente', sub: 'Falta el estado de cuenta del banco', warn: true },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-slate-500">{k.label}</p>
            <p className={`text-xl font-semibold ${k.warn ? 'text-amber-600' : k.ok ? 'text-green-600' : 'text-slate-800'}`}>{k.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Cuentas operacionales */}
      <Seccion titulo="Cuentas operacionales (BCI)" cuentas={operacionales} />
      {/* Cuentas electorales */}
      <Seccion titulo="Cuentas electorales (Banco Estado)" cuentas={electorales}
               nota="Banco Estado abre una cuenta por campaña. En 2024 (municipales) hubo además Concejal, Consejero Regional, Gobernador, Plebiscito y Primarias Alcalde; en 2025 quedaron con saldo ~$0." />
    </div>
  )
}

function Seccion({ titulo, cuentas, nota }: { titulo: string; cuentas: CuentaBancaria[]; nota?: string }) {
  if (cuentas.length === 0) return null
  return (
    <div className="bg-white rounded-2xl shadow-sm">
      <div className="p-5 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-800">{titulo}</h2>
        {nota && <p className="text-xs text-slate-400 mt-1">{nota}</p>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500 border-b border-slate-100">
              {['Cuenta contable', 'N° cuenta', 'Banco', 'Glosa', 'Saldo 2024', 'Saldo 2025', 'Movs 2025', 'Estado'].map(h => (
                <th key={h} className="text-left py-3 px-4 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cuentas.map((c) => (
              <tr key={c.codigo} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                <td className="py-3 px-4 font-mono text-xs text-slate-500 whitespace-nowrap">{c.codigo}</td>
                <td className="py-3 px-4 text-slate-600">{c.numero}</td>
                <td className="py-3 px-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${colorBanco(c.banco)}`}>
                    <Building2 size={11} className="inline mr-1" />{c.banco}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-700">{c.glosa}</td>
                <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{fmt(c.saldoContable2024)}</td>
                <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">{fmt(c.saldoContable2025)}</td>
                <td className="py-3 px-4 text-slate-500">{c.movimientos2025.toLocaleString('es-CL')}</td>
                <td className="py-3 px-4">
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    <AlertTriangle size={11} className="inline mr-1" />Pendiente cartola
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
              <td colSpan={4} className="py-3 px-4 text-slate-700">Subtotal</td>
              <td className="py-3 px-4 text-slate-500">{fmt(cuentas.reduce((s, c) => s + c.saldoContable2024, 0))}</td>
              <td className="py-3 px-4 text-slate-800">{fmt(cuentas.reduce((s, c) => s + c.saldoContable2025, 0))}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
