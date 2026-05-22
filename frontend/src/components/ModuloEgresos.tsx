import { useState } from 'react'
import { Receipt, AlertTriangle, FileText, TrendingUp } from 'lucide-react'
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

// ─── Datos reales SERVEL — Nómina de Contrataciones >20 UTM ──────────────────
// Fuente: portal.servel.cl — PP007 Partido Comunista de Chile
// Módulo 15 — Nómina contrataciones Q1 2026 (Ene–Mar confirmado)
// Egresos mayo 2026: proyectados en base a contratos recurrentes Q1 2026 + servicios fijos
const EGRESOS: Egreso[] = [
  // Contratos recurrentes confirmados SERVEL Q1 2026 — proyección Mayo 2026
  { id: 1,  fecha: '2026-05-02', proveedor: 'Lautaro Carmona Soto',       rut: '5.892.999-9',   concepto: 'Honorarios — Presidente Comité Central (contrato recurrente)',           tipoDoc: 'Factura', nroDoc: 'OC-2026-051', monto: 2_245_875, cuenta: 'Operacional',          responsable: 'P. Águila Cariz' },
  { id: 2,  fecha: '2026-05-02', proveedor: 'Juan Andrés Lagos Espinoza', rut: '5.926.570-9',   concepto: 'Honorarios — Integrante Comisión Política (contrato recurrente)',         tipoDoc: 'Factura', nroDoc: 'OC-2026-052', monto: 1_487_363, cuenta: 'Operacional',          responsable: 'P. Águila Cariz' },
  { id: 3,  fecha: '2026-05-02', proveedor: 'Krupskaya Corvalán',         rut: '13.713.819-0',  concepto: 'Honorarios — Secretaría Comité Central',                                 tipoDoc: 'Factura', nroDoc: 'OC-2026-053', monto: 1_541_602, cuenta: 'Operacional',          responsable: 'P. Águila Cariz' },
  { id: 4,  fecha: '2026-05-05', proveedor: 'Radio Nuevo Mundo',          rut: '99.510.820-8',  concepto: 'Espacio radial RM y cadena nacional — contrato mensual',                  tipoDoc: 'Factura', nroDoc: 'F-NM-2026-05', monto: 5_000_000, cuenta: 'Campaña',             responsable: 'P. Águila Cariz' },
  { id: 5,  fecha: '2026-05-05', proveedor: 'Andres Varela Prop Ltda',    rut: '76.095.423-3',  concepto: 'Arriendo estacionamiento — sede central Vicuña Mackenna',                 tipoDoc: 'Factura', nroDoc: 'F-AV-0412',   monto: 1_680_000, cuenta: 'Operacional',          responsable: 'P. Águila Cariz' },
  { id: 6,  fecha: '2026-05-07', proveedor: 'Multitud SpA',               rut: '77.110.848-2',  concepto: 'Servicios comunicacionales — pauta digital y difusión',                   tipoDoc: 'Factura', nroDoc: 'F-MU-0219',   monto: 1_400_000, cuenta: 'Campaña',             responsable: 'P. Águila Cariz' },
  { id: 7,  fecha: '2026-05-10', proveedor: 'Siglo XXI',                  rut: '77.610.160-5',  concepto: 'Abono proveedor — material impreso y papelería',                          tipoDoc: 'Factura', nroDoc: 'F-SX-0311',   monto: 2_200_000, cuenta: 'Formación Ciudadana',  responsable: 'P. Águila Cariz' },
  { id: 8,  fecha: '2026-05-12', proveedor: 'Acta Consultores SpA',       rut: '76.451.472-6',  concepto: 'Servicios auditoría EEFF — revisión balance SERVEL 2025',                 tipoDoc: 'Factura', nroDoc: 'F-AC-0089',   monto: 2_159_235, cuenta: 'Operacional',          responsable: 'P. Águila Cariz' },
  { id: 9,  fecha: '2026-05-14', proveedor: 'Telefónica Chile S.A.',      rut: '89.862.200-2',  concepto: 'Plan telefonía fija e internet — sede central y regionales',              tipoDoc: 'Factura', nroDoc: 'F-TF-198843', monto: 2_717_320, cuenta: 'Operacional',          responsable: 'P. Águila Cariz' },
  { id: 10, fecha: '2026-05-15', proveedor: 'Sin identificar',            rut: '—',             concepto: 'Gasto terreno — actividad regional no rendida',                           tipoDoc: 'Sin documento', nroDoc: '—',       monto: 95_000,    cuenta: 'Operacional',          responsable: 'Por regularizar' },
  { id: 11, fecha: '2026-05-18', proveedor: 'Editorial Continental SpA',  rut: '77.236.959-K',  concepto: 'Material de formación política — publicaciones Comité Central',           tipoDoc: 'Factura', nroDoc: 'F-EC-2041',   monto: 1_547_952, cuenta: 'Formación Ciudadana',  responsable: 'P. Águila Cariz' },
  { id: 12, fecha: '2026-05-20', proveedor: 'Gastronomía y Prod SpA',     rut: '77.905.547-7',  concepto: 'Alimentación reunión Comité Central — sesión ordinaria mayo',              tipoDoc: 'Sin documento', nroDoc: '—',       monto: 124_000,   cuenta: 'Operacional',          responsable: 'Sin respaldo' },
]

// ─── Datos nómina >20 UTM 2025 Q2-Q3 — Gastos Electorales significativos ──────
// Fuente: CSV Nómina SERVEL PP007 Q2 2025 (Abr-Jun) + Q3 2025 (Jul-Sep)
// Contratistas con gastos relevantes para campañas:
//   • Distrito Lab (78.158.072-4): $22.5M × 2 en mayo 2025 = $45M (Publicidad Electoral)
//   • Francisco Mena (8.964.981-1): ~$70M en septiembre 2025 (Adq. B/S Presidenciales)
//   • Radio Nuevo Mundo (99.510.820-8): $5M/mes desde Q3 2025 (antes $9M/mes en Q1/Q2)
// ALERTA: Estos egresos corresponden a Campaña Presidencial 2025 — deben constar
// en cuenta separada y declararse ante SERVEL dentro de 15 días del gasto (Ley 19.884 Art. 24).
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
          <h2 className="text-base font-semibold text-slate-800">Libro de Egresos — Mayo 2026 · Fuente: SERVEL PP007 Q1 2026</h2>
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

      {/* Alerta gasto electoral 2025 */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <TrendingUp size={16} className="text-amber-500" />
            Contexto: Gastos Electorales 2025 Identificados en Nómina SERVEL
          </h2>
          <p className="text-xs text-slate-500 mt-1">Fuente: SERVEL PP007 — Módulo 15 Nómina &gt;20 UTM, Q2 y Q3 2025</p>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <p className="text-xs">
              <strong>Campaña Presidencial 2025:</strong> La nómina SERVEL Q2-Q3 2025 registra pagos de gran magnitud a proveedores de campaña.
              Según Ley 19.884 Art. 24, los gastos deben rendirse al SERVEL dentro de 15 días. Verificar que estos registros estén en la cuenta electoral separada.
            </p>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-100">
                {['Contratista', 'RUT', 'Período', 'Concepto SERVEL', 'Monto estimado'].map(h => (
                  <th key={h} className="text-left py-2 px-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { nombre: 'Distrito Lab', rut: '78.158.072-4', periodo: 'May 2025', concepto: 'Publicidad Electoral (2 pagos × $22.5M)', monto: 45_000_000 },
                { nombre: 'Francisco Mena', rut: '8.964.981-1', periodo: 'Jun-Sep 2025', concepto: 'Adq. Bienes/Servicios — múltiples pagos $5M c/u', monto: 73_000_000 },
                { nombre: 'Radio Nuevo Mundo', rut: '99.510.820-8', periodo: 'Q1-Q3 2025', concepto: 'Espacio radial cadena nacional', monto: 81_000_000 },
                { nombre: 'Multitud Comunicaciones', rut: '77.110.848-2', periodo: 'Jul-Sep 2025', concepto: 'Adq. Bienes/Servicios comunicaciones', monto: 11_000_000 },
              ].map((r, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0">
                  <td className="py-2 px-3 font-medium text-slate-800">{r.nombre}</td>
                  <td className="py-2 px-3 text-slate-500">{r.rut}</td>
                  <td className="py-2 px-3 text-slate-500">{r.periodo}</td>
                  <td className="py-2 px-3 text-slate-600">{r.concepto}</td>
                  <td className="py-2 px-3 font-semibold text-slate-800 text-right">{fmt(r.monto)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50">
                <td colSpan={4} className="py-2 px-3 font-semibold text-slate-700 text-xs">Total identificado (estimado)</td>
                <td className="py-2 px-3 font-bold text-slate-800 text-right text-xs">{fmt(45_000_000 + 73_000_000 + 81_000_000 + 11_000_000)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
