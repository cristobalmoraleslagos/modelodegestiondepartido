import { AlertTriangle, CheckCircle, Gift } from 'lucide-react'
import { fmt, fmtUF, VALOR_UF } from '../utils'

interface Donacion {
  fecha: string
  donante: string
  rut: string
  esPersonaJuridica: boolean
  montoCLP: number
  acumuladoAnualCLP: number
}

const LIMITE_MENSUAL_UF = 500
const LIMITE_ANUAL_UF = 3_000
const UMBRAL_PUBLICACION_UF = 20

const DONACIONES: Donacion[] = [
  { fecha: '2026-01-15', donante: 'Roberto Fuentes Araya', rut: '8.234.567-8', esPersonaJuridica: false, montoCLP: 1_500_000, acumuladoAnualCLP: 4_800_000 },
  { fecha: '2026-02-10', donante: 'Constructora Del Valle SpA', rut: '77.123.456-9', esPersonaJuridica: true, montoCLP: 3_000_000, acumuladoAnualCLP: 3_000_000 },
  { fecha: '2026-03-05', donante: 'Carmen Leal Moreno', rut: '12.987.654-3', esPersonaJuridica: false, montoCLP: 900_000, acumuladoAnualCLP: 2_100_000 },
  { fecha: '2026-04-01', donante: 'Patricio Reyes Soto', rut: '15.432.100-7', esPersonaJuridica: false, montoCLP: 4_200_000, acumuladoAnualCLP: 18_600_000 },
  { fecha: '2026-04-22', donante: 'Luisa Contreras Vidal', rut: '9.876.543-2', esPersonaJuridica: false, montoCLP: 400_000, acumuladoAnualCLP: 400_000 },
  { fecha: '2026-05-12', donante: 'Fundación Progreso Chile', rut: '65.432.100-K', esPersonaJuridica: true, montoCLP: 5_000_000, acumuladoAnualCLP: 5_000_000 },
  { fecha: '2026-05-18', donante: 'Marcos Ibáñez Pino', rut: '16.100.200-4', esPersonaJuridica: false, montoCLP: 600_000, acumuladoAnualCLP: 600_000 },
]

function barColor(pct: number) {
  if (pct >= 100) return '#ef4444'
  if (pct >= 80) return '#f59e0b'
  return '#003087'
}

export default function ModuloDonaciones() {
  const personasJuridicas = DONACIONES.filter(d => d.esPersonaJuridica)
  const sobreLimite = DONACIONES.filter(d => !d.esPersonaJuridica && d.acumuladoAnualCLP > LIMITE_ANUAL_UF * VALOR_UF)
  const paraPublicar = DONACIONES.filter(d => !d.esPersonaJuridica && d.montoCLP >= UMBRAL_PUBLICACION_UF * VALOR_UF)
  const totalLegitimo = DONACIONES.filter(d => !d.esPersonaJuridica && d.acumuladoAnualCLP <= LIMITE_ANUAL_UF * VALOR_UF).reduce((s, d) => s + d.montoCLP, 0)

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: <Gift size={20} />, label: 'Total donaciones legítimas', value: fmt(totalLegitimo), sub: 'Personas naturales dentro del límite' },
          { icon: <AlertTriangle size={20} />, label: 'Personas jurídicas detectadas', value: `${personasJuridicas.length}`, sub: 'Ley 19.884 — prohibición absoluta' },
          { icon: <CheckCircle size={20} />, label: 'Requieren publicación web', value: `${paraPublicar.length} donantes`, sub: `Sobre ${UMBRAL_PUBLICACION_UF} UF (${fmt(UMBRAL_PUBLICACION_UF * VALOR_UF)})` },
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

      {/* Alertas críticas */}
      {personasJuridicas.length > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl px-5 py-4">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">INFRACCIÓN LEY 19.884 — {personasJuridicas.length} aporte(s) de personas jurídicas</p>
            <p className="text-xs mt-1">{personasJuridicas.map(d => `${d.donante} (${fmt(d.montoCLP)})`).join(' · ')} — Deben ser devueltos y reportados a SERVEL de inmediato.</p>
          </div>
        </div>
      )}

      {sobreLimite.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-5 py-4">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">{sobreLimite.length} donante(s) superan el límite anual de {LIMITE_ANUAL_UF.toLocaleString()} UF</p>
            <p className="text-xs mt-0.5">{sobreLimite.map(d => d.donante).join(', ')} — El exceso debe ser devuelto.</p>
          </div>
        </div>
      )}

      {/* Tabla de donaciones */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Registro de Donaciones 2026</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100">
                {['Fecha', 'Donante', 'RUT', 'Tipo', 'Monto', 'Acumulado anual', 'Límite anual (3.000 UF)', 'Estado'].map(h => (
                  <th key={h} className="text-left py-3 px-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DONACIONES.map((d, i) => {
                const limiteAnualCLP = LIMITE_ANUAL_UF * VALOR_UF
                const pct = Math.round((d.acumuladoAnualCLP / limiteAnualCLP) * 100)
                const bloqueado = d.esPersonaJuridica || d.acumuladoAnualCLP > limiteAnualCLP
                return (
                  <tr key={i} className={`border-b border-slate-50 last:border-0 ${bloqueado ? 'bg-red-50' : 'hover:bg-slate-50'}`}>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{d.fecha}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{d.donante}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs">{d.rut}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${d.esPersonaJuridica ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {d.esPersonaJuridica ? 'Persona Jurídica' : 'Persona Natural'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium whitespace-nowrap">{fmt(d.montoCLP)}</td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{fmt(d.acumuladoAnualCLP)}</td>
                    <td className="py-3 px-4 w-40">
                      {!d.esPersonaJuridica && (
                        <div className="space-y-1">
                          <div className="w-full bg-slate-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: barColor(pct) }} />
                          </div>
                          <p className="text-xs" style={{ color: barColor(pct) }}>{fmtUF(d.acumuladoAnualCLP / VALOR_UF)} / {LIMITE_ANUAL_UF} UF</p>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {d.esPersonaJuridica
                        ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">BLOQUEADO — devolver</span>
                        : d.acumuladoAnualCLP > LIMITE_ANUAL_UF * VALOR_UF
                          ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Sobre límite — devolver exceso</span>
                          : d.montoCLP >= UMBRAL_PUBLICACION_UF * VALOR_UF
                            ? <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Publicar en web</span>
                            : <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">OK</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lista de publicación obligatoria */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Publicación Obligatoria Web — Donantes sobre {UMBRAL_PUBLICACION_UF} UF</h2>
          <p className="text-xs text-slate-500 mt-1">Art. 13 Ley 19.884 — Plazo: dentro de los 10 días siguientes a la recepción</p>
        </div>
        <div className="p-5 space-y-2">
          {paraPublicar.map((d, i) => (
            <div key={i} className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{d.donante}</p>
                <p className="text-xs text-slate-500">RUT {d.rut} · {d.fecha}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-amber-700">{fmt(d.montoCLP)}</p>
                <p className="text-xs text-slate-400">{fmtUF(d.montoCLP / VALOR_UF)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
