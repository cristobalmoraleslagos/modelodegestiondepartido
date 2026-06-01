import { useState, type FormEvent } from 'react'
import { Users, UserX, CheckCircle } from 'lucide-react'
import { fmt } from '../utils'

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
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>(FUNCIONARIOS_INIT)

  const activos = funcionarios.filter(f => f.activo)
  const sueldoTotal = activos.reduce((s, f) => s + parseInt(f.sueldo || '0'), 0)
  const pctSueldo   = Math.round((sueldoTotal / PRESUPUESTO_SUELDOS) * 100)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const p = parentescos[form.rut]
    if (p) {
      setBlocked(
        `CONTRATACIÓN RECHAZADA: Infracción al Art. 39 bis de la Ley 18.603. ` +
        `El RUT ${form.rut} es ${p.grado} de ${p.directivo}, miembro de la Directiva Central.`
      )
      return
    }
    setBlocked(null)
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
            Validación antinepotismo automática — Art. 39 bis Ley 18.603
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
                  <td className="py-2 text-right pr-4 text-slate-700">{fmt(parseInt(f.sueldo))}</td>
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
