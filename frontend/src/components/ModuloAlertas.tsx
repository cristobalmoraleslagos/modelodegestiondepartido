import { useMemo } from 'react'
import {
  AlertTriangle, ShieldAlert, Info, CheckCircle,
  Scale, Clock, FileWarning, Users, Banknote,
  Heart, Building2, Receipt, Vote,
} from 'lucide-react'
import { fmt, VALOR_UF, APORTE_ESTATAL_ANUAL, MES_ACTUAL } from '../utils'
import {
  generarAlertasCompliance,
  type AlertaLegal,
  // Constantes para la tabla de referencia
  SUELDO_MAX_UF, SUELDO_MAX_CLP,
  DONACION_PARTIDO_MAX_UF, DONACION_PARTIDO_MAX_CLP,
  DONACION_CAMPANA_MAX_UF, DONACION_CAMPANA_MAX_CLP,
  DONACION_UMBRAL_PUBLICACION_UF, DONACION_UMBRAL_PUBLICACION_CLP,
  GENERO_PCT_MINIMO,
  F29_DIA_VENCIMIENTO, PREVIRED_DIA_VENCIMIENTO,
  diasHastaf29, diasHastaPrevired, proximaRendicionServel,
  cumplimientoGenero,
} from '../normativa'

// ─── Datos actuales para generación de alertas ────────────────────────────────
// En producción estos vendrían de la API; aquí usamos datos reales conocidos
const FUNCIONARIOS_ACTIVOS = [
  { nombre: 'Lautaro Carmona Soto',      sueldo: 2_245_875 },
  { nombre: 'Juan Andrés Lagos Espinoza', sueldo: 1_487_363 },
  { nombre: 'Krupskaya Corvalán',         sueldo: 1_541_602 },
  { nombre: 'Pamela Águila Cariz',        sueldo: 1_800_000 },
  { nombre: 'Bárbara Figueroa Sandoval',  sueldo: 1_840_000 },
  { nombre: 'Carlos Ugas Tapia',          sueldo: 2_300_000 },
  { nombre: 'Catalina Lufin',             sueldo: 1_400_000 },
  { nombre: 'Guillermo Adriazola',        sueldo: 1_167_000 },
  { nombre: 'Damián Trujillo',            sueldo: 4_284_000 }, // Sobre 60 UF → ALERTA
]

const DONACIONES_2026 = [
  { donante: 'Constructora Del Valle SpA', esJuridica: true,  acumuladoAnual: 3_000_000 },
  { donante: 'Fundación Progreso Chile',   esJuridica: true,  acumuladoAnual: 5_000_000 },
  { donante: 'Patricio Reyes Soto',        esJuridica: false, acumuladoAnual: 18_600_000 }, // > 500 UF partido
]

const PRESTAMOS = [
  // Ejemplo de préstamo con acreedor ilegal para demostrar la alerta
  // { nombre: 'Persona Natural X', tipo: 'otro' },
]

const GASTO_GENERO_2026   = 0         // Sin datos cargados aún
const RETENCION_PENDIENTE = 9_274_613 // Mayo 2026 (suma pendientes)

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
    { concepto: 'Sueldo máximo por funcionario', limite: `${SUELDO_MAX_UF} UF / mes`, clp: fmt(SUELDO_MAX_CLP), ley: 'Art. 5 Ley 20.900', nivel: 'critico' },
    { concepto: 'Donación al partido (pers. natural)', limite: `${DONACION_PARTIDO_MAX_UF} UF / año`, clp: fmt(DONACION_PARTIDO_MAX_CLP), ley: 'Art. 15 Ley 20.900', nivel: 'critico' },
    { concepto: 'Donación a campaña (pers. natural)', limite: `${DONACION_CAMPANA_MAX_UF.toLocaleString()} UF / elección`, clp: fmt(DONACION_CAMPANA_MAX_CLP), ley: 'Art. 6 Ley 19.884', nivel: 'critico' },
    { concepto: 'Publicación obligatoria donaciones', limite: `> ${DONACION_UMBRAL_PUBLICACION_UF} UF`, clp: fmt(DONACION_UMBRAL_PUBLICACION_CLP), ley: 'Art. 13 Ley 19.884', nivel: 'advertencia' },
    { concepto: 'Fondo de Género mínimo', limite: `${(GENERO_PCT_MINIMO * 100).toFixed(0)}% del aporte estatal`, clp: fmt(APORTE_ESTATAL_ANUAL * GENERO_PCT_MINIMO), ley: 'Art. 38 Ley 20.900', nivel: 'critico' },
    { concepto: 'Donaciones personas jurídicas', limite: 'PROHIBICIÓN ABSOLUTA', clp: '$0', ley: 'Art. 17 Ley 19.884 + Art. 16 Ley 20.900', nivel: 'critico' },
    { concepto: 'Aporte candidato Presidencial', limite: '10.000 UF', clp: fmt(10_000 * VALOR_UF), ley: 'Art. 35 Ley 19.884', nivel: 'critico' },
    { concepto: 'Aporte candidato Diputado', limite: '1.000 UF', clp: fmt(1_000 * VALOR_UF), ley: 'Art. 35 Ley 19.884', nivel: 'critico' },
    { concepto: 'Plazo declarar gasto electoral', limite: '15 días hábiles', clp: '—', ley: 'Art. 24 Ley 19.884', nivel: 'advertencia' },
    { concepto: 'Publicación donación recibida', limite: '10 días corridos', clp: '—', ley: 'Art. 13 Ley 19.884', nivel: 'advertencia' },
    { concepto: 'Tasa retención honorarios', limite: '10,75%', clp: '—', ley: 'Art. 74 N°2 DL 824', nivel: 'info' },
    { concepto: 'Vencimiento F29', limite: `Día ${F29_DIA_VENCIMIENTO} de cada mes`, clp: '—', ley: 'Art. 74 N°2 DL 824', nivel: 'info' },
    { concepto: 'Vencimiento PREVIRED', limite: `Día ${PREVIRED_DIA_VENCIMIENTO} de cada mes`, clp: '—', ley: 'DL 3.500', nivel: 'info' },
    { concepto: 'Rendición trimestral SERVEL', limite: '30 días post-trimestre', clp: '—', ley: 'Art. 33 Ley 20.900 + DS 1174/2016', nivel: 'critico' },
    { concepto: 'Balance anual SERVEL', limite: '30 de abril año siguiente', clp: '—', ley: 'Art. 33 Ley 20.900', nivel: 'critico' },
    { concepto: 'Nepotismo — parentesco prohibido', limite: '2° grado consang. / 1° afinidad', clp: '—', ley: 'Art. 39 bis Ley 18.603', nivel: 'critico' },
    { concepto: 'Préstamos solo de bancos/CMF', limite: 'Banco, cooperativa, caja comp.', clp: '—', ley: 'Art. 14 Ley 20.900', nivel: 'critico' },
    { concepto: 'Multa máxima por infracción', limite: 'hasta 500 UTM', clp: fmt(500 * 66_000), ley: 'Art. 34 Ley 20.900', nivel: 'info' },
    { concepto: 'Multa Ley 21.719 (datos)', limite: 'hasta 5.000 UTM', clp: fmt(5_000 * 66_000), ley: 'Art. Ley 21.719', nivel: 'info' },
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
  const compliance = useMemo(() => generarAlertasCompliance({
    funcionarios:       FUNCIONARIOS_ACTIVOS,
    donaciones:         DONACIONES_2026,
    prestamos:          PRESTAMOS,
    gastoGenero:        GASTO_GENERO_2026,
    aporteEstatal:      APORTE_ESTATAL_ANUAL,
    retencionPendiente: RETENCION_PENDIENTE,
    directivaCentral:   [],
  }), [])

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
            ley="Art. 33 Ley 20.900 + DS 1174/2016"
          />
          <Contador
            label="Balance anual SERVEL (30 abril 2027)"
            dias={Math.ceil((new Date('2027-04-30').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
            umbralRojo={30}
            ley="Art. 33 Ley 20.900"
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
          <strong>Fuentes:</strong> Ley 18.603 · Ley 19.884 · Ley 20.900 · Ley 21.442 · Ley 21.719 ·
          DL 824 (Ley de la Renta) · DL 3.500 (AFP) · DS 1174/2016 SERVEL · Dictámenes CGR vigentes.
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
            titulo: 'Naturaleza jurídica — Partidos no están sujetos a Ley de Compras Públicas',
            descripcion: 'Los partidos son personas jurídicas de derecho público pero NO son organismos del Estado. Por ello, no están obligados a licitar en ChileCompra. Sin embargo, deben justificar y respaldar con documentos toda compra con aporte estatal.',
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
