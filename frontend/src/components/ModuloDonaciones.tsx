import { AlertTriangle, CheckCircle, Gift, ShieldAlert, Scale } from 'lucide-react'
import { fmt, fmtUF, VALOR_UF } from '../utils'
import {
  DONACION_PARTIDO_MAX_UF, DONACION_PARTIDO_MAX_CLP,
  DONACION_CAMPANA_MAX_UF, DONACION_CAMPANA_MAX_CLP,
  DONACION_UMBRAL_PUBLICACION_UF, DONACION_UMBRAL_PUBLICACION_CLP,
  DONACION_PLAZO_PUBLICACION_DIAS,
  detectarPersonaJuridica,
} from '../normativa'

interface Donacion {
  fecha: string
  donante: string
  rut: string
  esPersonaJuridica: boolean
  montoCLP: number
  acumuladoAnualCLP: number
  tipo: 'partido' | 'campana'  // distingue Art. 39 DFL N°4/2017 (partido) vs Art. 10 DFL N°3/2017 (campaña)
}

// NORMATIVA VIGENTE (textos refundidos):
// Donaciones AL PARTIDO: persona natural afiliada 500 UF/año, no afiliada 300 UF/año
//   → Art. 39 DFL N°4/2017 (texto refundido Ley 18.603, últ. mod. Ley 21.311/2021)
// Tope global aportante en elección parlamentaria/presidencial: 2.000 UF
//   → Art. 10 DFL N°3/2017 (texto refundido Ley 19.884, últ. mod. Ley 21.693/2024)
// Personas jurídicas: PROHIBICIÓN ABSOLUTA — Art. 39 DFL N°4/2017 + Art. 2 Ley 20.900
const LIMITE_PARTIDO_UF     = DONACION_PARTIDO_MAX_UF  // 500 UF (afiliado) — Art. 39 DFL N°4/2017
const LIMITE_CAMPANA_UF     = DONACION_CAMPANA_MAX_UF  // 2.000 UF tope global — Art. 10 DFL N°3/2017
const UMBRAL_PUBLICACION_UF = DONACION_UMBRAL_PUBLICACION_UF // 20 UF — Art. 13 DFL N°3/2017

const DONACIONES: Donacion[] = [
  { fecha: '2026-01-15', donante: 'Roberto Fuentes Araya',    rut: '8.234.567-8',   esPersonaJuridica: false, montoCLP: 1_500_000,  acumuladoAnualCLP: 4_800_000,  tipo: 'partido'  },
  { fecha: '2026-02-10', donante: 'Constructora Del Valle SpA',rut: '77.123.456-9', esPersonaJuridica: true,  montoCLP: 3_000_000,  acumuladoAnualCLP: 3_000_000,  tipo: 'partido'  },
  { fecha: '2026-03-05', donante: 'Carmen Leal Moreno',        rut: '12.987.654-3', esPersonaJuridica: false, montoCLP: 900_000,    acumuladoAnualCLP: 2_100_000,  tipo: 'partido'  },
  { fecha: '2026-04-01', donante: 'Patricio Reyes Soto',       rut: '15.432.100-7', esPersonaJuridica: false, montoCLP: 4_200_000,  acumuladoAnualCLP: 18_600_000, tipo: 'partido'  }, // ~458 UF — bajo 500 UF tope afiliado Art. 39 DFL N°4/2017
  { fecha: '2026-04-22', donante: 'Luisa Contreras Vidal',     rut: '9.876.543-2',  esPersonaJuridica: false, montoCLP: 400_000,    acumuladoAnualCLP: 400_000,    tipo: 'partido'  },
  { fecha: '2026-05-12', donante: 'Fundación Progreso Chile',  rut: '65.432.100-K', esPersonaJuridica: true,  montoCLP: 5_000_000,  acumuladoAnualCLP: 5_000_000,  tipo: 'partido'  },
  { fecha: '2026-05-18', donante: 'Marcos Ibáñez Pino',        rut: '16.100.200-4', esPersonaJuridica: false, montoCLP: 600_000,    acumuladoAnualCLP: 600_000,    tipo: 'partido'  },
]

function barColor(pct: number) {
  if (pct >= 100) return '#ef4444'
  if (pct >= 80)  return '#f59e0b'
  return '#003087'
}

export default function ModuloDonaciones() {
  const personasJuridicas = DONACIONES.filter(d => d.esPersonaJuridica)

  // Límite correcto según tipo de donación:
  // Partido: 500 UF/año (Art. 39 DFL N°4/2017)
  // Campaña: 3.000 UF/elección (Art. 10 DFL N°3/2017)
  const sobreLimitePartido = DONACIONES.filter(d =>
    !d.esPersonaJuridica &&
    d.tipo === 'partido' &&
    d.acumuladoAnualCLP > LIMITE_PARTIDO_UF * VALOR_UF
  )
  const sobreLimiteCampana = DONACIONES.filter(d =>
    !d.esPersonaJuridica &&
    d.tipo === 'campana' &&
    d.acumuladoAnualCLP > LIMITE_CAMPANA_UF * VALOR_UF
  )
  const sobreLimite = [...sobreLimitePartido, ...sobreLimiteCampana]
  const paraPublicar = DONACIONES.filter(d => !d.esPersonaJuridica && d.montoCLP >= UMBRAL_PUBLICACION_UF * VALOR_UF)
  const totalLegitimo = DONACIONES
    .filter(d => !d.esPersonaJuridica && d.acumuladoAnualCLP <= (d.tipo === 'partido' ? LIMITE_PARTIDO_UF : LIMITE_CAMPANA_UF) * VALOR_UF)
    .reduce((s, d) => s + d.montoCLP, 0)

  // Plazo publicación web: 10 días corridos desde recepción (Art. 13 DFL N°3/2017)
  const hoy = new Date()
  const plazosVencidos = DONACIONES.filter(d => {
    if (d.esPersonaJuridica) return false
    if (d.montoCLP < DONACION_UMBRAL_PUBLICACION_CLP) return false
    const diasTranscurridos = Math.floor((hoy.getTime() - new Date(d.fecha).getTime()) / 86_400_000)
    return diasTranscurridos > DONACION_PLAZO_PUBLICACION_DIAS
  }).map(d => ({
    ...d,
    diasTranscurridos: Math.floor((hoy.getTime() - new Date(d.fecha).getTime()) / 86_400_000),
  }))

  // Detectar personas jurídicas por RUT (heurística)
  const suspechosasRUT = DONACIONES.filter(d => {
    const det = detectarPersonaJuridica(d.rut)
    return det.esJuridica && !d.esPersonaJuridica && det.confianza === 'alta'
  })

  return (
    <div className="space-y-6">
      {/* Aviso corrección normativa */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl px-5 py-3 flex items-start gap-3">
        <Scale size={16} className="text-indigo-600 mt-0.5 shrink-0" />
        <div className="text-xs text-indigo-800 space-y-1">
          <p><strong>Dos límites distintos según destino del aporte:</strong></p>
          <p>• <strong>Al PARTIDO:</strong> máximo <strong>{LIMITE_PARTIDO_UF} UF/año</strong> por persona natural — Art. 39 DFL N°4/2017 (~{fmt(DONACION_PARTIDO_MAX_CLP)})</p>
          <p>• <strong>A CAMPAÑA ELECTORAL:</strong> máximo <strong>{LIMITE_CAMPANA_UF.toLocaleString()} UF/elección</strong> por persona natural — Art. 10 DFL N°3/2017 (~{fmt(DONACION_CAMPANA_MAX_CLP)})</p>
          <p>• <strong>Personas jurídicas: PROHIBICIÓN ABSOLUTA en ambos casos</strong> — Art. 39 DFL N°4/2017 + Art. 2 Ley 20.900</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: <Gift size={18} />, label: 'Total donaciones legítimas', value: fmt(totalLegitimo), sub: 'Personas naturales dentro del límite', color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { icon: <ShieldAlert size={18} />, label: 'Personas jurídicas detectadas', value: String(personasJuridicas.length), sub: 'Art. 17 Ley 19.884 — prohibición absoluta', color: personasJuridicas.length > 0 ? 'text-red-600' : 'text-green-600', bg: personasJuridicas.length > 0 ? 'bg-red-50' : 'bg-green-50' },
          { icon: <AlertTriangle size={18} />, label: 'Sobre límite (partido 500 UF)', value: String(sobreLimitePartido.length), sub: 'Art. 39 DFL N°4/2017 — devolver exceso', color: sobreLimitePartido.length > 0 ? 'text-red-600' : 'text-green-600', bg: sobreLimitePartido.length > 0 ? 'bg-red-50' : 'bg-green-50' },
          { icon: <CheckCircle size={18} />, label: 'Requieren publicación web', value: `${paraPublicar.length}`, sub: `Sobre ${UMBRAL_PUBLICACION_UF} UF · plazo ${DONACION_PLAZO_PUBLICACION_DIAS} días corridos`, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm flex items-start gap-3">
            <div className={`p-2.5 rounded-xl ${k.bg} ${k.color}`}>{k.icon}</div>
            <div>
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className={`text-xl font-semibold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-slate-400">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alertas críticas */}
      {personasJuridicas.length > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl px-5 py-4">
          <ShieldAlert size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">INFRACCIÓN — {personasJuridicas.length} aporte(s) de personas jurídicas</p>
            <p className="text-xs font-medium mt-0.5">Art. 39 DFL N°4/2017 + Art. 2 Ley 20.900 — Prohibición absoluta. Posibles consecuencias penales para el representante legal que entregue y quien reciba.</p>
            <p className="text-xs mt-1">{personasJuridicas.map(d => `${d.donante} (${fmt(d.montoCLP)})`).join(' · ')} — Devolver íntegramente y reportar a SERVEL.</p>
          </div>
        </div>
      )}

      {sobreLimitePartido.length > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl px-5 py-4">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">{sobreLimitePartido.length} donante(s) superan {LIMITE_PARTIDO_UF} UF/año al PARTIDO (Art. 39 DFL N°4/2017)</p>
            <p className="text-xs mt-0.5">{sobreLimitePartido.map(d => `${d.donante}: acumulado ${fmt(d.acumuladoAnualCLP)} (límite ${fmt(LIMITE_PARTIDO_UF * VALOR_UF)})`).join(' · ')} — Devolver exceso.</p>
          </div>
        </div>
      )}

      {/* Alerta plazo publicación web vencido — Art. 13 DFL N°3/2017 */}
      {plazosVencidos.length > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl px-5 py-4">
          <ShieldAlert size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">
              PLAZO VENCIDO — {plazosVencidos.length} donación(es) sin publicar en web (Art. 13 DFL N°3/2017)
            </p>
            <p className="text-xs mt-0.5">
              Las donaciones sobre {DONACION_UMBRAL_PUBLICACION_UF} UF (~{fmt(DONACION_UMBRAL_PUBLICACION_CLP)}) deben publicarse en el sitio web del partido dentro de <strong>10 días corridos</strong> desde su recepción.
            </p>
            <ul className="mt-1.5 space-y-0.5">
              {plazosVencidos.map((d, i) => (
                <li key={i} className="text-xs">
                  <strong>{d.donante}</strong> — {fmt(d.montoCLP)} recibido el {d.fecha} —
                  <span className="font-semibold text-red-700"> {d.diasTranscurridos} días sin publicar</span>
                  {' '}(plazo venció hace {d.diasTranscurridos - DONACION_PLAZO_PUBLICACION_DIAS} día{d.diasTranscurridos - DONACION_PLAZO_PUBLICACION_DIAS > 1 ? 's' : ''})
                </li>
              ))}
            </ul>
            <p className="text-xs mt-1.5 font-medium">Publicar en sitio web del partido con nombre, RUT y monto. Multa hasta 30 UTA si no se cumple.</p>
          </div>
        </div>
      )}

      {/* Tabla de donaciones */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Registro de Donaciones 2026</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Límite partido: {LIMITE_PARTIDO_UF} UF/año ({fmt(LIMITE_PARTIDO_UF * VALOR_UF)}) — Art. 39 DFL N°4/2017 |
            Límite campaña: {LIMITE_CAMPANA_UF.toLocaleString()} UF/elección ({fmt(LIMITE_CAMPANA_UF * VALOR_UF)}) — Art. 10 DFL N°3/2017
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100">
                {['Fecha', 'Donante', 'RUT', 'Tipo', 'Destino', 'Monto', 'Acumulado / Límite', 'Estado'].map(h => (
                  <th key={h} className="text-left py-3 px-4 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DONACIONES.map((d, i) => {
                const limiteAplicable = d.tipo === 'partido' ? LIMITE_PARTIDO_UF : LIMITE_CAMPANA_UF
                const limiteCLP      = limiteAplicable * VALOR_UF
                const pct            = Math.round((d.acumuladoAnualCLP / limiteCLP) * 100)
                const bloqueado      = d.esPersonaJuridica || d.acumuladoAnualCLP > limiteCLP
                const detRUT         = detectarPersonaJuridica(d.rut)
                const sospechaRUT    = !d.esPersonaJuridica && detRUT.esJuridica && detRUT.confianza === 'alta'
                return (
                  <tr key={i} className={`border-b border-slate-50 last:border-0 ${bloqueado ? 'bg-red-50' : sospechaRUT ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{d.fecha}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{d.donante}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs">
                      {d.rut}
                      {sospechaRUT && <span className="ml-1 text-amber-600 font-bold" title="RUT sugiere empresa">⚠</span>}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${d.esPersonaJuridica ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {d.esPersonaJuridica ? 'Pers. Jurídica' : 'Pers. Natural'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${d.tipo === 'campana' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                        {d.tipo === 'campana' ? 'Campaña' : 'Partido'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium whitespace-nowrap">{fmt(d.montoCLP)}</td>
                    <td className="py-3 px-4 w-44">
                      {!d.esPersonaJuridica && (
                        <div className="space-y-1">
                          <div className="w-full bg-slate-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: barColor(pct) }} />
                          </div>
                          <p className="text-xs" style={{ color: barColor(pct) }}>
                            {fmtUF(d.acumuladoAnualCLP / VALOR_UF)} / {limiteAplicable} UF ({pct}%)
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {d.esPersonaJuridica
                        ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">ILEGAL — devolver</span>
                        : d.acumuladoAnualCLP > limiteCLP
                          ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Sobre límite — devolver exceso</span>
                          : sospechaRUT
                            ? <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Verificar tipo persona</span>
                            : d.montoCLP >= UMBRAL_PUBLICACION_UF * VALOR_UF
                              ? <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Publicar en web ({DONACION_PLAZO_PUBLICACION_DIAS}d)</span>
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
          <p className="text-xs text-slate-500 mt-1">Art. 13 DFL N°3/2017 — Plazo: dentro de los 10 días siguientes a la recepción</p>
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
