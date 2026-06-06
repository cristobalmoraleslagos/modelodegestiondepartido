import { CalendarCheck, Clock, AlertTriangle, CheckCircle, Scale } from 'lucide-react'
import { F29_DIA_VENCIMIENTO, PREVIRED_DIA_VENCIMIENTO, PLAZOS_TRIMESTRALES_2026, BALANCE_ANUAL_PLAZO } from '../normativa'

interface Evento {
  fecha:       string   // YYYY-MM-DD
  tipo:        'f29' | 'previred' | 'servel' | 'balance' | 'otro'
  titulo:      string
  descripcion: string
  ley:         string
  obligatorio: boolean
  sancion?:    string
}

// ─── Generar calendario completo 2026 ────────────────────────────────────────
function generarCalendario(): Evento[] {
  const eventos: Evento[] = []
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  // F29 mensual (día 20 de cada mes — por honorarios del mes anterior)
  for (let m = 1; m <= 12; m++) {
    const fecha = `2026-${String(m).padStart(2,'0')}-20`
    const mesAnterior = m === 1 ? 'Diciembre 2025' : MESES[m-2]
    eventos.push({
      fecha,
      tipo: 'f29',
      titulo: `F29 — Retención Honorarios ${mesAnterior}`,
      descripcion: `Declarar y pagar retención 10,75% sobre honorarios pagados en ${mesAnterior}. Código 92 en el F29. Pagar en TGR o banca electrónica.`,
      ley: 'Art. 74 N°2 DL 824 (Ley de la Renta)',
      obligatorio: true,
      sancion: 'Multa 10% del impuesto + 1,5% por cada mes de atraso. Sin tope máximo.',
    })
  }

  // PREVIRED mensual (día 10 de cada mes)
  for (let m = 1; m <= 12; m++) {
    const fecha = `2026-${String(m).padStart(2,'0')}-10`
    eventos.push({
      fecha,
      tipo: 'previred',
      titulo: `PREVIRED — Cotizaciones previsionales ${MESES[m-1]}`,
      descripcion: `Pagar cotizaciones AFP (10% imponible) + Salud (7% imponible) del personal con contrato del Código del Trabajo. Máximo imponible: 79,7 UF.`,
      ley: 'DL 3.500 + DFL 1 Ley 18.566',
      obligatorio: true,
      sancion: 'Reajuste UF + interés 3% mensual. Responsabilidad solidaria del representante legal.',
    })
  }

  // Rendiciones SERVEL trimestrales
  for (const t of PLAZOS_TRIMESTRALES_2026) {
    eventos.push({
      fecha: t.plazo,
      tipo: 'servel',
      titulo: `Rendición SERVEL — ${t.label}`,
      descripcion: `Publicar en portaltransparencia.servel.cl los módulos: 6 (Ingresos), 12 (Gastos), 13 (Donaciones), 14 (Nómina), 17 (Préstamos). Los módulos deben estar completos y verificados.`,
      ley: 'Art. 33 Ley 20.900 + DS 1174/2016 SERVEL',
      obligatorio: true,
      sancion: 'Suspensión del pago del aporte estatal hasta regularizar. Puede llegar a cancelación de personalidad jurídica.',
    })
  }

  // Balance anual
  eventos.push({
    fecha: '2027-04-30',
    tipo: 'balance',
    titulo: 'Balance Anual 2026 — SERVEL',
    descripcion: 'Presentar balance general aprobado (Módulo 15) + inventario activos (Módulo 16). Debe estar firmado por contador auditor. Incluir estado de resultados y flujo de caja.',
    ley: 'Art. 33 Ley 20.900 + DS 1174/2016',
    obligatorio: true,
    sancion: 'Rechazo del balance implica suspensión del aporte estatal y posible multa hasta 500 UTM.',
  })

  // Otros eventos importantes
  eventos.push(
    {
      fecha: '2026-03-31',
      tipo: 'otro',
      titulo: 'Verificación Fondo Género Q1 2026',
      descripcion: 'Verificar gasto de género acumulado en Q1. Si está bajo el 2,5% del aporte estatal anual → activar plan de acción inmediato. Se necesita programa + lista asistentes + informe (dictamen CGR).',
      ley: 'Art. 38 Ley 20.900 + Dictamen CGR',
      obligatorio: false,
    },
    {
      fecha: '2026-06-30',
      tipo: 'otro',
      titulo: 'Verificación Fondo Género Q2 2026 — Punto crítico',
      descripcion: 'Al cierre de Q2 el gasto de género debe acumular al menos 5% del aporte estatal anual (mitad de año). Si no se alcanza, es matemáticamente muy difícil recuperar al 31 de diciembre.',
      ley: 'Art. 38 Ley 20.900',
      obligatorio: false,
      sancion: 'Si al 31 dic. el total es < 10% → rechazo del balance anual.',
    },
    {
      fecha: '2026-12-31',
      tipo: 'otro',
      titulo: 'Cierre Fondo Género 2026 — Fecha límite',
      descripcion: 'Último día para ejecutar gastos de fomento a la participación femenina que cuenten para el 10% de 2026. Después del 31/12 no se pueden registrar gastos en el período.',
      ley: 'Art. 38 Ley 20.900',
      obligatorio: true,
      sancion: 'Incumplimiento del 10% → rechazo del balance anual por SERVEL.',
    },
    {
      fecha: '2026-12-31',
      tipo: 'otro',
      titulo: 'Revisión anual Declaraciones Conflicto de Interés — Directiva',
      descripcion: 'Todos los miembros de la Directiva Central deben actualizar su declaración de conflicto de interés antes del cierre del año. Las declaraciones vencidas implican incumplimiento de normas de probidad.',
      ley: 'Art. 36 bis DFL N°4/2017 + Ley 20.880 (probidad)',
      obligatorio: true,
    },
    {
      fecha: '2026-01-10',
      tipo: 'previred',
      titulo: 'PREVIRED — Primer pago 2026 (cotizaciones dic. 2025)',
      descripcion: 'Pago de cotizaciones previsionales de diciembre 2025 (si no se pagaron en enero).',
      ley: 'DL 3.500',
      obligatorio: true,
      sancion: 'Reajuste UF + interés 3% mensual.',
    },
  )

  // Ordenar por fecha
  return eventos.sort((a, b) => a.fecha.localeCompare(b.fecha))
}

const EVENTOS = generarCalendario()

// ─── Helpers ─────────────────────────────────────────────────────────────────
function diasRestantes(fechaStr: string): number {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const fecha = new Date(fechaStr)
  return Math.ceil((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
}

function formatFecha(fechaStr: string): string {
  const [y, m, d] = fechaStr.split('-')
  const meses = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${d} ${meses[parseInt(m)]} ${y}`
}

const TIPO_CONFIG = {
  f29:      { color: 'bg-red-100 text-red-700 border-red-200',    badge: 'F29 / SII',    icon: <Scale size={13} /> },
  previred: { color: 'bg-blue-100 text-blue-700 border-blue-200', badge: 'PREVIRED',     icon: <CheckCircle size={13} /> },
  servel:   { color: 'bg-indigo-100 text-indigo-700 border-indigo-200', badge: 'SERVEL', icon: <CalendarCheck size={13} /> },
  balance:  { color: 'bg-purple-100 text-purple-700 border-purple-200', badge: 'Balance SERVEL', icon: <CheckCircle size={13} /> },
  otro:     { color: 'bg-amber-100 text-amber-700 border-amber-200', badge: 'Verificación', icon: <AlertTriangle size={13} /> },
}

function estadoEvento(dias: number): { label: string; color: string } {
  if (dias < 0)  return { label: 'Vencido', color: 'text-red-600 font-bold' }
  if (dias === 0) return { label: 'Hoy', color: 'text-red-600 font-bold' }
  if (dias <= 5)  return { label: `${dias}d`, color: 'text-red-500 font-semibold' }
  if (dias <= 15) return { label: `${dias}d`, color: 'text-amber-600 font-semibold' }
  if (dias <= 30) return { label: `${dias}d`, color: 'text-amber-500' }
  return { label: `${dias}d`, color: 'text-slate-400' }
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ModuloCalendario() {
  const hoy = new Date()
  const mesActual = hoy.getMonth() + 1
  const añoActual = hoy.getFullYear()

  // Agrupar eventos por mes
  const eventosPorMes: Record<string, Evento[]> = {}
  for (const e of EVENTOS) {
    const [y, m] = e.fecha.split('-')
    const key = `${y}-${m}`
    if (!eventosPorMes[key]) eventosPorMes[key] = []
    eventosPorMes[key].push(e)
  }

  const MESES_NOMBRE = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
                         'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  // Próximos eventos (siguientes 60 días)
  const proximos = EVENTOS
    .filter(e => { const d = diasRestantes(e.fecha); return d >= 0 && d <= 60 })
    .slice(0, 8)

  // Vencidos
  const vencidos = EVENTOS.filter(e => diasRestantes(e.fecha) < 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-slate-800">Calendario de Compliance 2026</h2>
        <p className="text-xs text-slate-500">
          F29 (día {F29_DIA_VENCIMIENTO}) · PREVIRED (día {PREVIRED_DIA_VENCIMIENTO}) · Rendiciones SERVEL · Balance anual · Verificaciones de género
        </p>
      </div>

      {/* Vencidos */}
      {vencidos.length > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl px-5 py-4">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Obligaciones vencidas — regularizar inmediatamente</p>
            <div className="mt-1 space-y-0.5">
              {vencidos.map((e, i) => (
                <p key={i} className="text-xs">{formatFecha(e.fecha)} · {e.titulo}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Próximos 60 días */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Clock size={15} className="text-indigo-500" />
          Próximas obligaciones — 60 días
        </h3>
        <div className="space-y-2">
          {proximos.map((e, i) => {
            const dias = diasRestantes(e.fecha)
            const conf = TIPO_CONFIG[e.tipo]
            const est  = estadoEvento(dias)
            return (
              <div key={i} className={`border rounded-xl px-4 py-3 flex items-start gap-3 ${conf.color}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {conf.icon}
                    <span className="text-xs font-bold uppercase tracking-wide">{conf.badge}</span>
                    <span className="text-xs opacity-70">{formatFecha(e.fecha)}</span>
                  </div>
                  <p className="font-medium text-sm mt-0.5">{e.titulo}</p>
                  <p className="text-xs opacity-80 mt-0.5">{e.ley}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-xl font-black ${est.color}`}>{est.label}</p>
                  {dias > 0 && <p className="text-xs opacity-60">días</p>}
                </div>
              </div>
            )
          })}
          {proximos.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">Sin obligaciones en los próximos 60 días.</p>
          )}
        </div>
      </div>

      {/* Vista por mes */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-700">Vista completa 2026–2027</h3>
        {Object.entries(eventosPorMes).map(([key, eventos]) => {
          const [y, m] = key.split('-')
          const mesNum = parseInt(m)
          const esMesActual = parseInt(y) === añoActual && mesNum === mesActual
          const esPasado    = new Date(`${y}-${m}-01`) < new Date(añoActual, mesActual - 1, 1)

          return (
            <div key={key} className={`bg-white rounded-2xl shadow-sm overflow-hidden ${esMesActual ? 'ring-2 ring-indigo-400' : ''}`}>
              <div className={`px-5 py-3 flex items-center justify-between ${esMesActual ? 'bg-indigo-600 text-white' : esPasado ? 'bg-slate-100' : 'bg-slate-50'}`}>
                <h4 className={`font-semibold text-sm ${esMesActual ? 'text-white' : 'text-slate-700'}`}>
                  {MESES_NOMBRE[mesNum]} {y}
                  {esMesActual && <span className="ml-2 text-xs bg-white text-indigo-600 px-2 py-0.5 rounded-full font-bold">MES ACTUAL</span>}
                </h4>
                <span className={`text-xs ${esMesActual ? 'text-indigo-200' : 'text-slate-400'}`}>
                  {eventos.length} obligación{eventos.length !== 1 ? 'es' : ''}
                </span>
              </div>
              <div className="divide-y divide-slate-50">
                {eventos.map((e, i) => {
                  const dias = diasRestantes(e.fecha)
                  const conf = TIPO_CONFIG[e.tipo]
                  const est  = estadoEvento(dias)
                  return (
                    <div key={i} className="px-5 py-3 flex items-start gap-4">
                      <div className="w-10 text-center shrink-0">
                        <p className="text-lg font-black text-slate-600">{e.fecha.split('-')[2]}</p>
                        <p className="text-xs text-slate-400">{['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][mesNum]}</p>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${conf.color}`}>
                            {conf.badge}
                          </span>
                          {e.obligatorio && (
                            <span className="text-xs text-red-500 font-medium">obligatorio</span>
                          )}
                        </div>
                        <p className="font-medium text-sm text-slate-800">{e.titulo}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{e.descripcion}</p>
                        <p className="text-xs text-indigo-600 mt-0.5 font-medium">{e.ley}</p>
                        {e.sancion && (
                          <p className="text-xs text-red-600 mt-0.5">
                            <strong>Sanción:</strong> {e.sancion}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-base font-bold ${est.color}`}>{est.label}</p>
                        {dias > 0 && <p className="text-xs text-slate-400">días</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-6 text-xs text-slate-500">
        {Object.entries(TIPO_CONFIG).map(([tipo, conf]) => (
          <div key={tipo} className="flex items-center gap-1.5">
            <span className={`px-2 py-0.5 rounded border text-xs ${conf.color}`}>{conf.badge}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
