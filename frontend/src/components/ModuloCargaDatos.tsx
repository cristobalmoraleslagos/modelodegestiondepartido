import { useState, useRef } from 'react'
import { Trash2, Plus, CheckCircle, Save, Download, Upload, RefreshCw, Zap } from 'lucide-react'
import { useConfig } from '../context/ConfigContext'

// ─── localStorage helpers ─────────────────────────────────────────────────────

function load<T>(key: string, def: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? def } catch { return def }
}
function persist<T>(key: string, val: T) { localStorage.setItem(key, JSON.stringify(val)) }

// ─── Generic editable table ───────────────────────────────────────────────────

type Row = Record<string, string>

interface ColDef {
  key: string
  label: string
  type?: 'text' | 'number' | 'date' | 'select'
  options?: string[]
  width?: string
}

function parseCSV(text: string): string[][] {
  return text.trim().split('\n').map(line =>
    line.split(/,|;/).map(c => c.trim().replace(/^"|"$/g, ''))
  )
}

function EditableTable({ storageKey, cols, empty }: {
  storageKey: string
  cols: ColDef[]
  empty: Row
}) {
  const [rows, setRows] = useState<Row[]>(() => load(storageKey, []))
  const [form, setForm] = useState<Row>({ ...empty })
  const [flash, setFlash] = useState(false)
  const [csvMsg, setCsvMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const mutate = (next: Row[]) => { setRows(next); persist(storageKey, next) }
  const add = () => {
    mutate([...rows, { ...form }])
    setForm({ ...empty })
    setFlash(true); setTimeout(() => setFlash(false), 2000)
  }
  const del = (i: number) => mutate(rows.filter((_, idx) => idx !== i))

  // CSV export
  const exportCSV = () => {
    const header = cols.map(c => c.label).join(',')
    const body = rows.map(r => cols.map(c => `"${r[c.key] ?? ''}"`).join(',')).join('\n')
    const blob = new Blob([header + '\n' + body], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${storageKey}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  // CSV import — maps by column position (header row optional)
  const importCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const matrix = parseCSV(text)
      // detect if first row is headers
      const firstRow = matrix[0]
      const hasHeader = cols.some(c => firstRow.some(h => h.toLowerCase().includes(c.key.toLowerCase()) || h.toLowerCase().includes(c.label.toLowerCase().split(' ')[0])))
      const dataRows = hasHeader ? matrix.slice(1) : matrix
      const imported: Row[] = dataRows.filter(r => r.some(c => c)).map(r => {
        const obj: Row = { ...empty }
        cols.forEach((c, i) => { if (r[i] !== undefined) obj[c.key] = r[i] })
        return obj
      })
      const merged = [...rows, ...imported]
      mutate(merged)
      setCsvMsg(`${imported.length} filas importadas.`)
      setTimeout(() => setCsvMsg(''), 3000)
    }
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  const cols4 = Math.min(cols.length, 4)
  const baseInput = 'border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 w-full'

  const renderInput = (col: ColDef) =>
    col.type === 'select' ? (
      <select className={baseInput} value={form[col.key]}
        onChange={e => setForm(f => ({ ...f, [col.key]: e.target.value }))}>
        {col.options?.map(o => <option key={o}>{o}</option>)}
      </select>
    ) : (
      <input type={col.type ?? 'text'} className={baseInput} value={form[col.key]} placeholder={col.label}
        onChange={e => setForm(f => ({ ...f, [col.key]: e.target.value }))} />
    )

  return (
    <div>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">
          Sin registros. Agregue la primera fila usando el formulario de abajo.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100">
                {cols.map(c => (
                  <th key={c.key} className="text-left py-2.5 px-3 font-medium whitespace-nowrap">{c.label}</th>
                ))}
                <th className="py-2.5 px-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 last:border-0">
                  {cols.map(c => (
                    <td key={c.key} className="py-2.5 px-3 text-slate-700 whitespace-nowrap">{row[c.key] || '—'}</td>
                  ))}
                  <td className="py-2.5 px-2">
                    <button onClick={() => del(i)}
                      className="text-slate-300 hover:text-red-500 transition-colors p-1">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add row form */}
      <div className="border-t border-slate-100 bg-slate-50 px-4 py-4 rounded-b-xl">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Agregar fila</p>
        <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${cols4}, minmax(0, 1fr))` }}>
          {cols.map(c => (
            <div key={c.key}>
              <label className="text-xs text-slate-400 block mb-1">{c.label}</label>
              {renderInput(c)}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <button onClick={add}
            className="flex items-center gap-1.5 bg-amaranto-600 hover:bg-amaranto-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
            <Plus size={13} /> Agregar fila
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-700 text-xs font-medium px-3 py-2 rounded-lg transition-colors bg-white">
            <Download size={13} /> Exportar CSV
          </button>
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 border border-indigo-200 hover:border-indigo-400 text-indigo-600 text-xs font-medium px-3 py-2 rounded-lg transition-colors bg-white">
            <Upload size={13} /> Importar CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={importCSV} />
          {flash && <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle size={13} /> Guardado</span>}
          {csvMsg && <span className="flex items-center gap-1 text-xs text-indigo-600 font-medium"><CheckCircle size={13} /> {csvMsg}</span>}
        </div>
      </div>
    </div>
  )
}

// ─── Configuración general (key-value form) ───────────────────────────────────

interface Cfg { valorUF: string; mesActual: string; aporteEstatal: string; saldoInicial: string; nombrePartido: string }
const CFG_DEF: Cfg = { valorUF: '41500', mesActual: '5', aporteEstatal: '222000000', saldoInicial: '28450300', nombrePartido: '' }

const CFG_FIELDS: { key: keyof Cfg; label: string; hint: string; num: boolean }[] = [
  { key: 'nombrePartido',  label: 'Nombre del partido',            hint: 'Nombre legal completo tal como figura en SERVEL',              num: false },
  { key: 'valorUF',        label: 'Valor UF vigente (CLP)',         hint: 'Actualizar diariamente desde www.sii.cl o cmfchile.cl',         num: true  },
  { key: 'mesActual',      label: 'Mes en curso (1–12)',            hint: 'Controla alertas de sobre-ejecución y ejecución esperada',      num: true  },
  { key: 'aporteEstatal',  label: 'Aporte estatal anual (CLP)',     hint: 'Según resolución SERVEL. Determina cuota del Fondo de Género',  num: true  },
  { key: 'saldoInicial',   label: 'Saldo disponible hoy (CLP)',     hint: 'Cuenta corriente operacional al cierre del día anterior',       num: true  },
]

function SeccionConfig() {
  const { updateConfig } = useConfig()
  const [cfg, setCfg] = useState<Cfg>(() => load('cfp_config', CFG_DEF))
  const [flash, setFlash] = useState(false)
  const [ufLoading, setUfLoading] = useState(false)
  const [ufMsg, setUfMsg] = useState('')

  const save = () => {
    persist('cfp_config', cfg)
    // Propagar al contexto global para que todos los módulos usen los valores actualizados
    updateConfig({
      valorUF:    Number(cfg.valorUF)    || undefined,
      mesActual:  Number(cfg.mesActual)  || undefined,
      aporteAnual: Number(cfg.aporteEstatal) || undefined,
    })
    setFlash(true)
    setTimeout(() => setFlash(false), 2000)
  }

  // Auto-fetch UF from mindicador.cl (free, no key needed)
  const fetchUF = async () => {
    setUfLoading(true); setUfMsg('')
    try {
      const res = await fetch('https://mindicador.cl/api/uf')
      const data = await res.json() as { serie: { fecha: string; valor: number }[] }
      const valor = data.serie[0].valor
      const fecha = data.serie[0].fecha.slice(0, 10)
      setCfg(c => ({ ...c, valorUF: String(Math.round(valor)) }))
      setUfMsg(`UF al ${fecha}: $${valor.toLocaleString('es-CL')}`)
    } catch {
      setUfMsg('Error al consultar. Verifique conexión.')
    } finally {
      setUfLoading(false)
    }
  }

  // Auto-fill mes actual
  const autoMes = () => setCfg(c => ({ ...c, mesActual: String(new Date().getMonth() + 1) }))

  return (
    <div className="max-w-xl space-y-5">
      {/* UF con botón automático */}
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1">Nombre del partido</label>
        <input type="text"
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={cfg.nombrePartido}
          onChange={e => setCfg(c => ({ ...c, nombrePartido: e.target.value }))} />
        <p className="text-xs text-slate-400 mt-0.5">Nombre legal completo tal como figura en SERVEL</p>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1">Valor UF vigente (CLP)</label>
        <div className="flex gap-2">
          <input type="number"
            className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={cfg.valorUF}
            onChange={e => setCfg(c => ({ ...c, valorUF: e.target.value }))} />
          <button onClick={fetchUF} disabled={ufLoading}
            className="flex items-center gap-1.5 border border-green-300 hover:border-green-500 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold px-3 py-2 rounded-xl transition-colors whitespace-nowrap disabled:opacity-50">
            {ufLoading ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
            Obtener automáticamente
          </button>
        </div>
        {ufMsg
          ? <p className="text-xs text-green-600 mt-0.5 font-medium">{ufMsg}</p>
          : <p className="text-xs text-slate-400 mt-0.5">Fuente: mindicador.cl — actualizar diariamente</p>
        }
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1">Mes en curso (1–12)</label>
        <div className="flex gap-2">
          <input type="number"
            className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={cfg.mesActual}
            onChange={e => setCfg(c => ({ ...c, mesActual: e.target.value }))} />
          <button onClick={autoMes}
            className="flex items-center gap-1.5 border border-green-300 hover:border-green-500 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold px-3 py-2 rounded-xl transition-colors whitespace-nowrap">
            <Zap size={13} /> Auto
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">Controla alertas de sobre-ejecución y ejecución esperada</p>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1">Aporte estatal anual (CLP)</label>
        <input type="number"
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={cfg.aporteEstatal}
          onChange={e => setCfg(c => ({ ...c, aporteEstatal: e.target.value }))} />
        <p className="text-xs text-slate-400 mt-0.5">Según resolución SERVEL. Determina cuota del Fondo de Género</p>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1">Saldo disponible hoy (CLP)</label>
        <input type="number"
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={cfg.saldoInicial}
          onChange={e => setCfg(c => ({ ...c, saldoInicial: e.target.value }))} />
        <p className="text-xs text-slate-400 mt-0.5">Cuenta corriente operacional al cierre del día anterior</p>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button onClick={save}
          className="flex items-center gap-2 bg-amaranto-600 hover:bg-amaranto-700 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors">
          <Save size={14} /> Guardar configuración
        </button>
        {flash && <span className="flex items-center gap-1 text-sm text-green-600"><CheckCircle size={14} /> Guardado</span>}
      </div>
    </div>
  )
}

// ─── Section definitions ──────────────────────────────────────────────────────

const CTAS = ['Operacional', 'Campaña', 'Formación Ciudadana', 'Género']

const TABLE_SECTIONS: { id: string; label: string; storageKey: string; cols: ColDef[]; empty: Row; note?: string }[] = [
  {
    id: 'presupuesto', label: 'Presupuesto mensual',
    storageKey: 'cfp_presupuesto',
    note: 'Una fila por mes. Los ingresos se dividen entre aporte estatal (Ley 20.900) y cotizaciones de militantes.',
    cols: [
      { key: 'mes',           label: 'Mes',                  type: 'text'   },
      { key: 'estatal',       label: 'Aporte estatal (CLP)', type: 'number' },
      { key: 'cotizaciones',  label: 'Cotizaciones (CLP)',   type: 'number' },
    ],
    empty: { mes: '', estatal: '', cotizaciones: '' },
  },
  {
    id: 'lineas', label: 'Líneas presupuestarias',
    storageKey: 'cfp_lineas',
    note: 'Presupuesto anual aprobado y ejecución acumulada a la fecha. Alimenta el módulo Ejecución Ppto.',
    cols: [
      { key: 'item',              label: 'Ítem',                  type: 'text'   },
      { key: 'presupuestoAnual',  label: 'Presupuesto anual (CLP)', type: 'number' },
      { key: 'ejecutadoYTD',      label: 'Ejecutado YTD (CLP)',    type: 'number' },
    ],
    empty: { item: '', presupuestoAnual: '', ejecutadoYTD: '' },
  },
  {
    id: 'donaciones', label: 'Donaciones',
    storageKey: 'cfp_donaciones',
    note: 'Personas jurídicas no pueden donar (Ley 19.884). Límite al partido: 500 UF/año (Art. 15 Ley 20.900). Límite a campaña: 3.000 UF/año por persona (Art. 6 Ley 19.884).',
    cols: [
      { key: 'nombre', label: 'Nombre donante',       type: 'text'   },
      { key: 'rut',    label: 'RUT',                   type: 'text'   },
      { key: 'tipo',   label: 'Tipo',                  type: 'select', options: ['Persona Natural', 'Persona Jurídica'] },
      { key: 'monto',  label: 'Monto (CLP)',           type: 'number' },
      { key: 'fecha',  label: 'Fecha',                 type: 'date'   },
      { key: 'servel', label: 'Declarada SERVEL',      type: 'select', options: ['Sí', 'No'] },
    ],
    empty: { nombre: '', rut: '', tipo: 'Persona Natural', monto: '', fecha: '', servel: 'No' },
  },
  {
    id: 'egresos', label: 'Libro de egresos',
    storageKey: 'cfp_egresos',
    note: 'Todo egreso debe tener comprobante tributario (boleta, factura o recibo). Sin comprobante se marca como no documentado.',
    cols: [
      { key: 'fecha',       label: 'Fecha',          type: 'date'   },
      { key: 'concepto',    label: 'Concepto',        type: 'text'   },
      { key: 'proveedor',   label: 'Proveedor',       type: 'text'   },
      { key: 'cuenta',      label: 'Cuenta',          type: 'select', options: CTAS },
      { key: 'monto',       label: 'Monto (CLP)',     type: 'number' },
      { key: 'comprobante', label: 'N° Comprobante',  type: 'text'   },
      { key: 'estado',      label: 'Estado',          type: 'select', options: ['Documentado', 'Sin comprobante'] },
    ],
    empty: { fecha: '', concepto: '', proveedor: '', cuenta: 'Operacional', monto: '', comprobante: '', estado: 'Documentado' },
  },
  {
    id: 'personal', label: 'Personal / Nómina',
    storageKey: 'cfp_personal',
    note: 'Validar RUT contra la tabla de directivos antes de registrar (Art. 39 bis, Ley 18.603 — antinepotismo).',
    cols: [
      { key: 'nombre',      label: 'Nombre',          type: 'text'   },
      { key: 'rut',         label: 'RUT',             type: 'text'   },
      { key: 'cargo',       label: 'Cargo',           type: 'text'   },
      { key: 'calidad',     label: 'Calidad',         type: 'select', options: ['Planta indefinida', 'Plazo fijo', 'Honorarios permanente', 'Honorarios proyecto'] },
      { key: 'sueldoBruto', label: 'Sueldo bruto (CLP)', type: 'number' },
      { key: 'area',        label: 'Área',            type: 'text'   },
      { key: 'banco',       label: 'Banco',           type: 'text'   },
      { key: 'numeroCuenta',label: 'N° cuenta',       type: 'text'   },
      { key: 'genero',      label: 'Fondo Género',    type: 'select', options: ['Sí', 'No'] },
    ],
    empty: { nombre: '', rut: '', cargo: '', calidad: 'Planta indefinida', sueldoBruto: '', area: '', banco: '', numeroCuenta: '', genero: 'No' },
  },
  {
    id: 'retenciones', label: 'Retenciones (honorarios)',
    storageKey: 'cfp_retenciones',
    note: 'Retención 10.75% sobre honorario bruto. Se declara en F29 código 92. Vence el día 20 del mes siguiente.',
    cols: [
      { key: 'nombre',        label: 'Nombre',             type: 'text'   },
      { key: 'rut',           label: 'RUT',                type: 'text'   },
      { key: 'periodo',       label: 'Período',            type: 'text'   },
      { key: 'honorarioBruto',label: 'Honorario bruto (CLP)', type: 'number' },
      { key: 'estado',        label: 'Estado F29',         type: 'select', options: ['Pagado', 'Pendiente', 'Vencido'] },
      { key: 'fechaPago',     label: 'Fecha pago',         type: 'date'   },
    ],
    empty: { nombre: '', rut: '', periodo: '', honorarioBruto: '', estado: 'Pendiente', fechaPago: '' },
  },
  {
    id: 'cuentas', label: 'Cuentas bancarias',
    storageKey: 'cfp_cuentas',
    note: 'Actualizar saldos banco con el cartola del día. La diferencia con el saldo sistema dispara la alerta de conciliación.',
    cols: [
      { key: 'nombre',       label: 'Nombre cuenta',      type: 'text'   },
      { key: 'banco',        label: 'Banco',              type: 'text'   },
      { key: 'numero',       label: 'N° cuenta',          type: 'text'   },
      { key: 'saldoSistema', label: 'Saldo sistema (CLP)',type: 'number' },
      { key: 'saldoBanco',   label: 'Saldo banco (CLP)',  type: 'number' },
      { key: 'fechaCorte',   label: 'Fecha corte',        type: 'date'   },
    ],
    empty: { nombre: '', banco: '', numero: '', saldoSistema: '', saldoBanco: '', fechaCorte: '' },
  },
  {
    id: 'items_conciliacion', label: 'Ítems sin conciliar',
    storageKey: 'cfp_items_conciliacion',
    note: 'Movimientos en cartola no identificados en contabilidad, o viceversa. Deben resolverse antes del cierre mensual.',
    cols: [
      { key: 'fecha',       label: 'Fecha',         type: 'date'   },
      { key: 'descripcion', label: 'Descripción',   type: 'text'   },
      { key: 'monto',       label: 'Monto (CLP)',   type: 'number' },
      { key: 'cuenta',      label: 'Cuenta',        type: 'select', options: CTAS },
      { key: 'tipo',        label: 'Tipo',          type: 'select', options: ['En tránsito', 'No identificado', 'Error contable'] },
    ],
    empty: { fecha: '', descripcion: '', monto: '', cuenta: 'Operacional', tipo: 'En tránsito' },
  },
  {
    id: 'flujo', label: 'Flujo de caja (semanas)',
    storageKey: 'cfp_flujo',
    note: 'Proyección semanal. Ingresos esperados incluye cotizaciones próximas + transferencias de fondos. Egresos solo los comprometidos y con fecha cierta.',
    cols: [
      { key: 'semana',   label: 'Semana (ej: S1 Jun)', type: 'text'   },
      { key: 'ingresos', label: 'Ingresos esperados (CLP)', type: 'number' },
      { key: 'egresos',  label: 'Egresos comprometidos (CLP)', type: 'number' },
    ],
    empty: { semana: '', ingresos: '', egresos: '' },
  },
  {
    id: 'compromisos', label: 'Compromisos de pago',
    storageKey: 'cfp_compromisos',
    note: 'Obligaciones con fecha cierta. Tipo Fijo = contratos permanentes; Variable = compromisos puntuales aprobados por directiva.',
    cols: [
      { key: 'concepto',        label: 'Concepto',    type: 'text'   },
      { key: 'monto',           label: 'Monto (CLP)', type: 'number' },
      { key: 'fechaVencimiento',label: 'Vencimiento', type: 'date'   },
      { key: 'tipo',            label: 'Tipo',        type: 'select', options: ['Fijo', 'Variable'] },
      { key: 'cuenta',          label: 'Cuenta',      type: 'text'   },
    ],
    empty: { concepto: '', monto: '', fechaVencimiento: '', tipo: 'Fijo', cuenta: '' },
  },
  {
    id: 'activos', label: 'Activos fijos',
    storageKey: 'cfp_activos',
    note: 'Depreciación lineal. Tecnología y Equipos AV: 3–4 años. Mobiliario: 7 años. Vehículos: 5 años (SII Circ. 13/2021).',
    cols: [
      { key: 'codigo',          label: 'Código',           type: 'text'   },
      { key: 'descripcion',     label: 'Descripción',      type: 'text'   },
      { key: 'categoria',       label: 'Categoría',        type: 'select', options: ['Tecnología', 'Mobiliario', 'Vehículos', 'Equipos AV'] },
      { key: 'valorAdquisicion',label: 'Valor adq. (CLP)', type: 'number' },
      { key: 'fechaAdquisicion',label: 'Fecha adq.',       type: 'date'   },
      { key: 'vidaUtilAnios',   label: 'Vida útil (años)', type: 'number' },
      { key: 'ubicacion',       label: 'Ubicación',        type: 'text'   },
      { key: 'estado',          label: 'Estado',           type: 'select', options: ['Operativo', 'En mantención', 'Dado de baja'] },
    ],
    empty: { codigo: '', descripcion: '', categoria: 'Tecnología', valorAdquisicion: '', fechaAdquisicion: '', vidaUtilAnios: '', ubicacion: '', estado: 'Operativo' },
  },
  {
    id: 'declaraciones', label: 'Declaraciones de interés',
    storageKey: 'cfp_declaraciones',
    note: 'Directivos, tesorero y gerente deben renovar declaración anualmente (Art. 36 bis, Ley 18.603). Vencida = alerta roja.',
    cols: [
      { key: 'nombre',           label: 'Nombre',              type: 'text' },
      { key: 'rut',              label: 'RUT',                 type: 'text' },
      { key: 'cargo',            label: 'Cargo',               type: 'text' },
      { key: 'fechaDeclaracion', label: 'Fecha declaración',   type: 'date' },
      { key: 'fechaVencimiento', label: 'Fecha vencimiento',   type: 'date' },
      { key: 'intereses',        label: 'Intereses declarados',type: 'text' },
    ],
    empty: { nombre: '', rut: '', cargo: '', fechaDeclaracion: '', fechaVencimiento: '', intereses: '' },
  },
]

// ─── Export helper ────────────────────────────────────────────────────────────

function exportAll() {
  const snapshot: Record<string, unknown> = { cfp_config: load('cfp_config', CFG_DEF) }
  TABLE_SECTIONS.forEach(s => { snapshot[s.storageKey] = load(s.storageKey, []) })
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = `datos-financieros-${new Date().toISOString().slice(0, 10)}.json`
  a.click(); URL.revokeObjectURL(url)
}

// ─── Main component ───────────────────────────────────────────────────────────

type SectionId = 'config' | (typeof TABLE_SECTIONS)[number]['id']

const ALL_SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'config', label: 'Configuración general' },
  ...TABLE_SECTIONS.map(s => ({ id: s.id as SectionId, label: s.label })),
]

export default function ModuloCargaDatos() {
  const [section, setSection] = useState<SectionId>('config')
  const active = TABLE_SECTIONS.find(s => s.id === section)

  return (
    <div className="flex gap-5 items-start">
      {/* Mini sidebar */}
      <div className="w-52 flex-shrink-0 space-y-2">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {ALL_SECTIONS.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              className={`w-full text-left px-4 py-2.5 text-xs font-medium border-b border-slate-50 last:border-0 transition-colors leading-snug ${
                section === s.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`}>
              {s.label}
            </button>
          ))}
        </div>
        <button onClick={exportAll}
          className="w-full flex items-center justify-center gap-2 border border-slate-200 hover:border-indigo-300 text-slate-500 hover:text-indigo-600 text-xs font-medium py-2.5 rounded-xl bg-white transition-colors">
          <Download size={13} /> Exportar JSON
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm overflow-hidden min-w-0">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">
            {section === 'config' ? 'Configuración general' : active?.label}
          </h2>
          {active?.note && (
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{active.note}</p>
          )}
        </div>
        <div className={section === 'config' ? 'p-5' : ''}>
          {section === 'config' && <SeccionConfig />}
          {active && (
            <EditableTable storageKey={active.storageKey} cols={active.cols} empty={active.empty} />
          )}
        </div>
      </div>
    </div>
  )
}
