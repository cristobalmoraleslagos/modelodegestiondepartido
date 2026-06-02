import { useState, type FormEvent } from 'react'
import { Users, UserX, CheckCircle, AlertTriangle, ShieldAlert, Scale } from 'lucide-react'
import { fmt, VALOR_UF } from '../utils'
import { SUELDO_MAX_UF, SUELDO_MAX_CLP } from '../normativa'

interface Funcionario {
  nombre: string; rut: string; calidad: string; sueldo: string
  banco: string; tipoCuenta: string; numeroCuenta: string
  area: string; imputableGenero: boolean; activo: boolean
}

// Parentescos para chequeo antinepotismo (Art. 39 bis Ley 18.603)
const parentescos: Record<string, { directivo: string; grado: string }> = {}

const FUNCIONARIOS_INIT: Funcionario[] = [
  { nombre: 'Lautaro Carmona Soto',      rut: '5892999-9',  calidad: 'Honorarios Permanente',           sueldo: '2245875', banco: 'Banco Estado', tipoCuenta: 'Corriente', numeroCuenta: '—', area: 'Dirección General',        imputableGenero: false, activo: true },
  { nombre: 'Juan Andrés Lagos Espinoza', rut: '5926570-9',  calidad: 'Honorarios Permanente',           sueldo: '1487363', banco: 'Banco Estado', tipoCuenta: 'Corriente', numeroCuenta: '—', area: 'Dirección General',        imputableGenero: false, activo: true },
  { nombre: 'Krupskaya Corvalán',         rut: '13713819-0', calidad: 'Honorarios Permanente',           sueldo: '1541602', banco: 'Banco Chile',  tipoCuenta: 'Corriente', numeroCuenta: '—', area: 'Secretaría',              imputableGenero: true,  activo: true },
  { nombre: 'Pamela Águila Cariz',        rut: '8178828-6',  calidad: 'Código del Trabajo - Indefinido', sueldo: '1800000', banco: '—',           tipoCuenta: '—',         numeroCuenta: '—', area: 'Administración y Finanzas', imputableGenero: true,  activo: true },
  { nombre: 'Bárbara Figueroa Sandoval',  rut: '13664938-8', calidad: 'Honorarios Permanente',           sueldo: '1840000', banco: 'Banco Estado', tipoCuenta: 'Corriente', numeroCuenta: '—', area: 'Secretaría General',      imputableGenero: true,  activo: true },
  { nombre: 'Carlos Ugas Tapia',          rut: '12636656-6', calidad: 'Honorarios Permanente',           sueldo: '2300000', banco: '—',           tipoCuenta: '—',         numeroCuenta: '—', area: 'Dirección General',        imputableGenero: false, activo: true },
  { nombre: 'Catalina Lufin',             rut: '20637037-8', calidad: 'Honorarios Permanente',           sueldo: '1400000', banco: '—',           tipoCuenta: '—',         numeroCuenta: '—', area: 'Administración',           imputableGenero: true,  activo: true },
  { nombre: 'Guillermo Adriazola',        rut: '13847847-5', calidad: 'Honorarios Permanente',           sueldo: '1167000', banco: '—',           tipoCuenta: '—',         numeroCuenta: '—', area: 'Dirección General',        imputableGenero: false, activo: true },
  { nombre: 'Damián Trujillo',            rut: '5916399-4',  calidad: 'Honorarios por Proyecto',         sueldo: '4284000', banco: '—',           tipoCuenta: '—',         numeroCuenta: '—', area: 'Comunicaciones',           imputableGenero: false, activo: true },
]

const PRESUPUESTO_SUELDOS = 40_000_000

const emptyForm = () => ({
  nombre: '', rut: '', calidad: 'Código del Trabajo - Indefinido',
  sueldo: '', banco: '', tipoCuenta: 'Corriente', numeroCuenta: '',
  area: 'Administración', imputableGenero: false,
})

export default function ModuloPersonal() {
  const [form, setForm]           = useState(emptyForm())
  const [submitted, setSubmitted] = useState(false)
  const [blocked, setBlocked]     = useState<string | null>(null)
  const [blockedSueldo, setBlockedSueldo] = useState<string | null>(null)
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>(FUNCIONARIOS_INIT)

  const activos = funcionarios.filter(f => f.activo)
  const sueldoTotal = activos.reduce((s, f) => s + parseInt(f.sueldo || '0'), 0)
  const pctSueldo   = Math.round((sueldoTotal / PRESUPUESTO_SUELDOS) * 100)

  // Detectar funcionarios sobre el límite Art. 5 Ley 20.900
  const sobreLimiteLegal = activos.filter(f => parseInt(f.sueldo || '0') > SUELDO_MAX_CLP)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    // Chequeo antinepotismo — Art. 39 bis Ley 18.603
    const p = parentescos[form.rut]
    if (p) {
      setBlocked(
        `CONTRATACIÓN RECHAZADA: Infracción al Art. 39 bis de la Ley 18.603. ` +
        `El RUT ${form.rut} es ${p.grado} de ${p.directivo}, miembro de la Directiva Central.`
      )
      return
    }
    setBlocked(null)
    // Chequeo límite sueldo — Art. 5 Ley 20.900
    const sueldoNum = parseInt(form.sueldo || '0')
    if (sueldoNum > SUELDO_MAX_CLP) {
      setBlockedSueldo(
        `ADVERTENCIA Art. 5 Ley 20.900: El sueldo ingresado (${fmt(sueldoNum)}) ` +
        `supera el máximo legal de ${SUELDO_MAX_UF} UF = ${fmt(SUELDO_MAX_CLP)}. ` +
        `El exceso (${fmt(sueldoNum - SUELDO_MAX_CLP)}) no puede imputarse al aporte estatal.`
      )
      // No bloquea — solo advierte, permite guardar
    } else {
      setBlockedSueldo(null)
    }
    setFuncionarios(prev => [...prev, { ...form, activo: true }])
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
            Validación antinepotismo (Art. 39 bis Ley 18.603) · Límite sueldo {SUELDO_MAX_UF} UF/mes = {fmt(SUELDO_MAX_CLP)} (Art. 5 Ley 20.900) · UF: {fmt(VALOR_UF)}
          </p>
        </div>

        {/* Alerta sueldo sobre límite legal */}
        {sobreLimiteLegal.length > 0 && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Art. 5 Ley 20.900 — {sobreLimiteLegal.length} funcionario(s) sobre el límite legal de {SUELDO_MAX_UF} UF = {fmt(SUELDO_MAX_CLP)}</p>
              {sobreLimiteLegal.map((f, i) => {
                const sueldo = parseInt(f.sueldo)
                const uf     = (sueldo / VALOR_UF).toFixed(1)
                return (
                  <p key={i} className="text-xs mt-0.5">
                    <strong>{f.nombre}</strong>: {fmt(sueldo)} ({uf} UF) — exceso: {fmt(sueldo - SUELDO_MAX_CLP)}
                  </p>
                )
              })}
              <p className="text-xs mt-1 font-medium">El exceso no puede imputarse al aporte estatal. Ajustar el sueldo o financiar el exceso con fondos propios del partido.</p>
            </div>
          </div>
        )}

        {/* Alerta antinepotismo — directiva vacía */}
        {Object.keys(parentescos).length === 0 && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-xs">Art. 39 bis Ley 18.603 — Validación antinepotismo incompleta</p>
              <p className="text-xs mt-0.5">El registro de parentescos de la Directiva Central está vacío. Cargar los RUTs de directivos y sus parientes en el módulo Carga de Datos para activar la validación completa.</p>
            </div>
          </div>
        )}

        {/* Nota normativa */}
        <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <Scale size={15} className="text-slate-500 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-600">
            <strong>Art. 39 bis Ley 18.603:</strong> Prohibido contratar a cónyuge, conviviente civil o pariente hasta 2° grado de consanguinidad (padres, hijos, hermanos, abuelos, nietos) o 1° de afinidad de miembros de la Directiva Central. Infracción → nulidad del contrato + obligación de devolver lo pagado + multa hasta 50 UTM.
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
                      <span className="ml-1 text-xs text-red-500" title={`Excede límite Art. 5 Ley 20.900 (${SUELDO_MAX_UF} UF)`}>⚠</span>
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

            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="genero" checked={form.imputableGenero}
                onChange={e => setForm(f => ({ ...f, imputableGenero: e.target.checked }))}
                className="w-4 h-4 rounded" />
              <label htmlFor="genero" className="text-sm text-slate-600">
                Imputable al Fondo de Género (Ley 20.900)
              </label>
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
    </div>
  )
}
