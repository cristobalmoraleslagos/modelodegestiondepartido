import { useState, useEffect, type FormEvent } from 'react'
import { AlertTriangle, CheckCircle, Vote, Plus, ShieldAlert } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts'
import { fmt, VALOR_UF } from '../utils'
import { api, type AporteCandidato } from '../api'

// ─── Límites Art. 19.884 — aportes de partido a candidatos (en UF) ────────────
const LIMITES_UF: Record<string, number> = {
  presidencial: 10_000,
  senador:       3_000,
  diputado:      1_000,
  alcalde:         500,
  concejal:        200,
  gore:          3_000,
  core:            200,
}

const TIPOS_ELECCION = [
  { id: 'presidencial', label: 'Presidencial'     },
  { id: 'senador',      label: 'Senador/a'         },
  { id: 'diputado',     label: 'Diputado/a'        },
  { id: 'alcalde',      label: 'Alcalde/sa'        },
  { id: 'concejal',     label: 'Concejal/a'        },
  { id: 'gore',         label: 'Gobernador/a Reg.' },
  { id: 'core',         label: 'Consejero/a Reg.'  },
]

// ─── Datos reales 2024–2025 (extraídos de CSVs SERVEL) ───────────────────────
const APORTES_FALLBACK: AporteCandidato[] = [
  // 2025 — Campaña presidencial / parlamentaria
  { id: 1, rut_candidato: '—', nombre_candidato: 'Campaña Presidencial (Colectivo)', tipo_eleccion: 'presidencial', monto: 310_290_000, fecha: '2025-06-01', cuenta_campana: null, dentro_limite: true, pct_del_limite: Math.round(310_290_000 / (10_000 * VALOR_UF) * 100), mensaje_validacion: 'Verificar monto exacto con declaración TRICEL', declarado_servel: false, estado: 'pendiente_verificacion' },
  { id: 2, rut_candidato: '—', nombre_candidato: 'Aportes Campaña Diputados (múltiples)', tipo_eleccion: 'diputado', monto: 85_500_000, fecha: '2025-10-01', cuenta_campana: null, dentro_limite: true, pct_del_limite: Math.round(85_500_000 / (1_000 * VALOR_UF) * 100), mensaje_validacion: 'Distribuido entre varios candidatos — verificar individualmente', declarado_servel: false, estado: 'pendiente_verificacion' },
  { id: 3, rut_candidato: '—', nombre_candidato: 'Aportes Campaña Senadores (múltiples)', tipo_eleccion: 'senador', monto: 31_500_000, fecha: '2025-10-01', cuenta_campana: null, dentro_limite: true, pct_del_limite: Math.round(31_500_000 / (3_000 * VALOR_UF) * 100), mensaje_validacion: 'Distribuido entre candidatos senatoriales', declarado_servel: false, estado: 'pendiente_verificacion' },
  { id: 4, rut_candidato: '—', nombre_candidato: 'Gastos Electorales Diputados', tipo_eleccion: 'diputado', monto: 102_610_982, fecha: '2025-11-01', cuenta_campana: null, dentro_limite: true, pct_del_limite: 25, mensaje_validacion: 'Verificar distribución individual', declarado_servel: false, estado: 'pendiente_verificacion' },
  // 2024 — Alcaldes, concejales, CORES, gobernadores
  { id: 5, rut_candidato: '—', nombre_candidato: 'Campaña Alcaldes (múltiples sedes)', tipo_eleccion: 'alcalde', monto: 279_888_701, fecha: '2024-09-01', cuenta_campana: null, dentro_limite: true, pct_del_limite: Math.round(279_888_701 / (500 * VALOR_UF) * 100), mensaje_validacion: 'Distribuido en múltiples candidatos — validar por RUT', declarado_servel: true, estado: 'declarado' },
  { id: 6, rut_candidato: '—', nombre_candidato: 'Campaña Concejales (múltiples)', tipo_eleccion: 'concejal', monto: 420_766_414, fecha: '2024-09-01', cuenta_campana: null, dentro_limite: false, pct_del_limite: 520, mensaje_validacion: '⚠ AGRUPADO: verificar individualmente — suma total supera límite si es a un solo candidato', declarado_servel: true, estado: 'alerta' },
  { id: 7, rut_candidato: '—', nombre_candidato: 'Campaña CORES (múltiples)', tipo_eleccion: 'core', monto: 329_412_114, fecha: '2024-09-01', cuenta_campana: null, dentro_limite: false, pct_del_limite: 405, mensaje_validacion: '⚠ AGRUPADO: verificar distribución individual por candidato', declarado_servel: true, estado: 'alerta' },
  { id: 8, rut_candidato: '—', nombre_candidato: 'Campaña Gobernadores Reg. (múltiples)', tipo_eleccion: 'gore', monto: 122_907_895, fecha: '2024-09-01', cuenta_campana: null, dentro_limite: true, pct_del_limite: 10, mensaje_validacion: 'Distribuido — verificar por región', declarado_servel: true, estado: 'declarado' },
]

const colorEstado = (e: string) =>
  e === 'declarado'              ? 'bg-green-100 text-green-700'  :
  e === 'alerta'                 ? 'bg-red-100 text-red-700'      :
  e === 'pendiente_verificacion' ? 'bg-amber-100 text-amber-700'  :
  'bg-slate-100 text-slate-600'

const colorPct = (pct: number) =>
  pct > 100 ? '#ef4444' : pct > 80 ? '#f59e0b' : '#22c55e'

export default function ModuloAportes() {
  const [year, setYear]         = useState(2025)
  const [aportes, setAportes]   = useState<AporteCandidato[]>(APORTES_FALLBACK.filter(a => new Date(a.fecha).getFullYear() === 2025))
  const [limites, setLimites]   = useState<Record<string, { uf: number; clp: number }>>({})
  const [totalAportes, setTotal] = useState(0)
  const [excedidos, setExcedidos] = useState(0)
  const [noDeclarados, setNoDeclarados] = useState(0)
  const [desdeApi, setDesdeApi] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    rut_candidato: '', nombre_candidato: '', tipo_eleccion: 'diputado',
    monto: '', fecha: '', cuenta_campana: '', nro_transferencia: '',
  })

  useEffect(() => {
    const guardados: AporteCandidato[] = (JSON.parse(localStorage.getItem('fp_aportes') ?? '[]') as AporteCandidato[])
      .filter(a => new Date(a.fecha).getFullYear() === year)
    const fallback = APORTES_FALLBACK.filter(a => new Date(a.fecha).getFullYear() === year)
    const base = [...guardados, ...fallback]
    setAportes(base)
    setTotal(base.reduce((s, a) => s + a.monto, 0))
    setExcedidos(base.filter(a => !a.dentro_limite).length)
    setNoDeclarados(base.filter(a => !a.declarado_servel).length)

    api.aportesCandidatos(year).then(data => {
      if (data && data.aportes.length > 0) {
        setAportes([...guardados, ...data.aportes])
        setLimites(data.limites_por_cargo)
        setTotal(data.total_aportes + guardados.reduce((s, a) => s + a.monto, 0))
        setExcedidos(data.cantidad_exceden_limite)
        setNoDeclarados(data.cantidad_no_declarados_servel)
        setDesdeApi(true)
      }
    })
  }, [year])

  // Gráfico: aportes por tipo de elección (años disponibles)
  const porTipo = TIPOS_ELECCION.map(t => {
    const monto2024 = APORTES_FALLBACK.filter(a => a.tipo_eleccion === t.id && new Date(a.fecha).getFullYear() === 2024).reduce((s, a) => s + a.monto, 0)
    const monto2025 = APORTES_FALLBACK.filter(a => a.tipo_eleccion === t.id && new Date(a.fecha).getFullYear() === 2025).reduce((s, a) => s + a.monto, 0)
    return { tipo: t.label, '2024': monto2024, '2025': monto2025 }
  }).filter(t => t['2024'] > 0 || t['2025'] > 0)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const montoNum = parseInt(form.monto)
    const limiteUF = LIMITES_UF[form.tipo_eleccion] ?? 1000
    const limiteCLP = Math.round(limiteUF * VALOR_UF)
    const dentroLimite = montoNum <= limiteCLP
    if (!dentroLimite) {
      alert(`ALERTA: El monto supera el tope de gasto de ${limiteUF} UF (${fmt(limiteCLP)}) para ${form.tipo_eleccion}.\n\nDFL N°3/2017 prohíbe exceder este límite.`)
    }
    const nuevoAporte: AporteCandidato = {
      id:               Date.now(),
      rut_candidato:    form.rut_candidato,
      nombre_candidato: form.nombre_candidato,
      tipo_eleccion:    form.tipo_eleccion,
      monto:            montoNum,
      fecha:            form.fecha || new Date().toISOString().slice(0, 10),
      cuenta_campana:   form.cuenta_campana || null,
      dentro_limite:    dentroLimite,
      pct_del_limite:   Math.round((montoNum / limiteCLP) * 100),
      mensaje_validacion: dentroLimite ? 'Registrado manualmente — verificar con SERVEL' : `⚠ Supera límite ${limiteUF} UF`,
      declarado_servel: false,
      estado:           dentroLimite ? 'pendiente_verificacion' : 'alerta',
    }
    // Persistir en localStorage
    const todos: AporteCandidato[] = JSON.parse(localStorage.getItem('fp_aportes') ?? '[]')
    localStorage.setItem('fp_aportes', JSON.stringify([nuevoAporte, ...todos]))
    setAportes(prev => [nuevoAporte, ...prev])
    setTotal(prev => prev + montoNum)
    if (!dentroLimite) setExcedidos(prev => prev + 1)
    setNoDeclarados(prev => prev + 1)

    setSubmitted(true)
    setShowForm(false)
    setForm({ rut_candidato: '', nombre_candidato: '', tipo_eleccion: 'diputado', monto: '', fecha: '', cuenta_campana: '', nro_transferencia: '' })
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
          <h2 className="text-base font-semibold text-slate-800">Aportes a Candidatos — DFL N°3/2017 (Ley 19.884)</h2>
          <p className="text-xs text-slate-500">
            Cuenta de campaña separada obligatoria · Topes de gasto por cargo — DFL N°3/2017
            {desdeApi && <span className="ml-2 text-indigo-500">· datos desde BD</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm">
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 bg-amaranto-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-amaranto-700 transition-colors">
            <Plus size={14} /> Nuevo aporte
          </button>
        </div>
      </div>

      {/* Alertas críticas */}
      {excedidos > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl px-5 py-4">
          <ShieldAlert size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">ALERTA LEGAL — DFL N°3/2017 ({excedidos} registro{excedidos > 1 ? 's' : ''} requieren verificación)</p>
            <p className="text-xs mt-0.5">Los aportes agrupados pueden exceder el límite individual por candidato. Verificar distribución por RUT antes del cierre de campaña.</p>
          </div>
        </div>
      )}
      {noDeclarados > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-5 py-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p className="text-sm"><strong>{noDeclarados} aportes sin declarar ante SERVEL.</strong> Art. 47 DFL N°3/2017: rendición de la cuenta electoral dentro de 60 días corridos desde la elección.</p>
        </div>
      )}
      {submitted && (
        <div className="flex items-center gap-2 bg-green-50 text-green-800 rounded-2xl px-5 py-3 text-sm">
          <CheckCircle size={16} /> Aporte registrado. Recordar rendir la cuenta electoral ante SERVEL en 60 días corridos (Art. 47 DFL N°3/2017).
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: <Vote size={18} />, label: 'Total aportes registrados', value: fmt(totalAportes), sub: `${aportes.length} registros — ${year}`, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { icon: <AlertTriangle size={18} />, label: 'Requieren verificación límite', value: String(excedidos), sub: 'Agrupados — validar por RUT', color: excedidos > 0 ? 'text-red-600' : 'text-green-600', bg: excedidos > 0 ? 'bg-red-50' : 'bg-green-50' },
          { icon: <AlertTriangle size={18} />, label: 'Sin declarar en SERVEL', value: String(noDeclarados), sub: 'Plazo: 60 días corridos', color: noDeclarados > 0 ? 'text-amber-600' : 'text-green-600', bg: noDeclarados > 0 ? 'bg-amber-50' : 'bg-green-50' },
          { icon: <CheckCircle size={18} />, label: 'Declarados correctamente', value: String(aportes.filter(a => a.declarado_servel).length), sub: 'Con comprobante SERVEL', color: 'text-green-600', bg: 'bg-green-50' },
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

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Registrar aporte a candidato — {year}</h3>
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 space-y-1">
            <p><strong>DFL N°3/2017:</strong> El pago DEBE realizarse desde la cuenta corriente de campaña del candidato, NO desde la cuenta ordinaria del partido.</p>
            <p><strong>Art. 47 DFL N°3/2017:</strong> Rendir la cuenta electoral ante SERVEL dentro de 60 días corridos desde la elección.</p>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
            {[
              ['RUT candidato', inp('rut_candidato', 'text', '12.345.678-9')],
              ['Nombre candidato', inp('nombre_candidato', 'text', 'Juan Pérez Silva')],
              ['Monto (CLP)', inp('monto', 'number', '5000000')],
              ['Fecha', inp('fecha', 'date')],
              ['Cuenta campaña destino', inp('cuenta_campana', 'text', '00-123456-00')],
              ['N° transferencia', inp('nro_transferencia', 'text', 'TRF-2026-001')],
            ].map(([label, node], i) => (
              <div key={i} className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600">{label}</label>
                {node}
              </div>
            ))}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Tipo de elección</label>
              <select value={form.tipo_eleccion} onChange={e => setForm(f => ({ ...f, tipo_eleccion: e.target.value }))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                {TIPOS_ELECCION.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            {form.tipo_eleccion && form.monto && (
              <div className="flex flex-col gap-1 justify-end">
                <p className="text-xs text-slate-500">Límite para {form.tipo_eleccion}:</p>
                <p className={`text-sm font-semibold ${parseInt(form.monto) > (LIMITES_UF[form.tipo_eleccion] ?? 0) * VALOR_UF ? 'text-red-600' : 'text-green-600'}`}>
                  {LIMITES_UF[form.tipo_eleccion] ? fmt(Math.round(LIMITES_UF[form.tipo_eleccion] * VALOR_UF)) : '—'}
                  &nbsp;({LIMITES_UF[form.tipo_eleccion]?.toLocaleString()} UF)
                </p>
              </div>
            )}
            <div className="col-span-2">
              <button type="submit"
                className="w-full bg-amaranto-600 hover:bg-amaranto-700 text-white font-medium rounded-xl py-2.5 text-sm transition-colors">
                Registrar aporte
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Gráfico por tipo de elección */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Aportes por Tipo de Elección — 2024 vs 2025</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={porTipo} margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
            <XAxis dataKey="tipo" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={v => `$${(v / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={v => fmt(Number(v))} />
            <Legend />
            <Bar dataKey="2024" name="2024" fill="#003087" radius={[3,3,0,0]} />
            <Bar dataKey="2025" name="2025" fill="#9B2335" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Detalle de Aportes — {year}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100">
                {['Candidato/a', 'Tipo elección', 'Monto', '% del límite', 'Fecha', 'Cta. campaña', 'SERVEL', 'Estado'].map(h => (
                  <th key={h} className="text-left py-3 px-4 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {aportes.map((a, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <p className="font-medium text-slate-800">{a.nombre_candidato}</p>
                    <p className="text-xs text-slate-400">{a.rut_candidato}</p>
                  </td>
                  <td className="py-3 px-4 text-slate-500 capitalize text-xs">{a.tipo_eleccion}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">{fmt(a.monto)}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full" style={{ width: `${Math.min(a.pct_del_limite, 100)}%`, background: colorPct(a.pct_del_limite) }} />
                      </div>
                      <span className="text-xs font-medium" style={{ color: colorPct(a.pct_del_limite) }}>
                        {a.pct_del_limite}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{a.fecha}</td>
                  <td className="py-3 px-4 text-xs text-slate-500">{a.cuenta_campana ?? '⚠ Sin verificar'}</td>
                  <td className="py-3 px-4">
                    {a.declarado_servel
                      ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Declarado</span>
                      : <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Pendiente</span>}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${colorEstado(a.estado)}`}>{a.estado.replace(/_/g, ' ')}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td colSpan={2} className="py-3 px-4 font-semibold text-slate-700 text-sm">Total {year}</td>
                <td className="py-3 px-4 font-bold text-slate-800">{fmt(totalAportes)}</td>
                <td colSpan={5} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Tabla de límites legales */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Topes de Gasto Electoral por Cargo — DFL N°3/2017</h3>
          <p className="text-xs text-slate-500 mt-0.5">Calculados con UF actual: {fmt(VALOR_UF)}</p>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-4 gap-3">
            {TIPOS_ELECCION.map(t => {
              const uf = LIMITES_UF[t.id] ?? 0
              const clp = Math.round(uf * VALOR_UF)
              return (
                <div key={t.id} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-slate-700">{t.label}</p>
                  <p className="text-base font-bold text-indigo-700 mt-1">{uf.toLocaleString()} UF</p>
                  <p className="text-xs text-slate-500">{fmt(clp)}</p>
                </div>
              )
            })}
          </div>
        </div>
        <div className="px-5 py-3 bg-indigo-50 rounded-b-2xl text-xs text-indigo-700">
          <strong>Importante:</strong> Los límites aplican por candidato individual. Los aportes agrupados deben verificarse candidato por candidato en la declaración SERVEL.
        </div>
      </div>
    </div>
  )
}
