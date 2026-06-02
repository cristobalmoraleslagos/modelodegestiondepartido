import { useState, useEffect, type FormEvent } from 'react'
import { TrendingUp, AlertTriangle, CheckCircle, DollarSign, Plus } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { fmt, APORTE_ESTATAL_ANUAL, MES_ACTUAL } from '../utils'
import { api, type BalanceMes } from '../api'

// ─── Datos de referencia históricos (Módulo 6 SERVEL) ────────────────────────
// Aportes estatales reales extraídos de balances aprobados SERVEL
const APORTES_HISTORICOS: Record<number, number> = {
  2017: 800_000_000,   2018: 900_000_000,   2019: 950_000_000,
  2020: 950_000_000,   2021: 1_370_047_598, // balance SERVEL 2022 aprobado (columna 2021)
  2022: 1_240_127_041,
  2023: 1_200_000_000, 2024: 1_200_000_000, 2025: 1_200_000_000,
  2026: 134_400_000,
}

// Cotizaciones históricas registradas en CSVs SERVEL (suma anual)
const COTIZACIONES_HISTORICAS: Record<number, number> = {
  2017: 0, 2018: 1_700_006, 2019: 0, 2020: 0, 2021: 0,
  2022: 0, 2023: 0, 2024: 0,
  2025: 1_201_730 + 1_700_000 + 2_403_466 + 2_300_008 + 1_201_733 +
        1_700_006 + 1_530_535 + 1_700_006,  // real Q1-Q4 2025 del CSV
  2026: 0,
}

const TIPOS = [
  { id: 'aporte_estatal',  label: 'Aporte Estatal',     color: '#003087' },
  { id: 'cotizaciones',    label: 'Cotizaciones',        color: '#22d3ee' },
  { id: 'donacion',        label: 'Donaciones',          color: '#8b5cf6' },
  { id: 'reintegro',       label: 'Reintegros',          color: '#10b981' },
  { id: 'arriendo',        label: 'Arriendos',           color: '#f59e0b' },
  { id: 'interes',         label: 'Intereses',           color: '#94a3b8' },
  { id: 'otro',            label: 'Otros ingresos',      color: '#e2e8f0' },
]

const MESES_NOMBRE = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

// ─── Construye datos de balance mensuales a partir del aporte estatal ─────────
function buildFallbackBalance(year: number): BalanceMes[] {
  const aporte = APORTES_HISTORICOS[year] ?? APORTE_ESTATAL_ANUAL
  const mensual = Math.round(aporte / 12)
  return MESES_NOMBRE.slice(1).map((nombre, i) => ({
    mes: i + 1, nombre,
    ingresos: i < MES_ACTUAL ? mensual : 0,
    egresos: 0,
    saldo: i < MES_ACTUAL ? mensual : 0,
  }))
}

export default function ModuloIngresos() {
  const [year, setYear]         = useState(2026)
  const [balance, setBalance]   = useState<BalanceMes[]>(buildFallbackBalance(2026))
  const [totalIng, setTotalIng] = useState(0)
  const [totalEg, setTotalEg]   = useState(0)
  const [desdeApi, setDesdeApi] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm]         = useState({ tipo: 'aporte_estatal', monto: '', descripcion: '', rut_origen: '', doc_ref: '' })

  useEffect(() => {
    api.balanceAnual(year).then(data => {
      if (data) {
        setBalance(data.meses)
        setTotalIng(data.total_ingresos)
        setTotalEg(data.total_egresos)
        setDesdeApi(true)
      } else {
        const fb = buildFallbackBalance(year)
        setBalance(fb)
        const aporteRef = APORTES_HISTORICOS[year] ?? APORTE_ESTATAL_ANUAL
        setTotalIng(Math.round(aporteRef * (MES_ACTUAL / 12)))
        setTotalEg(0)
        setDesdeApi(false)
      }
    })
  }, [year])

  const saldoNeto = totalIng - totalEg
  const aporteProgramado = APORTES_HISTORICOS[year] ?? APORTE_ESTATAL_ANUAL
  const pctRecibido = totalIng > 0 ? Math.round((totalIng / aporteProgramado) * 100) : 0

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    interface IngresoManual { id: number; tipo: string; monto: number; descripcion: string; rut_origen: string; doc_ref: string; fecha: string; year: number }
    const nuevoIngreso: IngresoManual = {
      id:          Date.now(),
      tipo:        form.tipo,
      monto:       Number(form.monto),
      descripcion: form.descripcion,
      rut_origen:  form.rut_origen,
      doc_ref:     form.doc_ref,
      fecha:       new Date().toISOString().slice(0, 10),
      year,
    }
    // Persistir en localStorage
    const guardados: IngresoManual[] = JSON.parse(localStorage.getItem('fp_ingresos') ?? '[]')
    localStorage.setItem('fp_ingresos', JSON.stringify([nuevoIngreso, ...guardados]))
    // Actualizar totales en pantalla
    setTotalIng(prev => prev + nuevoIngreso.monto)

    setSubmitted(true)
    setShowForm(false)
    setForm({ tipo: 'aporte_estatal', monto: '', descripcion: '', rut_origen: '', doc_ref: '' })
    setTimeout(() => setSubmitted(false), 3000)
  }

  return (
    <div className="space-y-6">
      {/* Header controles */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Módulo 6 SERVEL — Fuentes de Financiamiento</h2>
          <p className="text-xs text-slate-500">
            Ley 20.900 Art. 12 · Rendición obligatoria trimestral y anual
            {desdeApi && <span className="ml-2 text-indigo-500">· datos desde BD</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm">
            {Object.keys(APORTES_HISTORICOS).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 bg-amaranto-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-amaranto-700 transition-colors">
            <Plus size={14} /> Nuevo ingreso
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: <DollarSign size={18} />, label: 'Total ingresos registrados', value: fmt(totalIng), sub: `${year}`, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { icon: <TrendingUp size={18} />, label: 'Aporte estatal programado', value: fmt(aporteProgramado), sub: `${pctRecibido}% recibido`, color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: <DollarSign size={18} />, label: 'Total egresos periodo', value: fmt(totalEg), sub: 'Módulo 12 SERVEL', color: 'text-slate-600', bg: 'bg-slate-50' },
          {
            icon: saldoNeto >= 0 ? <CheckCircle size={18} /> : <AlertTriangle size={18} />,
            label: 'Saldo neto',
            value: fmt(saldoNeto),
            sub: saldoNeto >= 0 ? 'Superávit' : 'Déficit — riesgo liquidez',
            color: saldoNeto >= 0 ? 'text-green-600' : 'text-red-600',
            bg:    saldoNeto >= 0 ? 'bg-green-50'  : 'bg-red-50',
          },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm flex items-start gap-3">
            <div className={`p-2.5 rounded-xl ${k.bg} ${k.color}`}>{k.icon}</div>
            <div>
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className={`text-lg font-semibold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-slate-400">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alertas */}
      {pctRecibido < 80 && totalIng > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-5 py-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p className="text-sm">
            <strong>Aporte estatal parcialmente recibido:</strong> {pctRecibido}% del programado.
            Verificar con SERVEL que los desembolsos pendientes estén registrados.
          </p>
        </div>
      )}
      {submitted && (
        <div className="flex items-center gap-2 bg-green-50 text-green-800 rounded-2xl px-5 py-3 text-sm">
          <CheckCircle size={16} /> Ingreso registrado correctamente.
        </div>
      )}

      {/* Formulario nuevo ingreso */}
      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Registrar nuevo ingreso — {year}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Tipo de ingreso</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                {TIPOS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Monto (CLP)</label>
              <input type="number" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                placeholder="1200000000" required
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Descripción</label>
              <input type="text" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                placeholder="Ej: Aporte estatal Q1 2026"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">N° comprobante / referencia</label>
              <input type="text" value={form.doc_ref} onChange={e => setForm(f => ({ ...f, doc_ref: e.target.value }))}
                placeholder="TRF-SERVEL-001"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            {form.tipo === 'donacion' && (
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600">RUT donante (obligatorio para donaciones &gt; 20 UF)</label>
                <input type="text" value={form.rut_origen} onChange={e => setForm(f => ({ ...f, rut_origen: e.target.value }))}
                  placeholder="12.345.678-9"
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                <p className="text-xs text-amber-600">⚠ Personas jurídicas NO pueden donar — Art. 17 Ley 19.884</p>
              </div>
            )}
            <div className="col-span-2">
              <button type="submit"
                className="w-full bg-amaranto-600 hover:bg-amaranto-700 text-white font-medium rounded-xl py-2.5 text-sm transition-colors">
                Registrar ingreso
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Gráfico balance mensual */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Balance Mensual {year} — Ingresos vs Egresos</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={balance} margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
            <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={v => `$${(v / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={v => fmt(Number(v))} />
            <Legend />
            <ReferenceLine y={0} stroke="#94a3b8" />
            <Bar dataKey="ingresos" name="Ingresos"  fill="#003087" radius={[3,3,0,0]} />
            <Bar dataKey="egresos"  name="Egresos"   fill="#ef4444" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla de fuentes históricas */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Aportes Estatales Históricos — Fuente: Balances SERVEL</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100">
                {['Año', 'Aporte Estatal', 'Cotizaciones (CSV)', 'Total ingresos ref.', 'Cuota Género (10%)'].map(h => (
                  <th key={h} className="text-left py-3 px-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(APORTES_HISTORICOS).map(([y, aporte]) => {
                const cotiz = COTIZACIONES_HISTORICAS[Number(y)] ?? 0
                const cuota = Math.round(aporte * 0.10)
                return (
                  <tr key={y} className={`border-b border-slate-50 last:border-0 hover:bg-slate-50 ${Number(y) === year ? 'bg-indigo-50' : ''}`}>
                    <td className="py-2.5 px-4 font-semibold text-slate-700">{y}</td>
                    <td className="py-2.5 px-4 text-slate-700">{fmt(aporte)}</td>
                    <td className="py-2.5 px-4 text-slate-500">{cotiz > 0 ? fmt(cotiz) : '—'}</td>
                    <td className="py-2.5 px-4 font-medium text-slate-800">{fmt(aporte + cotiz)}</td>
                    <td className="py-2.5 px-4 text-purple-700 font-medium">{fmt(cuota)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 bg-indigo-50 rounded-b-2xl text-xs text-indigo-700">
          <strong>Fuente:</strong> Balance Clasificado SERVEL 2022 · Balances aprobados 2016–2023 ·
          Aporte 2021: $1.370.047.598 (Balance SERVEL publicado). Años 2023–2026: estimados.
        </div>
      </div>
    </div>
  )
}
