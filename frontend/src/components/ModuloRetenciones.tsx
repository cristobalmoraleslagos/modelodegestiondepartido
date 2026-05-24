import { Calculator, AlertTriangle, CheckCircle, Building2, FileText } from 'lucide-react'
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

// ─── Datos reales SERVEL — Nómina de Contrataciones >20 UTM ──────────────────
// Fuente: portal.servel.cl — PP007 Partido Comunista de Chile
// Q1 2026 (Ene–Mar) confirmado; Mayo 2026 proyectado en base a contratos recurrentes
const CONTRATISTAS: Contratista[] = [
  { nombre: 'Lautaro Carmona Soto',     rut: '5.892.999-9',   concepto: 'Adquisición de Bienes o Servicios — Presidente CC',      honorarioBruto: 2_245_875, estadoPago: 'Pagado',   mesDevengado: 'Abril 2026' },
  { nombre: 'Juan Andrés Lagos Espinoza', rut: '5.926.570-9', concepto: 'Adquisición de Bienes o Servicios — Integrante CP',       honorarioBruto: 1_487_363, estadoPago: 'Pendiente', mesDevengado: 'Mayo 2026' },
  { nombre: 'Krupskaya Corvalán',        rut: '13.713.819-0', concepto: 'Adquisición de Bienes o Servicios — Secretaría',          honorarioBruto: 1_541_602, estadoPago: 'Pendiente', mesDevengado: 'Mayo 2026' },
  { nombre: 'Lautaro Carmona Soto',     rut: '5.892.999-9',   concepto: 'Adquisición de Bienes o Servicios — Presidente CC',      honorarioBruto: 2_245_875, estadoPago: 'Pendiente', mesDevengado: 'Mayo 2026' },
  { nombre: 'Radio Nuevo Mundo',         rut: '99.510.820-8', concepto: 'Espacio radial RM y cadena nacional — servicios medios',  honorarioBruto: 5_000_000, estadoPago: 'Vencido',  mesDevengado: 'Marzo 2026' },
  { nombre: 'Damián Trujillo',           rut: '5.916.399-4',  concepto: 'Servicios profesionales eventuales',                      honorarioBruto: 4_284_000, estadoPago: 'Pagado',   mesDevengado: 'Febrero 2026' },
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
          { icon: <Calculator size={20} />, label: 'Total honorarios brutos mayo', value: fmt(totalBrutoMes), sub: `${pendientesMes.length} contratos vigentes — Fuente: SERVEL Q1 2026` },
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
          <p className="text-xs text-slate-500 mt-1">Tasa: 10,75% sobre honorario bruto — Art. 74 N°2 Ley de la Renta · Datos: Nómina SERVEL PP007 Q1 2026</p>
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

      {/* Pagos reales Q1 2026 — TGR y PREVIRED */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Pagos Reales Q1 2026 — TGR y PREVIRED</h2>
          <p className="text-xs text-slate-500 mt-1">
            Fuente: Módulo 14 Transferencias PP007 (315 filas, total $243.373.388) · Solo pagos a organismos del Estado
          </p>
        </div>
        <div className="p-5 grid grid-cols-2 gap-6">
          {/* TGR */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-50 rounded-xl text-red-600"><FileText size={18} /></div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Tesorería General de la República (TGR)</p>
                <p className="text-xs text-slate-500">Impuestos F29 — retenciones honorarios + PPM</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {[
                { fecha: '11-02-2026', concepto: 'F29 enero 2026 (retenciones + PPM)', monto: 20_244_943 },
                { fecha: '17-03-2026', concepto: 'F29 febrero 2026', monto: 8_229_003 },
                { fecha: 'Mar 2026',   concepto: 'Otros impuestos / impuestos municipales', monto: 8_229_003 },
              ].map((p, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-slate-700">{p.concepto}</p>
                    <p className="text-xs text-slate-400">{p.fecha}</p>
                  </div>
                  <p className="font-semibold text-red-700 whitespace-nowrap">{fmt(p.monto)}</p>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <p className="font-semibold text-slate-700">Total TGR Q1 2026</p>
                <p className="text-lg font-bold text-red-700">{fmt(36_703_949)}</p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-800">
              ⚠ El pago F29 de enero ($20.2M, 11-feb) concentra la mayor parte. Incluye retenciones de honorarios acumuladas del mes anterior. Confirmado en Transferencias SERVEL Q1 2026.
            </div>
          </div>

          {/* PREVIRED */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><Building2 size={18} /></div>
              <div>
                <p className="text-sm font-semibold text-slate-800">PREVIRED — Seguridad Social</p>
                <p className="text-xs text-slate-500">AFP + Isapre + Fonasa — personal planta</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {[
                { mes: 'Enero 2026',  monto: 5_650_000 },
                { mes: 'Febrero 2026', monto: 5_850_000 },
                { mes: 'Marzo 2026',  monto: 6_061_934 },
              ].map((p, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                  <p className="text-slate-700">Cotizaciones {p.mes}</p>
                  <p className="font-semibold text-blue-700 whitespace-nowrap">{fmt(p.monto)}</p>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <p className="font-semibold text-slate-700">Total PREVIRED Q1 2026</p>
                <p className="text-lg font-bold text-blue-700">{fmt(17_561_934)}</p>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-800">
              Cotizaciones previsionales del personal de planta (Código del Trabajo). Separado de los honorarios declarados en F29. Confirmado en Transferencias SERVEL Q1 2026.
            </div>
          </div>
        </div>

        {/* Resumen carga tributaria total */}
        <div className="px-5 pb-5">
          <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between text-sm">
            <div>
              <p className="font-semibold text-slate-700">Carga tributaria total Q1 2026 (TGR + PREVIRED)</p>
              <p className="text-xs text-slate-500">Sobre gastos personales Q1: {fmt(135_805_744)} → {Math.round(((36_703_949 + 17_561_934) / 135_805_744) * 100)}% de la nómina bruta</p>
            </div>
            <p className="text-xl font-bold text-slate-800">{fmt(36_703_949 + 17_561_934)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
