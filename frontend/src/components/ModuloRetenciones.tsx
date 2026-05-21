import { Calculator, AlertTriangle, CheckCircle } from 'lucide-react'
import { fmt } from '../utils'

interface Contratista {
  nombre: string
  rut: string
  concepto: string
  honorarioBruto: number
  estadoPago: 'Pagado' | 'Pendiente' | 'Vencido'
  mesDevengado: string
}

const TASA_RETENCION = 0.1075

const CONTRATISTAS: Contratista[] = [
  { nombre: 'Javiera Muñoz Riquelme', rut: '17.345.678-9', concepto: 'Asesoría comunicacional', honorarioBruto: 1_200_000, estadoPago: 'Pagado', mesDevengado: 'Abril 2026' },
  { nombre: 'Felipe Correa Bustamante', rut: '14.222.333-1', concepto: 'Soporte TI mensual', honorarioBruto: 900_000, estadoPago: 'Pendiente', mesDevengado: 'Mayo 2026' },
  { nombre: 'Valentina Ortiz Lagos', rut: '19.111.222-3', concepto: 'Investigación política comparada', honorarioBruto: 1_500_000, estadoPago: 'Pendiente', mesDevengado: 'Mayo 2026' },
  { nombre: 'Gonzalo Parra Espinoza', rut: '12.888.999-K', concepto: 'Servicios contables externos', honorarioBruto: 700_000, estadoPago: 'Vencido', mesDevengado: 'Marzo 2026' },
]

export default function ModuloRetenciones() {
  const pendientesMes = CONTRATISTAS.filter(c => c.estadoPago === 'Pendiente')
  const vencidos = CONTRATISTAS.filter(c => c.estadoPago === 'Vencido')
  const totalRetencionMes = pendientesMes.reduce((s, c) => s + c.honorarioBruto * TASA_RETENCION, 0)
  const totalBrutoMes = pendientesMes.reduce((s, c) => s + c.honorarioBruto, 0)

  const colorEstado = (e: Contratista['estadoPago']) =>
    e === 'Pagado' ? 'bg-green-100 text-green-700' :
    e === 'Vencido' ? 'bg-red-100 text-red-700' :
    'bg-amber-100 text-amber-700'

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: <Calculator size={20} />, label: 'Total honorarios brutos mayo', value: fmt(totalBrutoMes), sub: `${pendientesMes.length} contratos vigentes` },
          { icon: <Calculator size={20} />, label: 'Retención a enterar al SII (10,75%)', value: fmt(totalRetencionMes), sub: 'Vence el día 20 del mes siguiente' },
          { icon: vencidos.length > 0 ? <AlertTriangle size={20} /> : <CheckCircle size={20} />, label: 'Retenciones vencidas sin pagar', value: `${vencidos.length}`, sub: vencidos.length > 0 ? 'Riesgo multa e intereses SII' : 'Al día' },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm flex items-start gap-4">
            <div className={`p-3 rounded-xl ${vencidos.length > 0 && i === 2 ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>{k.icon}</div>
            <div>
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className="text-xl font-semibold text-slate-800">{k.value}</p>
              <p className="text-xs text-slate-400">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alerta vencidos */}
      {vencidos.length > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl px-5 py-4">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Retenciones vencidas — riesgo de multa SII</p>
            <p className="text-xs mt-0.5">
              {vencidos.map(c => `${c.nombre} (${c.mesDevengado} · ${fmt(c.honorarioBruto * TASA_RETENCION)})`).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Tabla contratistas */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Detalle Retenciones Honorarios</h2>
          <p className="text-xs text-slate-500 mt-1">Tasa: 10,75% sobre honorario bruto — Art. 74 N°2 Ley de la Renta</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100">
                {['Contratista', 'RUT', 'Concepto', 'Mes', 'Bruto', 'Retención (10,75%)', 'Líquido', 'Estado F29'].map(h => (
                  <th key={h} className="text-left py-3 px-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CONTRATISTAS.map((c, i) => {
                const retencion = c.honorarioBruto * TASA_RETENCION
                const liquido = c.honorarioBruto - retencion
                return (
                  <tr key={i} className={`border-b border-slate-50 last:border-0 ${c.estadoPago === 'Vencido' ? 'bg-red-50' : 'hover:bg-slate-50'}`}>
                    <td className="py-3 px-4 font-medium text-slate-800">{c.nombre}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs">{c.rut}</td>
                    <td className="py-3 px-4 text-slate-600">{c.concepto}</td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{c.mesDevengado}</td>
                    <td className="py-3 px-4 font-medium whitespace-nowrap">{fmt(c.honorarioBruto)}</td>
                    <td className="py-3 px-4 font-semibold text-red-700 whitespace-nowrap">{fmt(retencion)}</td>
                    <td className="py-3 px-4 text-green-700 whitespace-nowrap">{fmt(liquido)}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${colorEstado(c.estadoPago)}`}>{c.estadoPago}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                <td colSpan={4} className="py-3 px-4 text-slate-700">Total mayo (pendientes)</td>
                <td className="py-3 px-4 text-slate-800">{fmt(totalBrutoMes)}</td>
                <td className="py-3 px-4 text-red-700">{fmt(totalRetencionMes)}</td>
                <td className="py-3 px-4 text-green-700">{fmt(totalBrutoMes - totalRetencionMes)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Resumen F29 */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-indigo-800 mb-3">Resumen Obligación F29 — Junio 2026 (por honorarios mayo)</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-indigo-500 text-xs">Código 92 (retención honorarios)</p>
            <p className="text-lg font-bold text-indigo-800">{fmt(totalRetencionMes)}</p>
          </div>
          <div>
            <p className="text-indigo-500 text-xs">Fecha límite presentación</p>
            <p className="text-lg font-bold text-indigo-800">20 de junio 2026</p>
          </div>
          <div>
            <p className="text-indigo-500 text-xs">Número de boletas a declarar</p>
            <p className="text-lg font-bold text-indigo-800">{pendientesMes.length}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
