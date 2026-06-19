import { useMemo, type JSX } from 'react'
import {
  AlertTriangle, ShieldAlert, Info, CheckCircle,
  Scale, Clock, FileWarning, Users, Banknote,
  Heart, Building2, Receipt, Vote,
} from 'lucide-react'
import { fmt, VALOR_UF, APORTE_ESTATAL_ANUAL, MES_ACTUAL } from '../utils'
import {
  generarAlertasCompliance,
  alertaF29Retroactivo,
  type AlertaLegal,
  // Constantes para la tabla de referencia — DFL N°4/2017 y DFL N°3/2017
  SUELDO_REFERENCIA_UF, SUELDO_REFERENCIA_CLP,
  DONACION_PARTIDO_MAX_UF_AFILIADO, DONACION_PARTIDO_MAX_CLP_AFILIADO,
  DONACION_PARTIDO_MAX_UF_NO_AFILIADO, DONACION_PARTIDO_MAX_CLP_NO_AFILIADO,
  DONACION_CAMPANA_MAX_UF, DONACION_CAMPANA_MAX_CLP,
  DONACION_UMBRAL_PUBLICACION_UF, DONACION_UMBRAL_PUBLICACION_CLP,
  TOPE_IMPONIBLE_UF,
  GENERO_PCT_MINIMO,
  TASA_RETENCION_HONORARIOS,
  F29_DIA_VENCIMIENTO, PREVIRED_DIA_VENCIMIENTO,
  diasHastaf29, diasHastaPrevired, proximaRendicionServel,
  cumplimientoGenero,
} from '../normativa'
import { FUNCIONARIOS_CANON } from '../data/personal'
import { EGRESOS_BASE }       from '../data/egresos'
import { BALANCE_DEFONTANA, PROGRESO_POR_COBRAR, FLUJO_CAJA_PROYECTADO } from '../data/defontana'
import { COTIZACIONES_RESUMEN } from '../data/previred'

// ─── Datos actuales para generación de alertas ────────────────────────────────
// Fuente: FUNCIONARIOS_CANON (personal.ts) — fuente única de datos de nómina
const FUNCIONARIOS_ACTIVOS = FUNCIONARIOS_CANON
  .filter(f => f.activo)
  .map(f => ({ nombre: f.nombre, sueldo: parseInt(f.sueldo) }))

// F29 Jun-Dic 2025 — retenciones sin declarar (fuente: SII portal, cotejado con BHE 2025)
// 2025: Solo 5/12 F29 declarados (Ene-May). Jun-Dic VENCIDOS. ~$22.4M retenciones.
const F29_MESES_VENCIDOS_2025 = ['Jun-2025', 'Jul-2025', 'Ago-2025', 'Sep-2025', 'Oct-2025', 'Nov-2025', 'Dic-2025']
const F29_MONTO_BACKLOG_2025  = 22_400_000 // estimado según BHE 2025 ÷ 12 × 7 meses

// Donaciones 2026 — incluye campo esAfiliado para distinción de topes
// Art. 39 DFL N°4/2017: afiliado → 500 UF; no afiliado → 300 UF
const DONACIONES_2026 = [
  { donante: 'Constructora Del Valle SpA', esJuridica: true,  acumuladoAnual: 3_000_000, esAfiliado: false }, // PROHIBIDO — persona jurídica
  { donante: 'Fundación Progreso Chile',   esJuridica: true,  acumuladoAnual: 5_000_000, esAfiliado: false }, // PROHIBIDO — persona jurídica
  { donante: 'Patricio Reyes Soto',        esJuridica: false, acumuladoAnual: 18_600_000, esAfiliado: true }, // ~460 UF — bajo 500 UF (afiliado)
]

const PRESTAMOS: Array<{ nombre: string; tipo: string }> = [
  // Ejemplo de préstamo con acreedor ilegal para demostrar la alerta
  // { nombre: 'Persona Natural X', tipo: 'otro' },
]

// Gasto de Género calculado dinámicamente desde EGRESOS_BASE (categoriaSERVEL === 'Fondo Género')
// Art. 38 Ley 20.900: mínimo 10% del aporte estatal en actividades de fomento a la participación femenina
const GASTO_GENERO_2026 = EGRESOS_BASE
  .filter(e => e.categoriaSERVEL === 'Fondo Género')
  .reduce((s, e) => s + e.monto, 0)

const RETENCION_PENDIENTE = 9_274_613 // Mayo 2026 (F29 corriente)

// Años sin aporte estatal SERVEL (confirmado por Transparencia módulo 11 + Defontana).
// 2023 recibió $345,8M y 2024 $549,7M; solo 2025 quedó en $0.
// Art. 42 inc. final DFL N°4/2017: SERVEL suspende el pago si no hay rendición aprobada.
const ANIOS_SIN_APORTE = [2025]
const MONTO_APORTE_PERDIDO_EST = 549_691_607 // estimado al nivel del aporte 2024

// ─── Iconos por módulo ────────────────────────────────────────────────────────
const ICONO_MODULO: Record<string, JSX.Element> = {
  personal:    <Users size={15} />,
  donaciones:  <Banknote size={15} />,
  deuda:       <Building2 size={15} />,
  genero:      <Heart size={15} />,
  retenciones: <Receipt size={15} />,
  datos:       <FileWarning size={15} />,
  aportes:     <Vote size={15} />,
}

// ─── Componente de tarjeta de alerta ─────────────────────────────────────────
function TarjetaAlerta({ alerta }: { alerta: AlertaLegal }) {
  const esC = alerta.gravedad === 'critica'
  const esA = alerta.gravedad === 'advertencia'

  const clsBg    = esC ? 'bg-red-50 border-red-200'    : esA ? 'bg-amber-50 border-amber-200'    : 'bg-blue-50 border-blue-200'
  const clsTxt   = esC ? 'text-red-900'                : esA ? 'text-amber-900'                  : 'text-blue-900'
  const clsSub   = esC ? 'text-red-700'                : esA ? 'text-amber-700'                  : 'text-blue-700'
  const clsBadge = esC ? 'bg-red-100 text-red-700'     : esA ? 'bg-amber-100 text-amber-700'     : 'bg-blue-100 text-blue-700'
  const clsAction= esC ? 'bg-red-100 text-red-800'     : esA ? 'bg-amber-100 text-amber-800'     : 'bg-blue-100 text-blue-800'

  return (
    <div className={`border rounded-2xl px-5 py-4 space-y-2 ${clsBg}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="mt-0.5 shrink-0">
            {esC ? <ShieldAlert size={18} className="text-red-600" /> :
             esA ? <AlertTriangle size={18} className="text-amber-600" /> :
                   <Info size={18} className="text-blue-600" />}
          </div>
          <div className="flex-1">
            <p className={`font-semibold text-sm ${clsTxt}`}>{alerta.titulo}</p>
            <p className={`text-xs mt-0.5 ${clsSub}`}>{alerta.descripcion}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${clsBadge}`}>
            {alerta.ley}
          </span>
          {alerta.modulo && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              {ICONO_MODULO[alerta.modulo] ?? <Scale size={13} />}
              {alerta.modulo}
            </span>
          )}
        </div>
      </div>
      <div className={`text-xs font-medium rounded-xl px-3 py-2 flex items-start gap-2 ${clsAction}`}>
        <CheckCircle size={13} className="mt-0.5 shrink-0" />
        <span><strong>Acción requerida:</strong> {alerta.accion}</span>
      </div>
      {alerta.plazo && (
        <p className={`text-xs flex items-center gap-1 ${clsSub}`}>
          <Clock size={12} /> Plazo: {alerta.plazo}
        </p>
      )}
      {alerta.monto && alerta.monto > 0 && (
        <p className={`text-xs font-semibold ${clsSub}`}>
          Monto involucrado: {fmt(alerta.monto)}
        </p>
      )}
    </div>
  )
}

// ─── Componente contador de días ──────────────────────────────────────────────
function Contador({ label, dias, umbralRojo, ley }: { label: string; dias: number; umbralRojo: number; ley: string }) {
  const color = dias <= 0 ? 'text-red-600' : dias <= umbralRojo ? 'text-amber-600' : 'text-green-600'
  const bg    = dias <= 0 ? 'bg-red-50 border-red-200' : dias <= umbralRojo ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'
  return (
    <div className={`border rounded-2xl p-4 text-center ${bg}`}>
      <p className={`text-3xl font-black ${color}`}>
        {dias <= 0 ? 'VENCIDO' : dias}
      </p>
      {dias > 0 && <p className={`text-xs font-medium ${color}`}>días</p>}
      <p className="text-xs text-slate-600 mt-1 font-medium">{label}</p>
      <p className="text-xs text-slate-400 mt-0.5">{ley}</p>
    </div>
  )
}

// ─── Tabla de límites normativos ──────────────────────────────────────────────
function TablaLimites() {
  const rows = [
    // ── Remuneraciones ──
    { concepto: 'Estándar remuneraciones personal', limite: 'Valor de mercado del cargo', clp: '(sin tope nominal en la ley)', ley: 'Art. 45 DFL N°4/2017', nivel: 'critico' },
    { concepto: 'Referencia: tope imponible AFP/Salud', limite: `${TOPE_IMPONIBLE_UF} UF / mes`, clp: fmt(TOPE_IMPONIBLE_UF * VALOR_UF), ley: 'Res. exenta N°237/2026 Sup. Pensiones', nivel: 'info' },
    { concepto: 'Publicación remuneraciones en web', limite: 'Obligatoria y permanente', clp: '—', ley: 'Art. 49 h) DFL N°4/2017', nivel: 'critico' },
    // ── Donaciones ──
    { concepto: 'Donación al partido — afiliado', limite: `${DONACION_PARTIDO_MAX_UF_AFILIADO} UF / año`, clp: fmt(DONACION_PARTIDO_MAX_CLP_AFILIADO), ley: 'Art. 39 DFL N°4/2017', nivel: 'critico' },
    { concepto: 'Donación al partido — no afiliado', limite: `${DONACION_PARTIDO_MAX_UF_NO_AFILIADO} UF / año`, clp: fmt(DONACION_PARTIDO_MAX_CLP_NO_AFILIADO), ley: 'Art. 39 DFL N°4/2017', nivel: 'critico' },
    { concepto: 'Tope global aportante en elección parl./pres.', limite: `${DONACION_CAMPANA_MAX_UF.toLocaleString('es-CL')} UF / elección`, clp: fmt(DONACION_CAMPANA_MAX_CLP), ley: 'Art. 10 DFL N°3/2017', nivel: 'critico' },
    { concepto: 'Publicación obligatoria donaciones', limite: `> ${DONACION_UMBRAL_PUBLICACION_UF} UF`, clp: fmt(DONACION_UMBRAL_PUBLICACION_CLP), ley: 'Art. 13 DFL N°3/2017', nivel: 'advertencia' },
    { concepto: 'Donaciones personas jurídicas', limite: 'PROHIBICIÓN ABSOLUTA — pena penal', clp: '$0', ley: 'Art. 39 DFL N°4/2017 + Art. 2 Ley 20.900', nivel: 'critico' },
    { concepto: 'Aportes de extranjeros / exterior', limite: 'PROHIBICIÓN ABSOLUTA', clp: '$0', ley: 'Art. 39 inc. final DFL N°4/2017', nivel: 'critico' },
    // ── Gasto electoral ──
    { concepto: 'Tope gasto partido en campaña', limite: '1/3 del total autorizadoа candidatos', clp: '—', ley: 'Art. 5 DFL N°3/2017', nivel: 'critico' },
    { concepto: 'Tope candidato a Senador', limite: '1.500 UF + variable por electores', clp: fmt(1_500 * VALOR_UF), ley: 'Art. 4 DFL N°3/2017', nivel: 'advertencia' },
    { concepto: 'Tope candidato a Diputado', limite: '700 UF + 0,015 UF × electores', clp: fmt(700 * VALOR_UF), ley: 'Art. 4 DFL N°3/2017', nivel: 'advertencia' },
    { concepto: 'Tope candidato a Alcalde', limite: '120 UF + 0,03 UF × electores', clp: fmt(120 * VALOR_UF), ley: 'Art. 4 DFL N°3/2017', nivel: 'advertencia' },
    { concepto: 'Rendición cuenta electoral', limite: '60 días corridos desde la elección', clp: '—', ley: 'Art. 47 DFL N°3/2017', nivel: 'critico' },
    { concepto: 'Reembolso fiscal post-electoral', limite: '0,04 UF por voto obtenido', clp: '—', ley: 'Art. 17 DFL N°3/2017', nivel: 'info' },
    // ── Financiamiento público ──
    { concepto: 'Aporte público trimestral', limite: '0,02 UF × votos última elección parlamentaria', clp: '—', ley: 'Art. 40 DFL N°4/2017', nivel: 'info' },
    { concepto: 'Fondo de Género mínimo', limite: `${(GENERO_PCT_MINIMO * 100).toFixed(0)}% del aporte estatal`, clp: fmt(APORTE_ESTATAL_ANUAL * GENERO_PCT_MINIMO), ley: 'Art. 38 Ley 20.900', nivel: 'critico' },
    // ── Tributario y previsional ──
    { concepto: 'Tasa retención honorarios (BHE)', limite: `${(TASA_RETENCION_HONORARIOS * 100).toFixed(2)}%`, clp: '—', ley: 'Art. 74 N°2 DL 824', nivel: 'info' },
    { concepto: 'Vencimiento F29', limite: `Día ${F29_DIA_VENCIMIENTO} de cada mes`, clp: '—', ley: 'Art. 74 N°2 DL 824', nivel: 'info' },
    { concepto: 'Vencimiento PREVIRED', limite: `Día ${PREVIRED_DIA_VENCIMIENTO} de cada mes`, clp: '—', ley: 'DL 3.500', nivel: 'info' },
    // ── Transparencia y rendición ──
    { concepto: 'Rendición trimestral SERVEL', limite: '30 días corridos post-trimestre', clp: '—', ley: 'Art. 42 DFL N°4/2017 + DS 1174/2016', nivel: 'critico' },
    { concepto: 'Balance anual SERVEL', limite: '30 de abril del año siguiente', clp: '—', ley: 'Art. 44 DFL N°4/2017', nivel: 'critico' },
    { concepto: 'Norma contable exigida', limite: 'IFRS-PYME (desde balance 2019)', clp: '—', ley: 'Instrucción SERVEL 28/03/2019', nivel: 'info' },
    // ── Inhabilidades y contratos ──
    { concepto: 'Nepotismo — parentesco prohibido', limite: '2° grado consang. / 1° afinidad', clp: '—', ley: 'Art. 39 bis DFL N°4/2017', nivel: 'critico' },
    { concepto: 'Préstamos — acreedores autorizados', limite: 'Banco, cooperativa, caja compensación', clp: '—', ley: 'Art. 39 letra f) DFL N°4/2017', nivel: 'critico' },
    // ── Sanciones ──
    { concepto: 'No llevar libros contables', limite: 'Multa 10-100 UTM', clp: fmt(10 * 66_000) + ' – ' + fmt(100 * 66_000), ley: 'Art. 65 DFL N°4/2017', nivel: 'critico' },
    { concepto: 'Exceso de gasto electoral > 25% tope', limite: 'Multa = 5× el exceso', clp: '—', ley: 'Art. 6 c) DFL N°3/2017', nivel: 'critico' },
    { concepto: 'Inhabilidad directivos (infracciones dolosas)', limite: '3 a 5 años', clp: '—', ley: 'Art. 65 DFL N°4/2017', nivel: 'critico' },
    { concepto: 'Publicación donación recibida', limite: '10 días corridos', clp: '—', ley: 'Art. 13 DFL N°3/2017', nivel: 'advertencia' },
    { concepto: 'Multa Ley 21.719 (datos personales)', limite: 'hasta 5.000 UTM', clp: fmt(5_000 * 66_000), ley: 'Ley 21.719/2024', nivel: 'info' },
  ]

  const nivelStyle = (n: string) =>
    n === 'critico' ? 'bg-red-100 text-red-700' :
    n === 'advertencia' ? 'bg-amber-100 text-amber-700' :
    'bg-blue-100 text-blue-700'

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-500 border-b border-slate-100">
            {['Concepto', 'Límite / Plazo', 'CLP referencial', 'Fuente legal', 'Nivel'].map(h => (
              <th key={h} className="text-left py-3 px-4 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
              <td className="py-2.5 px-4 font-medium text-slate-700">{r.concepto}</td>
              <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">{r.limite}</td>
              <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">{r.clp}</td>
              <td className="py-2.5 px-4 text-xs text-indigo-600 font-medium">{r.ley}</td>
              <td className="py-2.5 px-4">
                <span className={`text-xs px-2 py-0.5 rounded-full ${nivelStyle(r.nivel)}`}>
                  {r.nivel}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function ModuloAlertas() {
  const compliance = useMemo(() => {
    const base = generarAlertasCompliance({
      funcionarios:       FUNCIONARIOS_ACTIVOS,
      donaciones:         DONACIONES_2026,
      prestamos:          PRESTAMOS,
      gastoGenero:        GASTO_GENERO_2026,
      aporteEstatal:      APORTE_ESTATAL_ANUAL,
      retencionPendiente: RETENCION_PENDIENTE,
      directivaCentral:   [],
    })
    // Alerta retroactiva F29 Jun-Dic 2025 (ya vencida — prioridad crítica al tope)
    const alertaBacklog = alertaF29Retroactivo(F29_MESES_VENCIDOS_2025, F29_MONTO_BACKLOG_2025)

    // Alerta pérdida de aporte estatal 2025 (Art. 42 DFL N°4/2017)
    const alertaAporte: import('../normativa').AlertaLegal = {
      id:          'aporte_estatal_suspendido',
      gravedad:    'critica',
      titulo:      `Aporte estatal $0 en ${ANIOS_SIN_APORTE.join(', ')} (en 2024 fue $549,7M)`,
      descripcion: `El partido recibió aporte estatal en 2023 ($345,8M) y 2024 ($549,7M), pero en ${ANIOS_SIN_APORTE.join(', ')} cayó a $0. ` +
                   `Pérdida estimada respecto del nivel 2024: ~${MONTO_APORTE_PERDIDO_EST.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })}. ` +
                   `Art. 42 DFL N°4/2017: SERVEL suspende el pago trimestral cuando existen rendiciones de cuentas no aprobadas.`,
      accion:      'Regularizar las rendiciones pendientes ante SERVEL para rehabilitar el derecho al aporte público. ' +
                   'Presentar plan de regularización al Tesorero Nacional con plazos concretos.',
      ley:         'Art. 42 + Art. 40 DFL N°4/2017',
      modulo:      'aportes',
      plazo:       'URGENTE — cada trimestre sin rendición aprobada prolonga la suspensión',
      monto:       MONTO_APORTE_PERDIDO_EST,
    }

    // Alerta: cuenta por cobrar a entidad relacionada "Progreso" (mayor activo del partido)
    const d2025 = BALANCE_DEFONTANA[2025]
    const alertaProgreso: import('../normativa').AlertaLegal = {
      id:          'progreso_por_cobrar',
      gravedad:    'critica',
      titulo:      `$${(PROGRESO_POR_COBRAR.monto2025 / 1e6).toLocaleString('es-CL', { maximumFractionDigits: 0 })}M por cobrar a empresas relacionadas (Soc. Inv. Progreso SpA / Radio Progreso SpA)`,
      descripcion: `Es el mayor activo del partido (~${Math.round(PROGRESO_POR_COBRAR.pctDelActivo2025 * 100)}% del total) según los EEFF Defontana 2024-2025. ` +
                   `Cuenta por cobrar a EMPRESAS RELACIONADAS CON FINES DE LUCRO (Soc. de Inv. Progreso SpA 76.452.615-5 y Radio Progreso SpA 76.825.989-5), ilíquida. ` +
                   `Un partido no puede financiar empresas con fines de lucro; SERVEL y la auditoría lo cuestionarán como posible traspaso encubierto.`,
      accion:      'Saldo de apertura histórico (origen ≤2023). Existe convenio de 338 cuotas con Soc. Inv. Progreso SpA: CONSEGUIR el convenio firmado y reconstruir el origen de la deuda. Recuperación ~25 años → evaluar provisión por incobrabilidad. Revelar parte relacionada en notas IFRS.',
      ley:         'Art. 45 + Art. 49 DFL N°4/2017 (transparencia) · IFRS-PYME partes relacionadas',
      modulo:      'datos',
      monto:       PROGRESO_POR_COBRAR.monto2025,
    }

    // Alerta: colapso de liquidez + déficit 2025
    const alertaLiquidez: import('../normativa').AlertaLegal = {
      id:          'liquidez_2025',
      gravedad:    'critica',
      titulo:      `Déficit 2025 de ${Math.abs(d2025.resultadoEjercicio!).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })} y caja casi agotada`,
      descripcion: `Resultado del ejercicio 2025: déficit de ${Math.abs(d2025.resultadoEjercicio!).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })}. ` +
                   `Los bancos cayeron de $415.636.000 (2024) a ${d2025.bancos!.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })} (−99%). ` +
                   `El flujo de caja proyectado llega a ${FLUJO_CAJA_PROYECTADO.cajaProyectadaDic2025.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })} sin ingresos: ` +
                   `con costos fijos ~${FLUJO_CAJA_PROYECTADO.egresoFijoMensual.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })}/mes y aporte estatal en $0, ` +
                   `solo el crédito electoral $480M evitó la insolvencia. Crisis estructural de liquidez.`,
      accion:      'Plan de regularización financiera: rehabilitar el aporte estatal (rendiciones pendientes), reducir gasto, y gestionar el cobro a "Progreso". Informar al Tesorero Nacional.',
      ley:         'Art. 42 DFL N°4/2017 (aporte suspendido) · sana administración financiera',
      modulo:      'aportes',
      monto:       Math.abs(d2025.resultadoEjercicio!),
    }

    const alertaPrevired: import('../normativa').AlertaLegal = {
      id:          'previred_dnp',
      gravedad:    'critica',
      titulo:      `Cotizaciones previsionales declaradas y NO pagadas en plazo (${COTIZACIONES_RESUMEN.conDNP} períodos)`,
      descripcion: `Previred 2023-2026: de ${COTIZACIONES_RESUMEN.periodos} períodos, ${COTIZACIONES_RESUMEN.conDNP} se declararon y no se pagaron (DNP) ` +
                   `y ${COTIZACIONES_RESUMEN.conAtraso} se pagaron con atraso. Atraso promedio ${COTIZACIONES_RESUMEN.atrasoPromedioDias} días, máximo ${COTIZACIONES_RESUMEN.atrasoMaxDias} días. ` +
                   `Retener cotizaciones de los trabajadores y no enterarlas en plazo genera reajuste e intereses (Ley 17.322) y expone a cobranza previsional.`,
      accion:      'Regularizar las cotizaciones pendientes y pagar dentro de plazo (día 13 del mes siguiente). Revisar deuda vigente en Previred ("Planillas por Pagar" / "DNP").',
      ley:         'Ley 17.322 · DL 3.500 — pago de cotizaciones previsionales',
      modulo:      'personal',
    }

    const alertas = [alertaAporte, alertaProgreso, alertaLiquidez, alertaBacklog, alertaPrevired, ...base.alertas]
    const criticas = alertas.filter(a => a.gravedad === 'critica').length
    return { ...base, alertas, criticas, total: alertas.length }
  }, [])

  const diasF29      = diasHastaf29()
  const diasPrevired = diasHastaPrevired()
  const rendicion    = proximaRendicionServel()
  const genero       = cumplimientoGenero(GASTO_GENERO_2026, APORTE_ESTATAL_ANUAL)

  const criticas     = compliance.alertas.filter(a => a.gravedad === 'critica')
  const advertencias = compliance.alertas.filter(a => a.gravedad === 'advertencia')

  return (
    <div className="space-y-6">
      {/* ── Semáforo de compliance ── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: 'Alertas Críticas',
            value: compliance.criticas,
            sub: 'Acción inmediata requerida',
            color: compliance.criticas > 0 ? 'text-red-600' : 'text-green-600',
            bg:    compliance.criticas > 0 ? 'bg-red-50' : 'bg-green-50',
            icon:  <ShieldAlert size={20} />,
          },
          {
            label: 'Advertencias',
            value: compliance.advertencias,
            sub: 'Revisar en los próximos días',
            color: compliance.advertencias > 0 ? 'text-amber-600' : 'text-green-600',
            bg:    compliance.advertencias > 0 ? 'bg-amber-50' : 'bg-green-50',
            icon:  <AlertTriangle size={20} />,
          },
          {
            label: 'Fondo Género',
            value: `${genero.pct}%`,
            sub: genero.enRiesgo ? `Déficit: ${fmt(genero.deficit)}` : 'Cuota cumplida',
            color: genero.enRiesgo ? 'text-red-600' : 'text-green-600',
            bg:    genero.enRiesgo ? 'bg-red-50'    : 'bg-green-50',
            icon:  <Heart size={20} />,
          },
          {
            label: 'Compliance global',
            value: compliance.total === 0 ? '✓ OK' : `${compliance.total} items`,
            sub:   compliance.total === 0 ? 'Sin alertas activas' : 'Requieren atención',
            color: compliance.total === 0 ? 'text-green-600' : 'text-red-600',
            bg:    compliance.total === 0 ? 'bg-green-50'    : 'bg-red-50',
            icon:  <Scale size={20} />,
          },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm flex items-start gap-3">
            <div className={`p-2.5 rounded-xl ${k.bg} ${k.color}`}>{k.icon}</div>
            <div>
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-slate-400">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Contadores de vencimientos ── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">Vencimientos Próximos</h2>
        <div className="grid grid-cols-4 gap-4">
          <Contador
            label={`F29 — Retención honorarios (día ${F29_DIA_VENCIMIENTO})`}
            dias={diasF29}
            umbralRojo={5}
            ley="Art. 74 N°2 DL 824"
          />
          <Contador
            label={`PREVIRED — Cotizaciones previsionales (día ${PREVIRED_DIA_VENCIMIENTO})`}
            dias={diasPrevired}
            umbralRojo={3}
            ley="DL 3.500"
          />
          <Contador
            label={rendicion ? `Rendición SERVEL — ${rendicion.trimestre}` : 'Sin rendición próxima'}
            dias={rendicion?.diasRestantes ?? 999}
            umbralRojo={15}
            ley="Art. 42 DFL N°4/2017 + DS 1174/2016"
          />
          <Contador
            label={`Balance anual SERVEL (30 abril ${new Date().getFullYear() + 1})`}
            dias={Math.ceil((new Date(`${new Date().getFullYear() + 1}-04-30`).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
            umbralRojo={30}
            ley="Art. 44 DFL N°4/2017"
          />
        </div>
      </div>

      {/* ── Alertas críticas ── */}
      {criticas.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-red-800 flex items-center gap-2">
            <ShieldAlert size={16} /> Alertas Críticas ({criticas.length})
            <span className="text-xs font-normal text-red-600 ml-1">— Acción inmediata requerida</span>
          </h2>
          {criticas.map(a => <TarjetaAlerta key={a.id} alerta={a} />)}
        </div>
      )}

      {/* ── Advertencias ── */}
      {advertencias.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
            <AlertTriangle size={16} /> Advertencias ({advertencias.length})
          </h2>
          {advertencias.map(a => <TarjetaAlerta key={a.id} alerta={a} />)}
        </div>
      )}

      {/* ── Sin alertas ── */}
      {compliance.total === 0 && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 rounded-2xl px-5 py-6">
          <CheckCircle size={24} />
          <div>
            <p className="font-semibold">Sin alertas activas</p>
            <p className="text-sm">Todos los controles normativos están conformes al momento del análisis.</p>
          </div>
        </div>
      )}

      {/* ── Tabla de límites normativos ── */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Tabla de Límites Legales Vigentes</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Referencia rápida de todos los límites, plazos y prohibiciones aplicables al partido.
            UF al {new Date().toLocaleDateString('es-CL')}: {fmt(VALOR_UF)}
          </p>
        </div>
        <TablaLimites />
        <div className="px-5 py-3 bg-indigo-50 rounded-b-2xl text-xs text-indigo-700">
          <strong>Fuentes (textos refundidos vigentes):</strong> DFL N°4/2017 (Ley 18.603, últ. mod. Ley 21.311/2021) ·
          DFL N°3/2017 (Ley 19.884, últ. mod. Ley 21.693/2024) · Ley 20.900 · Ley 20.915 · Ley 21.719 ·
          DL 824 (Ley de la Renta) · DL 3.500 (AFP) · DS 1174/2016 SERVEL ·
          Res. exenta N°237/2026 Sup. Pensiones · Dictámenes CGR vigentes.
          Los montos en CLP son referenciales según UF del día — verificar con valor UF oficial al momento de la operación.
        </div>
      </div>

      {/* ── Dictámenes CGR relevantes ── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">Dictámenes CGR con Impacto Directo en el Partido</h2>
        {[
          {
            titulo: 'Fondo de Género — Actividades específicas obligatorias',
            descripcion: 'El 10% del Art. 38 Ley 20.900 exige actividades concretas de fomento a la participación femenina. El pago de sueldos a funcionarias en roles generales NO cuenta. Cada gasto debe tener: programa del evento, lista de asistentes firmada e informe de actividad.',
            impacto: 'Alto — afecta cada rendición trimestral',
            color: 'bg-red-50 border-red-200 text-red-800',
          },
          {
            titulo: 'Art. 45 DFL N°4/2017 — No existe límite nominal de sueldo en la ley',
            descripcion: 'El único estándar legal de remuneraciones es el "valor de mercado del cargo" (Art. 45). La cifra de "60 UF" que circula no tiene base en el texto vigente. SERVEL puede objetar sueldos que superen significativamente el valor de mercado durante la auditoría del balance anual.',
            impacto: 'Alto — sueldos sobre el mercado pueden implicar nulidad del contrato y responsabilidad de directivos',
            color: 'bg-blue-50 border-blue-200 text-blue-800',
          },
          {
            titulo: 'Naturaleza jurídica — Partidos no están sujetos a Ley de Compras Públicas',
            descripcion: 'Los partidos son personas jurídicas de derecho público (Art. 1 DFL N°4/2017) pero NO son organismos del Estado. No están obligados a licitar en ChileCompra. Sin embargo, deben justificar y respaldar con documentos toda compra financiada con aporte estatal.',
            impacto: 'Medio — libera de licitación pero exige respaldo documental riguroso',
            color: 'bg-blue-50 border-blue-200 text-blue-800',
          },
          {
            titulo: 'Nepotismo — Art. 39 bis: parentesco a la fecha de contratación',
            descripcion: 'El parentesco prohibido se evalúa al momento de la contratación y durante toda la vigencia del contrato. Si un funcionario se convierte en pariente de un directivo por matrimonio posterior, el contrato debe terminarse.',
            impacto: 'Alto — nulidad retroactiva del contrato y obligación de devolver lo pagado',
            color: 'bg-amber-50 border-amber-200 text-amber-800',
          },
          {
            titulo: 'Donaciones — Eliminación del anonimato post Ley 20.900',
            descripcion: 'Desde 2016 las donaciones anónimas a partidos están prácticamente eliminadas. Todo aporte debe identificar al donante con RUT. Los aportes reservados solo aplican en campaña electoral bajo condiciones muy restringidas.',
            impacto: 'Alto — todo aporte sin RUT identificado debe devolverse',
            color: 'bg-amber-50 border-amber-200 text-amber-800',
          },
          {
            titulo: 'Ley 21.719 — Datos de afiliados como dato sensible (2024)',
            descripcion: 'La filiación política es un dato sensible (Art. 16 Ley 21.719). El partido debe tener política de privacidad, consentimiento explícito de afiliados, registro de actividades de tratamiento y designar un Delegado de Protección de Datos (DPD).',
            impacto: 'Alto — multa hasta 5.000 UTM (~$330M) por incumplimiento',
            color: 'bg-red-50 border-red-200 text-red-800',
          },
        ].map((d, i) => (
          <div key={i} className={`border rounded-xl px-4 py-3 space-y-1 ${d.color}`}>
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-sm">{d.titulo}</p>
              <span className="text-xs font-medium whitespace-nowrap opacity-80 shrink-0">{d.impacto}</span>
            </div>
            <p className="text-xs opacity-90">{d.descripcion}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
