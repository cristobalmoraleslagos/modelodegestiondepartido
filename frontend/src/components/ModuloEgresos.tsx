import { useState } from 'react'
import { Receipt, AlertTriangle, CheckCircle, FileText } from 'lucide-react'
import { fmt } from '../utils'

interface Egreso {
  id: number
  fecha: string
  proveedor: string
  rut: string
  concepto: string
  tipoDoc: 'Factura' | 'Boleta' | 'Sin documento'
  nroDoc: string
  monto: number
  cuenta: string
  responsable: string
}

const EGRESOS: Egreso[] = [
  { id: 1, fecha: '2026-05-02', proveedor: 'Inmobiliaria Los Robles', rut: '76.100.200-1', concepto: 'Arriendo oficina central', tipoDoc: 'Factura', nroDoc: 'F-004521', monto: 850_000, cuenta: 'Operacional', responsable: 'Ana Pérez' },
  { id: 2, fecha: '2026-05-03', proveedor: 'Entel S.A.', rut: '92.580.000-7', concepto: 'Plan telefonía e internet', tipoDoc: 'Factura', nroDoc: 'F-198843', monto: 124_900, cuenta: 'Operacional', responsable: 'Carlos Ruiz' },
  { id: 3, fecha: '2026-05-05', proveedor: 'Juan Vásquez Imprenta', rut: '13.456.789-0', concepto: 'Impresión material campaña comunal', tipoDoc: 'Boleta', nroDoc: 'B-000812', monto: 342_000, cuenta: 'Campaña', responsable: 'Ana Pérez' },
  { id: 4, fecha: '2026-05-07', proveedor: 'Proveedores Varios', rut: '—', concepto: 'Colación reunión directiva', tipoDoc: 'Sin documento', nroDoc: '—', monto: 48_000, cuenta: 'Operacional', responsable: 'Pedro Soto' },
  { id: 5, fecha: '2026-05-10', proveedor: 'Clínica Digital SpA', rut: '77.321.100-8', concepto: 'Diseño web institucional', tipoDoc: 'Factura', nroDoc: 'F-000234', monto: 1_190_000, cuenta: 'Operacional', responsable: 'Ana Pérez' },
  { id: 6, fecha: '2026-05-12', proveedor: 'Enel Distribución', rut: '94.270.000-3', concepto: 'Electricidad oficina', tipoDoc: 'Factura', nroDoc: 'F-774901', monto: 67_300, cuenta: 'Operacional', responsable: 'Carlos Ruiz' },
  { id: 7, fecha: '2026-05-14', proveedor: 'Hotel Intercity', rut: '96.555.100-2', concepto: 'Jornada regional norte', tipoDoc: 'Factura', nroDoc: 'F-002201', monto: 780_000, cuenta: 'Formación Ciudadana', responsable: 'Ana Pérez' },
  { id: 8, fecha: '2026-05-15', proveedor: 'Sin identificar', rut: '—', concepto: 'Gasto terreno no rendido', tipoDoc: 'Sin documento', nroDoc: '—', monto: 95_000, cuenta: 'Operacional', responsable: 'Pedro Soto' },
  { id: 9, fecha: '2026-05-18', proveedor: 'Agua Andina S.A.', rut: '95.064.000-6', concepto: 'Servicio agua', tipoDoc: 'Factura', nroDoc: 'F-100234', monto: 18_400, cuenta: 'Operacional', responsable: 'Carlos Ruiz' },
  { id: 10, fecha: '2026-05-20', proveedor: 'Librería Universitaria', rut: '78.200.300-5', concepto: 'Material formación política', tipoDoc: 'Boleta', nroDoc: 'B-005512', monto: 156_000, cuenta: 'Formación Ciudadana', responsable: 'María González' },
]

const CUENTAS = ['Todas', 'Operacional', 'Campaña', 'Formación Ciudadana']

export default function ModuloEgresos() {
  const [filtroCuenta, setFiltroCuenta] = useState('Todas')
  const [showForm, setShowForm] = useState(false)

  const filtrados = filtroCuenta === 'Todas' ? EGRESOS : EGRESOS.filter(e => e.cuenta === filtroCuenta)
  const totalMes = EGRESOS.reduce((s, e) => s + e.monto, 0)
  const sinDoc = EGRESOS.filter(e => e.tipoDoc === 'Sin documento')
  const pctDocumentados = Math.round(((EGRESOS.length - sinDoc.length) / EGRESOS.length) * 100)
  const mayorEgreso = EGRESOS.reduce((max, e) => e.monto > max.monto ? e : max, EGRESOS[0])

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: <Receipt size={20} />, label: 'Total egresos mayo', value: fmt(totalMes), sub: `${EGRESOS.length} transacciones` },
          { icon: <FileText size={20} />, label: 'Documentados con boleta/factura', value: `${pctDocumentados}%`, sub: `${sinDoc.length} sin respaldo — riesgo auditoría` },
          { icon: <AlertTriangle size={20} />, label: 'Mayor egreso del mes', value: fmt(mayorEgreso.monto), sub: mayorEgreso.concepto },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">{k.icon}</div>
            <div>
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className="text-xl font-semibold text-slate-800">{k.value}</p>
              <p className="text-xs text-slate-400">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alerta sin documento */}
      {sinDoc.length > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl px-5 py-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Egresos sin documento tributario ({sinDoc.length})</p>
            <p className="text-xs mt-0.5">{sinDoc.map(e => e.concepto).join(' · ')} — requieren regularización antes del cierre trimestral.</p>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Libro de Egresos — Mayo 2026</h2>
          <div className="flex items-center gap-3">
            <select
              value={filtroCuenta}
              onChange={e => setFiltroCuenta(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
            >
              {CUENTAS.map(c => <option key={c}>{c}</option>)}
            </select>
            <button
              onClick={() => setShowForm(v => !v)}
              className="bg-indigo-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              + Nuevo egreso
            </button>
          </div>
        </div>

        {showForm && (
          <div className="p-5 border-b border-slate-100 bg-slate-50 rounded-t-none">
            <p className="text-sm text-slate-500 italic">Formulario de ingreso en desarrollo — integración con backend requerida.</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100">
                {['Fecha', 'Proveedor', 'RUT', 'Concepto', 'Documento', 'Monto', 'Cuenta', 'Responsable'].map(h => (
                  <th key={h} className="text-left py-3 px-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(e => (
                <tr key={e.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{e.fecha}</td>
                  <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">{e.proveedor}</td>
                  <td className="py-3 px-4 text-slate-500 text-xs">{e.rut}</td>
                  <td className="py-3 px-4 text-slate-600">{e.concepto}</td>
                  <td className="py-3 px-4">
                    {e.tipoDoc === 'Sin documento'
                      ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Sin doc.</span>
                      : <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{e.tipoDoc} {e.nroDoc}</span>}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-slate-700 whitespace-nowrap">{fmt(e.monto)}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      e.cuenta === 'Campaña' ? 'bg-orange-100 text-orange-700' :
                      e.cuenta === 'Formación Ciudadana' ? 'bg-purple-100 text-purple-700' :
                      'bg-slate-100 text-slate-600'}`}>
                      {e.cuenta}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{e.responsable}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50">
                <td colSpan={5} className="py-3 px-4 text-sm font-semibold text-slate-700">Total filtrado</td>
                <td className="py-3 px-4 text-right font-bold text-slate-800">
                  {fmt(filtrados.reduce((s, e) => s + e.monto, 0))}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
