import { Package } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { fmt } from '../utils'
import { ACTIVOS_BASE, type Activo, type CategoriaActivo, type EstadoActivo } from '../data/activos'

// Tipos e interfaz importados desde data/activos.ts
// (CategoriaActivo, EstadoActivo, Activo importados arriba)

const HOY_ANIO = new Date().getFullYear()
const HOY_MES  = new Date().getMonth() + 1

function aniosTranscurridos(fecha: string): number {
  const [anio, mes] = fecha.split('-').map(Number)
  return (HOY_ANIO - anio) + (HOY_MES - mes) / 12
}

function depreciacion(a: Activo): number {
  // Si Defontana entrega la depreciación real, usarla. Si no, calcular lineal.
  if (a.depreciacionAcumulada !== undefined) return a.depreciacionAcumulada
  if (!a.vidaUtilAnios || a.vidaUtilAnios <= 0) return 0   // terrenos / obras de arte no se deprecian
  const tasaAnual = a.valorAdquisicion / a.vidaUtilAnios
  return Math.min(tasaAnual * aniosTranscurridos(a.fechaAdquisicion), a.valorAdquisicion)
}

function valorLibro(a: Activo): number {
  return Math.max(a.valorAdquisicion - depreciacion(a), 0)
}

// Activos importados desde data/activos.ts (fuente canónica compartida con el exportador M16)
const ACTIVOS = ACTIVOS_BASE

const COLORES: Record<CategoriaActivo, string> = {
  'Terrenos':     '#8b5cf6',
  'Edificación':  '#6366f1',
  'Obras de Arte':'#ec4899',
  'Mobiliario':   '#22d3ee',
  'Equipos':      '#10b981',
  'Vehículos':    '#f59e0b',
  'Tecnología':   '#003087',
}

const colorEstado = (e: Activo['estado']) =>
  e === 'Operativo' ? 'bg-green-100 text-green-700' :
  e === 'En mantención' ? 'bg-amber-100 text-amber-700' :
  'bg-red-100 text-red-700'

export default function ModuloActivos() {
  const activosOperativos = ACTIVOS.filter(a => a.estado !== 'Dado de baja')
  const totalAdquisicion = activosOperativos.reduce((s, a) => s + a.valorAdquisicion, 0)
  const totalDepreciacion = activosOperativos.reduce((s, a) => s + depreciacion(a), 0)
  const totalValorLibro = activosOperativos.reduce((s, a) => s + valorLibro(a), 0)

  const porCategoria = Object.entries(
    activosOperativos.reduce((acc, a) => {
      acc[a.categoria] = (acc[a.categoria] || 0) + valorLibro(a)
      return acc
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value: Math.round(value) }))

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: <Package size={20} />, label: 'Valor total de adquisición', value: fmt(totalAdquisicion), sub: `${activosOperativos.length} activos registrados` },
          { icon: <Package size={20} />, label: 'Depreciación acumulada', value: fmt(totalDepreciacion), sub: `${Math.round((totalDepreciacion / totalAdquisicion) * 100)}% del valor original` },
          { icon: <Package size={20} />, label: 'Valor libro neto', value: fmt(totalValorLibro), sub: 'Patrimonio activos fijos' },
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

      <div className="grid grid-cols-5 gap-6">
        {/* Distribución por categoría */}
        <div className="col-span-2 bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Valor Libro por Categoría</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={porCategoria} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={false}>
                {porCategoria.map((entry, i) => (
                  <Cell key={i} fill={COLORES[entry.name as Activo['categoria']] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => fmt(Number(v))} />
              <Legend iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Resumen por categoría */}
        <div className="col-span-3 bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Resumen por Categoría</h2>
          <div className="space-y-3">
            {Object.entries(COLORES).map(([cat, color]) => {
              const catActivos = activosOperativos.filter(a => a.categoria === cat)
              if (catActivos.length === 0) return null
              const totalCat = catActivos.reduce((s, a) => s + valorLibro(a), 0)
              const pct = Math.round((totalCat / totalValorLibro) * 100)
              return (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700 font-medium">{cat}</span>
                    <span className="text-slate-500">{fmt(totalCat)} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Inventario completo */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Inventario de Activos Fijos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100">
                {['Código', 'Descripción', 'Categoría', 'Valor adquisición', 'Depreciación acum.', 'Valor libro', 'Vida útil restante', 'Ubicación', 'Estado'].map(h => (
                  <th key={h} className="text-left py-3 px-3 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ACTIVOS.map((a, i) => {
                const dep = depreciacion(a)
                const vl = valorLibro(a)
                const aniosUsados = aniosTranscurridos(a.fechaAdquisicion)
                const aniosRestantes = Math.max(a.vidaUtilAnios - aniosUsados, 0)
                const pctDepreciado = Math.round((dep / a.valorAdquisicion) * 100)
                return (
                  <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="py-3 px-3 text-xs font-mono text-slate-500">{a.codigo}</td>
                    <td className="py-3 px-3 font-medium text-slate-800 whitespace-nowrap">{a.descripcion}</td>
                    <td className="py-3 px-3">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${COLORES[a.categoria]}20`, color: COLORES[a.categoria] }}>
                        {a.categoria}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{fmt(a.valorAdquisicion)}</td>
                    <td className="py-3 px-3">
                      <div>
                        <p className="text-red-600 font-medium whitespace-nowrap">{fmt(dep)}</p>
                        <div className="w-20 bg-slate-100 rounded-full h-1 mt-1">
                          <div className="h-1 rounded-full bg-red-400" style={{ width: `${pctDepreciado}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold whitespace-nowrap" style={{ color: vl < a.valorAdquisicion * 0.2 ? '#ef4444' : '#1e293b' }}>
                      {fmt(vl)}
                    </td>
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                      {aniosRestantes > 0 ? `${aniosRestantes.toFixed(1)} años` : <span className="text-red-500 font-medium">Totalmente depreciado</span>}
                    </td>
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{a.ubicacion}</td>
                    <td className="py-3 px-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${colorEstado(a.estado)}`}>{a.estado}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                <td colSpan={3} className="py-3 px-3 text-slate-700">TOTAL</td>
                <td className="py-3 px-3 text-slate-800">{fmt(totalAdquisicion)}</td>
                <td className="py-3 px-3 text-red-600">{fmt(totalDepreciacion)}</td>
                <td className="py-3 px-3 text-slate-800">{fmt(totalValorLibro)}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
