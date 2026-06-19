import { useState, useEffect, type FormEvent } from 'react'
import { AlertTriangle, CheckCircle, CreditCard, Plus, ShieldAlert } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { fmt } from '../utils'
import { api, type Prestamo } from '../api'
import { PRESTAMOS_BASE } from '../data/prestamos'

// ─── Datos históricos de deuda (extraídos de CSVs SERVEL 2017-2026) ──────────
// "Gastos financieros por préstamos" + "Créditos" — son los INTERESES pagados,
// no el capital. El capital pendiente se desconoce sin los contratos originales.
const DEUDA_HISTORICA = [
  { año: '2017', intereses: 14_624_151,  capital_est: 0 },
  { año: '2018', intereses:  9_223_745,  capital_est: 0 },
  { año: '2019', intereses: 22_782_511,  capital_est: 0 },
  { año: '2020', intereses:  4_239_907,  capital_est: 0 },
  { año: '2021', intereses:  5_190_130,  capital_est: 0 },
  { año: '2022', intereses:  6_972_582,  capital_est: 0 },
  { año: '2023', intereses: 39_911_198,  capital_est: 0 },
  { año: '2024', intereses: 55_859_733,  capital_est: 0 },
  { año: '2025', intereses: 43_259_103,  capital_est: 0 },
]

// Préstamos reales (fallback sin BD): crédito Banco Estado $480M (data/prestamos.ts)
const PRESTAMOS_FALLBACK: Prestamo[] = PRESTAMOS_BASE

const TIPOS_ACREEDOR = [
  { id: 'banco',              label: 'Banco',                     legal: true  },
  { id: 'cooperativa',        label: 'Cooperativa de ahorro',     legal: true  },
  { id: 'caja_compensacion',  label: 'Caja de compensación',      legal: true  },
  { id: 'otro',               label: 'Otro (⚠ verificar legalidad)', legal: false },
]

const colorEstado = (e: string) =>
  e === 'vigente'      ? 'bg-blue-100 text-blue-700'   :
  e === 'pagado'       ? 'bg-green-100 text-green-700' :
  e === 'vencido'      ? 'bg-red-100 text-red-700'     :
  'bg-amber-100 text-amber-700'

export default function ModuloDeuda() {
  const [prestamos, setPrestamos]   = useState<Prestamo[]>(PRESTAMOS_FALLBACK)
  const [totalDeuda, setTotalDeuda] = useState(0)
  const [ilegales, setIlegales]     = useState<string[]>([])
  const [desdeApi, setDesdeApi]     = useState(false)
  const [showForm, setShowForm]     = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [form, setForm] = useState({
    fecha_inicio: '', acreedor_rut: '', acreedor_nombre: '',
    tipo_acreedor: 'banco', monto_original: '', tasa_interes: '',
    plazo_meses: '', numero_contrato: '', garantia: '',
  })

  useEffect(() => {
    // Cargar registros guardados localmente
    const guardados: Prestamo[] = JSON.parse(localStorage.getItem('fp_prestamos') ?? '[]')

    api.prestamos().then(data => {
      if (data && data.prestamos.length > 0) {
        setPrestamos([...guardados, ...data.prestamos])
        setTotalDeuda(data.total_deuda_vigente + guardados.filter(p => p.estado === 'vigente').reduce((s, p) => s + p.monto_pendiente, 0))
        setIlegales(data.alertas)
        setDesdeApi(true)
      } else {
        const base = [...guardados, ...PRESTAMOS_FALLBACK]
        setPrestamos(base)
        const vigentes = base.filter(p => p.estado === 'vigente')
        setTotalDeuda(vigentes.reduce((s, p) => s + p.monto_pendiente, 0))
        setDesdeApi(false)
      }
    })
  }, [])

  const totalInteresesHistoricos = DEUDA_HISTORICA.reduce((s, d) => s + d.intereses, 0)
  const vigentesFiltrados = prestamos.filter(p => p.estado === 'vigente')
  const totalDeudaCalc    = totalDeuda || vigentesFiltrados.reduce((s, p) => s + p.monto_pendiente, 0)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const tipoInfo = TIPOS_ACREEDOR.find(t => t.id === form.tipo_acreedor)
    if (!tipoInfo?.legal) {
      alert('ALERTA: Este tipo de acreedor NO está permitido por Art. 39 letra f) DFL N°4/2017. Solo bancos, cooperativas y cajas de compensación.')
      return
    }
    const montoNum = Number(form.monto_original)
    const nuevoPrestamo: Prestamo = {
      id: Date.now(),
      fecha_inicio:      form.fecha_inicio,
      acreedor_rut:      form.acreedor_rut,
      acreedor_nombre:   form.acreedor_nombre,
      tipo_acreedor:     form.tipo_acreedor,
      monto_original:    montoNum,
      tasa_interes:      form.tasa_interes ? Number(form.tasa_interes) : null,
      plazo_meses:       form.plazo_meses  ? Number(form.plazo_meses)  : null,
      monto_pendiente:   montoNum,
      estado:            'vigente',
      numero_contrato:   form.numero_contrato || null,
      fecha_vencimiento: null,
      es_legal:          true,
      alerta_legal:      null,
    }
    // Persistir en localStorage
    const guardados: Prestamo[] = JSON.parse(localStorage.getItem('fp_prestamos') ?? '[]')
    localStorage.setItem('fp_prestamos', JSON.stringify([nuevoPrestamo, ...guardados]))
    setPrestamos(prev => [nuevoPrestamo, ...prev])
    setTotalDeuda(prev => prev + montoNum)

    setSubmitted(true)
    setShowForm(false)
    setForm({ fecha_inicio: '', acreedor_rut: '', acreedor_nombre: '', tipo_acreedor: 'banco', monto_original: '', tasa_interes: '', plazo_meses: '', numero_contrato: '', garantia: '' })
    setTimeout(() => setSubmitted(false), 3000)
  }

  const inp = (k: keyof typeof form, t = 'text', ph = '') => (
    <input type={t} placeholder={ph} value={form[k]}
      onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
      className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Módulo de Deuda — Préstamos y Créditos</h2>
          <p className="text-xs text-slate-500">
            Art. 39 letra f) DFL N°4/2017 · Solo bancos e instituciones financieras autorizadas
            {desdeApi && <span className="ml-2 text-indigo-500">· datos desde BD</span>}
          </p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 bg-amaranto-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-amaranto-700 transition-colors">
          <Plus size={14} /> Nuevo préstamo
        </button>
      </div>

      {/* Alerta acreedores ilegales */}
      {ilegales.length > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl px-5 py-4">
          <ShieldAlert size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">ALERTA LEGAL — Art. 39 letra f) DFL N°4/2017 ({ilegales.length} préstamo{ilegales.length > 1 ? 's' : ''})</p>
            {ilegales.map((a, i) => <p key={i} className="text-xs mt-0.5">{a}</p>)}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: <CreditCard size={18} />, label: 'Deuda vigente total', value: fmt(totalDeudaCalc), sub: `${vigentesFiltrados.length} préstamos activos`, color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: <CreditCard size={18} />, label: 'Intereses pagados (2017–2025)', value: fmt(totalInteresesHistoricos), sub: 'Fuente: CSVs SERVEL', color: 'text-slate-600', bg: 'bg-slate-50' },
          { icon: ilegales.length > 0 ? <AlertTriangle size={18} /> : <CheckCircle size={18} />, label: 'Cumplimiento Art. 14', value: ilegales.length > 0 ? 'RIESGO LEGAL' : 'Conforme', sub: ilegales.length > 0 ? `${ilegales.length} acreedor(es) no autorizado(s)` : 'Todos los acreedores son válidos', color: ilegales.length > 0 ? 'text-red-600' : 'text-green-600', bg: ilegales.length > 0 ? 'bg-red-50' : 'bg-green-50' },
          { icon: <CreditCard size={18} />, label: 'Próximo vencimiento', value: prestamos.filter(p => p.fecha_vencimiento && p.estado === 'vigente').sort((a, b) => (a.fecha_vencimiento ?? '').localeCompare(b.fecha_vencimiento ?? ''))[0]?.fecha_vencimiento ?? '—', sub: 'Fecha más cercana', color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm flex items-start gap-3">
            <div className={`p-2.5 rounded-xl ${k.bg} ${k.color}`}>{k.icon}</div>
            <div>
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className={`text-base font-semibold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-slate-400">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {submitted && (
        <div className="flex items-center gap-2 bg-green-50 text-green-800 rounded-2xl px-5 py-3 text-sm">
          <CheckCircle size={16} /> Préstamo registrado. Recordar cargar el contrato en los documentos requeridos.
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Registrar nuevo préstamo</h3>
          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            <strong>Art. 39 letra f) DFL N°4/2017:</strong> Los partidos solo pueden contraer préstamos con bancos, cooperativas de ahorro y crédito, o cajas de compensación. Préstamos de personas naturales o empresas son ILEGALES.
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
            {[
              ['Fecha inicio', inp('fecha_inicio', 'date')],
              ['RUT acreedor', inp('acreedor_rut', 'text', '97.036.000-K')],
              ['Nombre institución', inp('acreedor_nombre', 'text', 'Banco Estado')],
              ['Monto original (CLP)', inp('monto_original', 'number', '50000000')],
              ['Tasa interés (% anual)', inp('tasa_interes', 'number', '7.5')],
              ['Plazo (meses)', inp('plazo_meses', 'number', '36')],
              ['N° contrato', inp('numero_contrato', 'text', 'CRE-2026-001')],
              ['Garantía (si aplica)', inp('garantia', 'text', 'Prenda, hipoteca, etc.')],
            ].map(([label, node], i) => (
              <div key={i} className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600">{label}</label>
                {node}
              </div>
            ))}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Tipo de acreedor</label>
              <select value={form.tipo_acreedor} onChange={e => setForm(f => ({ ...f, tipo_acreedor: e.target.value }))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                {TIPOS_ACREEDOR.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            {form.tipo_acreedor === 'otro' && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-800 rounded-lg px-3 py-2 text-xs col-span-2">
                <AlertTriangle size={14} /> Este tipo de acreedor puede infringir el Art. 39 letra f) DFL N°4/2017. Consulte con el abogado del partido antes de continuar.
              </div>
            )}
            <div className="col-span-2">
              <button type="submit"
                className="w-full bg-amaranto-600 hover:bg-amaranto-700 text-white font-medium rounded-xl py-2.5 text-sm transition-colors">
                Registrar préstamo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Gráfico histórico de intereses */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">Gastos Financieros por Préstamos 2017–2025</h3>
        <p className="text-xs text-slate-500 mb-4">Fuente: CSVs SERVEL — ítems "Gastos financieros por préstamos" y "Créditos"</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={DEUDA_HISTORICA} margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
            <XAxis dataKey="año" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={v => `$${(v / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={v => fmt(Number(v))} />
            <Bar dataKey="intereses" name="Intereses pagados" radius={[4,4,0,0]}>
              {DEUDA_HISTORICA.map((_, i) => (
                <Cell key={i} fill={DEUDA_HISTORICA[i].intereses > 40_000_000 ? '#ef4444' : '#003087'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla de préstamos */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Registro de Préstamos</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100">
                {['Acreedor', 'RUT', 'Tipo', 'Monto original', 'Pendiente', 'Tasa', 'Vencimiento', 'Estado', 'Legal'].map(h => (
                  <th key={h} className="text-left py-3 px-4 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prestamos.map((p, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">{p.acreedor_nombre}</td>
                  <td className="py-3 px-4 text-slate-500 text-xs">{p.acreedor_rut}</td>
                  <td className="py-3 px-4 text-slate-500 capitalize text-xs">{p.tipo_acreedor.replace('_', ' ')}</td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{fmt(p.monto_original)}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">{fmt(p.monto_pendiente)}</td>
                  <td className="py-3 px-4 text-slate-500">{p.tasa_interes != null ? `${p.tasa_interes}%` : '—'}</td>
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{p.fecha_vencimiento ?? '—'}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${colorEstado(p.estado)}`}>{p.estado}</span>
                  </td>
                  <td className="py-3 px-4">
                    {p.es_legal
                      ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Legal</span>
                      : <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">⚠ Ilegal</span>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td colSpan={4} className="py-3 px-4 text-sm font-semibold text-slate-700">Total deuda vigente</td>
                <td className="py-3 px-4 font-bold text-slate-800">{fmt(totalDeudaCalc)}</td>
                <td colSpan={4} />
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="px-5 py-3 bg-slate-50 rounded-b-2xl text-xs text-slate-500">
          Los montos pendientes son estimados. Cargar contratos originales y tablas de amortización para valores exactos.
        </div>
      </div>

      {/* Marco normativo */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-xs text-indigo-700 space-y-1">
        <p><strong>Art. 39 letra f) DFL N°4/2017:</strong> Los partidos políticos solo podrán contraer créditos con bancos e instituciones financieras sometidos a la fiscalización de la Comisión para el Mercado Financiero (CMF).</p>
        <p><strong>Documentos requeridos por préstamo:</strong> Contrato firmado · Tabla de amortización · Comprobante desembolso · Garantías si aplica.</p>
        <p><strong>Módulo 17 SERVEL:</strong> Declarar todos los préstamos vigentes en la rendición anual con nombre del acreedor, monto, tasa y plazo.</p>
      </div>
    </div>
  )
}
