import { useState, type FormEvent } from 'react'
import { Users, UserX, CheckCircle, AlertTriangle, ShieldAlert, Scale, History, ChevronDown } from 'lucide-react'
import { fmt, VALOR_UF } from '../utils'
import { SUELDO_MAX_UF, SUELDO_MAX_CLP } from '../normativa'
import { FUNCIONARIOS_CANON, type Funcionario } from '../data/personal'
import { BHE_HISTORICO, BHE_TOTALES_ANUALES, type ContratistaBHE } from '../data/bhe_historico'

// Parentescos para chequeo antinepotismo (Art. 39 bis DFL N°4/2017)
const parentescos: Record<string, { directivo: string; grado: string }> = {}

const PRESUPUESTO_SUELDOS = 40_000_000

const emptyForm = () => ({
  nombre: '', rut: '', calidad: 'Código del Trabajo - Indefinido',
  sueldo: '', banco: '', tipoCuenta: 'Corriente', numeroCuenta: '',
  area: 'Administración', imputableGenero: false,
})

const ANIOS_BHE = [2025, 2024, 2023, 2022] as const

export default function ModuloPersonal() {
  const [form, setForm]           = useState(emptyForm())
  const [submitted, setSubmitted] = useState(false)
  const [blocked, setBlocked]     = useState<string | null>(null)
  const [blockedSueldo, setBlockedSueldo] = useState<string | null>(null)
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>(() => {
    const extras: Funcionario[] = JSON.parse(localStorage.getItem('fp_personal') ?? '[]')
    return [...FUNCIONARIOS_CANON, ...extras]
  })
  const [anioBHE, setAnioBHE]         = useState<number>(2025)
  const [mostrarBHE, setMostrarBHE]   = useState(true)

  const activos = funcionarios.filter(f => f.activo)
  const sueldoTotal = activos.reduce((s, f) => s + parseInt(f.sueldo || '0'), 0)
  const pctSueldo   = Math.round((sueldoTotal / PRESUPUESTO_SUELDOS) * 100)

  // Datos BHE filtrados por año
  const contratistasAnio: ContratistaBHE[] = BHE_HISTORICO.filter(c => c.anio === anioBHE)
    .sort((a, b) => b.bruto - a.bruto)
  const totalesAnio = BHE_TOTALES_ANUALES[anioBHE]

  // Detectar funcionarios sobre el tope imponible previsional (referencia Art. 45 DFL N°4/2017)
  // NOTA: No existe límite nominal de sueldo en la ley — el estándar es "valor de mercado"
  const sobreLimiteLegal = activos.filter(f => parseInt(f.sueldo || '0') > SUELDO_MAX_CLP)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    // Chequeo antinepotismo — Art. 39 bis DFL N°4/2017
    const p = parentescos[form.rut]
    if (p) {
      setBlocked(
        `CONTRATACIÓN RECHAZADA: Infracción al Art. 39 bis DFL N°4/2017. ` +
        `El RUT ${form.rut} es ${p.grado} de ${p.directivo}, miembro de la Directiva Central.`
      )
      return
    }
    setBlocked(null)
    // Referencia sueldo — Art. 45 DFL N°4/2017 (estándar: valor de mercado)
    // No existe límite nominal en la ley — se usa tope imponible previsional como referencia
    const sueldoNum = parseInt(form.sueldo || '0')
    if (sueldoNum > SUELDO_MAX_CLP) {
      setBlockedSueldo(
        `ADVERTENCIA Art. 45 DFL N°4/2017: El sueldo ingresado (${fmt(sueldoNum)}) ` +
        `supera el tope imponible previsional de ${SUELDO_MAX_UF} UF = ${fmt(SUELDO_MAX_CLP)} (Res. 237/2026). ` +
        `El exceso (${fmt(sueldoNum - SUELDO_MAX_CLP)}) no tributa previsional. ` +
        `Verificar que el monto corresponde al valor de mercado del cargo.`
      )
      // No bloquea — solo advierte, permite guardar
    } else {
      setBlockedSueldo(null)
    }
    const nuevo: Funcionario = { ...form, activo: true }
    setFuncionarios(prev => [...prev, nuevo])
    // Persistir solo los extras (no los de FUNCIONARIOS_CANON)
    const extras: Funcionario[] = JSON.parse(localStorage.getItem('fp_personal') ?? '[]')
    localStorage.setItem('fp_personal', JSON.stringify([...extras, nuevo]))
    setForm(emptyForm())
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
  }

  type K = keyof ReturnType<typeof emptyForm>
  const inp = (k: K, t = 'text', ph = '') => (
    <input type={t} placeholder={ph} value={form[k] as string}
      onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
      className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
  )
  const sel = (k: K, opts: string[]) => (
    <select value={form[k] as string}
      onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
      className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
      {opts.map(o => <option key={o}>{o}</option>)}
    </select>
  )
  const field = (label: string, node: React.ReactNode) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {node}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Módulo de Nómina y Personal</h2>
          <p className="text-xs text-slate-500">
            Antinepotismo (Art. 39 bis DFL N°4/2017) · Estándar sueldo: valor de mercado (Art. 45 DFL N°4/2017) · Referencia tope imponible: {SUELDO_MAX_UF} UF = {fmt(SUELDO_MAX_CLP)} (Res. 237/2026) · UF: {fmt(VALOR_UF)}
          </p>
        </div>

        {/* Alerta sueldo sobre límite legal */}
        {sobreLimiteLegal.length > 0 && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Art. 45 DFL N°4/2017 — {sobreLimiteLegal.length} funcionario(s) sobre el tope imponible previsional ({SUELDO_MAX_UF} UF = {fmt(SUELDO_MAX_CLP)})</p>
              {sobreLimiteLegal.map((f, i) => {
                const sueldo = parseInt(f.sueldo)
                const uf     = (sueldo / VALOR_UF).toFixed(1)
                return (
                  <p key={i} className="text-xs mt-0.5">
                    <strong>{f.nombre}</strong>: {fmt(sueldo)} ({uf} UF) — exceso: {fmt(sueldo - SUELDO_MAX_CLP)}
                  </p>
                )
              })}
              <p className="text-xs mt-1 font-medium">No existe límite nominal en la ley — el estándar es valor de mercado del cargo (Art. 45 DFL N°4/2017). SERVEL puede objetar sueldos que superen significativamente el mercado durante la auditoría del balance anual.</p>
            </div>
          </div>
        )}

        {/* Alerta antinepotismo — directiva vacía */}
        {Object.keys(parentescos).length === 0 && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-xs">Art. 39 bis DFL N°4/2017 — Validación antinepotismo incompleta</p>
              <p className="text-xs mt-0.5">El registro de parentescos de la Directiva Central está vacío. Cargar los RUTs de directivos y sus parientes en el módulo Carga de Datos para activar la validación completa.</p>
            </div>
          </div>
        )}

        {/* Nota normativa */}
        <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <Scale size={15} className="text-slate-500 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-600">
            <strong>Art. 39 bis DFL N°4/2017:</strong> Prohibido contratar a cónyuge, conviviente civil o pariente hasta 2° grado de consanguinidad (padres, hijos, hermanos, abuelos, nietos) o 1° de afinidad de miembros de la Directiva Central. Infracción → nulidad del contrato + obligación de devolver lo pagado + multa hasta 50 UTM.
          </p>
        </div>

        {/* Barra de presupuesto */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-slate-600">Presupuesto mensual de sueldos</span>
            <span className={`font-semibold ${pctSueldo > 90 ? 'text-red-600' : 'text-slate-700'}`}>
              {fmt(sueldoTotal)} / {fmt(PRESUPUESTO_SUELDOS)} ({pctSueldo}%)
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3">
            <div className="h-3 rounded-full" style={{
              width: `${Math.min(pctSueldo, 100)}%`,
              background: pctSueldo > 90 ? '#ef4444' : pctSueldo > 70 ? '#f59e0b' : '#003087',
            }} />
          </div>
        </div>

        {/* Tabla nómina */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <Users size={15} /> Nómina activa ({activos.length})
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100">
                {['Nombre', 'Calidad', 'Área', 'Sueldo bruto', 'Género'].map(h => (
                  <th key={h} className="text-left py-2 pr-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activos.map((f, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0">
                  <td className="py-2 pr-4 font-medium text-slate-800">{f.nombre}</td>
                  <td className="py-2 pr-4 text-slate-500">{f.calidad.split(' - ')[0]}</td>
                  <td className="py-2 pr-4 text-slate-500">{f.area}</td>
                  <td className="py-2 text-right pr-4">
                    <span className={parseInt(f.sueldo) > SUELDO_MAX_CLP ? 'text-red-600 font-semibold' : 'text-slate-700'}>
                      {fmt(parseInt(f.sueldo))}
                    </span>
                    {parseInt(f.sueldo) > SUELDO_MAX_CLP && (
                      <span className="ml-1 text-xs text-amber-500" title={`Supera tope imponible previsional (${SUELDO_MAX_UF} UF) — verificar valor de mercado Art. 45 DFL N°4/2017`}>⚠</span>
                    )}
                    <div className="text-xs text-slate-400">{(parseInt(f.sueldo)/VALOR_UF).toFixed(1)} UF</div>
                  </td>
                  <td className="py-2">
                    {f.imputableGenero
                      ? <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Fondo Género</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Formulario agregar */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Agregar funcionario</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
            {field('Nombre completo', inp('nombre', 'text', 'Ej: Juan Pérez'))}
            {field('RUT', inp('rut', 'text', '12345678-9'))}
            {field('Calidad contractual', sel('calidad', [
              'Código del Trabajo - Indefinido', 'Código del Trabajo - Plazo Fijo',
              'Honorarios Permanente', 'Honorarios por Proyecto',
            ]))}
            {field('Área de desempeño', sel('area', [
              'Administración', 'Formación Ciudadana', 'Investigación', 'Comunicaciones',
            ]))}
            {field('Sueldo bruto (CLP)', inp('sueldo', 'number', '1500000'))}
            {field('Banco', inp('banco', 'text', 'Banco Estado'))}
            {field('Tipo de cuenta', sel('tipoCuenta', ['Corriente', 'Vista', 'Ahorro']))}
            {field('Número de cuenta', inp('numeroCuenta', 'text', '0001234567'))}

            <div className="col-span-2 space-y-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="genero" checked={form.imputableGenero}
                  onChange={e => setForm(f => ({ ...f, imputableGenero: e.target.checked }))}
                  className="w-4 h-4 rounded" />
                <label htmlFor="genero" className="text-sm text-slate-600">
                  Imputable al Fondo de Género (Ley 20.900)
                </label>
              </div>
              {form.imputableGenero && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <AlertTriangle size={13} className="text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800">
                    <strong>Dictamen CGR:</strong> Marcar este sueldo como "Fondo de Género" <strong>NO cumple el 10% del Art. 38 Ley 20.900</strong>.
                    El fondo exige <em>actividades específicas</em> dirigidas a mujeres: programa, lista de asistentes firmada e informe.
                    Incluir sueldos generales en este campo no los hará válidos para SERVEL y puede ser observado en la auditoría.
                  </p>
                </div>
              )}
            </div>

            {blocked && (
              <div className="col-span-2 flex items-start gap-2 bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm font-medium">
                <UserX size={16} className="mt-0.5 shrink-0" />{blocked}
              </div>
            )}
            {blockedSueldo && (
              <div className="col-span-2 flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm font-medium">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />{blockedSueldo}
              </div>
            )}
            {submitted && (
              <div className="col-span-2 flex items-center gap-2 bg-green-50 text-green-800 rounded-xl px-4 py-3 text-sm font-medium">
                <CheckCircle size={16} /> Funcionario agregado correctamente.
              </div>
            )}

            <div className="col-span-2">
              <button type="submit"
                className="w-full bg-amaranto-600 hover:bg-amaranto-700 text-white font-medium rounded-xl py-2.5 text-sm transition-colors">
                Registrar funcionario
              </button>
            </div>
          </form>
        </div>
      </div>
      {/* ── Sección Histórico BHE ── */}
      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={16} className="text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-800">Nómina Histórica BHE (SII)</h2>
            <span className="text-xs text-slate-400">· Contratistas ≥ 20 UTM anuales · Art. 42 DFL N°4/2017</span>
          </div>
          <button
            onClick={() => setMostrarBHE(v => !v)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
          >
            <ChevronDown size={14} className={mostrarBHE ? 'rotate-180 transition-transform' : 'transition-transform'} />
            {mostrarBHE ? 'Colapsar' : 'Expandir'}
          </button>
        </div>

        {/* Selector de año */}
        <div className="flex items-center gap-2">
          {ANIOS_BHE.map(a => (
            <button key={a} onClick={() => setAnioBHE(a)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                anioBHE === a
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}>
              {a}
            </button>
          ))}
          {totalesAnio && (
            <span className="ml-auto text-xs text-slate-500">
              {totalesAnio.contratistas} contratistas · Bruto: {fmt(totalesAnio.bruto)} · Retención: {fmt(totalesAnio.retencion)}
            </span>
          )}
        </div>

        {/* Tabla contratistas BHE */}
        {mostrarBHE && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-100">
                  {['#', 'Nombre', 'RUT', 'Bruto anual', 'Retención', 'Boletas', 'Meses'].map(h => (
                    <th key={h} className="text-left py-2 pr-4 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contratistasAnio.map((c, i) => (
                  <tr key={c.rut} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="py-2 pr-4 text-slate-400 text-xs">{i + 1}</td>
                    <td className="py-2 pr-4 font-medium text-slate-800 capitalize">
                      {c.nombre.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </td>
                    <td className="py-2 pr-4 text-slate-500 font-mono text-xs">{c.rut}</td>
                    <td className="py-2 pr-4 text-right font-semibold text-slate-700">
                      {fmt(c.bruto)}
                      <div className="text-xs font-normal text-slate-400">{(c.bruto / VALOR_UF).toFixed(1)} UF</div>
                    </td>
                    <td className="py-2 pr-4 text-right text-slate-600">{fmt(c.retencion)}</td>
                    <td className="py-2 pr-4 text-center text-slate-500">{c.boletas}</td>
                    <td className="py-2 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        c.meses >= 10 ? 'bg-green-100 text-green-700' :
                        c.meses >= 6  ? 'bg-amber-100 text-amber-700' :
                                        'bg-slate-100 text-slate-600'
                      }`}>{c.meses}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td colSpan={3} className="py-2 pr-4 text-xs font-semibold text-slate-600">
                    Total {anioBHE} ({contratistasAnio.length} contratistas ≥ 20 UTM)
                  </td>
                  <td className="py-2 pr-4 text-right font-bold text-slate-800">
                    {fmt(contratistasAnio.reduce((s, c) => s + c.bruto, 0))}
                  </td>
                  <td className="py-2 pr-4 text-right font-bold text-slate-700">
                    {fmt(contratistasAnio.reduce((s, c) => s + c.retencion, 0))}
                  </td>
                  <td className="py-2 pr-4 text-center font-bold text-slate-700">
                    {contratistasAnio.reduce((s, c) => s + c.boletas, 0)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
