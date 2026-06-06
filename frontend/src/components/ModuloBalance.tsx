import { useState, useMemo } from 'react'
import {
  CheckCircle, AlertTriangle, ShieldAlert, Scale, FileText,
  ArrowRight, TrendingUp, TrendingDown, Equal, BarChart2,
} from 'lucide-react'
import { fmt, APORTE_ESTATAL_ANUAL } from '../utils'
import { BALANCE_2022, type CuentaBalance } from '../data/balance'

// ════════════════════════════════════════════════════════════════════════
// PUNTO B — MOTOR DE CONCILIACIÓN MÓDULO 12 (CSV SERVEL) ↔ MÓDULO 15 (BALANCE)
//
// El Módulo 12 usa ítems SERVEL (63 posibles). El Módulo 15 (Balance) usa
// cuentas contables. Esta tabla mapea cada ítem CSV a su cuenta contable.
//
// Descubierto en la auditoría: el CSV mezcla gastos reales con movimientos
// de balance (pasivos, activos, transferencias internas). El balance los separa.
// ════════════════════════════════════════════════════════════════════════

type TipoContable = 'gasto_corriente' | 'gasto_electoral' | 'gasto_genero' |
  'gasto_admin' | 'gasto_financiero' | 'depreciacion' |
  'activo' | 'pasivo' | 'movimiento_interno' | 'otro'

interface MapeoContable {
  itemCSV:        string
  cuentaBalance:  string
  tipo:           TipoContable
  enEstadoResultados: boolean  // true = es gasto/ingreso; false = es activo/pasivo
  nota?:          string
}

const MAPEO_SERVEL_BALANCE: MapeoContable[] = [
  // ─── GASTOS REALES (aparecen en el Estado de Resultados) ─────────────
  { itemCSV: 'Gastos de Personal',                                        cuentaBalance: 'Gastos Corrientes',          tipo: 'gasto_corriente',   enEstadoResultados: true },
  { itemCSV: 'Adquisición de Bienes o Servicios y Gastos corrientes',    cuentaBalance: 'Gastos Corrientes',          tipo: 'gasto_corriente',   enEstadoResultados: true },
  { itemCSV: 'Gastos de adquisición de bienes y servicios o gastos corrientes', cuentaBalance: 'Gastos Corrientes',   tipo: 'gasto_corriente',   enEstadoResultados: true },
  { itemCSV: 'Otros gastos de administración',                           cuentaBalance: 'Gastos de Administración',   tipo: 'gasto_admin',       enEstadoResultados: true },
  { itemCSV: 'Otros gastos de Administración',                           cuentaBalance: 'Gastos de Administración',   tipo: 'gasto_admin',       enEstadoResultados: true },
  { itemCSV: 'Gastos Notariales',                                        cuentaBalance: 'Gastos de Administración',   tipo: 'gasto_admin',       enEstadoResultados: true },
  { itemCSV: 'Eventos Partidarios',                                      cuentaBalance: 'Gastos de Administración',   tipo: 'gasto_admin',       enEstadoResultados: true },
  { itemCSV: 'Provisión de finiquito',                                   cuentaBalance: 'Provisiones (Pasivo Cte.)',   tipo: 'pasivo',            enEstadoResultados: false, nota: 'Es un pasivo contable, no un gasto efectivo hasta que se paga' },

  // ─── FONDO DE GÉNERO (categoría separada en el balance — Art. 38 Ley 20.900) ─
  { itemCSV: 'Actividades de Fomento a Participación Femenina',          cuentaBalance: 'Gastos Part. Femenina',      tipo: 'gasto_genero',      enEstadoResultados: true, nota: 'Dictamen CGR: requiere programa + lista asistentes + informe' },
  { itemCSV: 'Gastos de actividades de fomento a la participación femenina', cuentaBalance: 'Gastos Part. Femenina', tipo: 'gasto_genero',      enEstadoResultados: true },
  { itemCSV: 'Actividades 10% mujer',                                    cuentaBalance: 'Gastos Part. Femenina',      tipo: 'gasto_genero',      enEstadoResultados: true },

  // ─── FOMENTO JUVENIL / EDUCACIÓN / INVESTIGACIÓN / FORMACIÓN ─────────
  { itemCSV: 'Actividades de Fomento a Participación Juvenil',           cuentaBalance: 'Gastos Corrientes',          tipo: 'gasto_corriente',   enEstadoResultados: true },
  { itemCSV: 'Gastos de actividades de fomento a la participación de los jóvenes', cuentaBalance: 'Gastos Corrientes', tipo: 'gasto_corriente', enEstadoResultados: true },
  { itemCSV: 'Actividades de Educación Cívica',                          cuentaBalance: 'Gastos Corrientes',          tipo: 'gasto_corriente',   enEstadoResultados: true },
  { itemCSV: 'Gastos de actividades de educación cívica',                cuentaBalance: 'Gastos Corrientes',          tipo: 'gasto_corriente',   enEstadoResultados: true },
  { itemCSV: 'Actividades de Investigación',                             cuentaBalance: 'Gastos Corrientes',          tipo: 'gasto_corriente',   enEstadoResultados: true },
  { itemCSV: 'Gastos de actividades de investigación',                   cuentaBalance: 'Gastos Corrientes',          tipo: 'gasto_corriente',   enEstadoResultados: true },
  { itemCSV: 'Preparacion de militantes',                                cuentaBalance: 'Gastos Corrientes',          tipo: 'gasto_corriente',   enEstadoResultados: true },
  { itemCSV: 'Gastos de las actividades de formación de militantes',     cuentaBalance: 'Gastos Corrientes',          tipo: 'gasto_corriente',   enEstadoResultados: true },
  { itemCSV: 'Preparación de candidatos (elección popular)',             cuentaBalance: 'Gastos Electorales',         tipo: 'gasto_electoral',   enEstadoResultados: true },
  { itemCSV: 'Preparación de candidatos (eleccion popular)',             cuentaBalance: 'Gastos Electorales',         tipo: 'gasto_electoral',   enEstadoResultados: true },
  { itemCSV: 'Gastos de las actividades de preparación de candidatos a cargos de elección popular', cuentaBalance: 'Gastos Electorales', tipo: 'gasto_electoral', enEstadoResultados: true },

  // ─── GASTOS ELECTORALES (categoría separada en el balance) ──────────
  { itemCSV: 'Publicidad Electoral',                                     cuentaBalance: 'Gastos Electorales',         tipo: 'gasto_electoral',   enEstadoResultados: true },
  { itemCSV: 'Campaña Presidencial',                                     cuentaBalance: 'Gastos Electorales',         tipo: 'gasto_electoral',   enEstadoResultados: true },
  { itemCSV: 'Campaña Diputados',                                        cuentaBalance: 'Gastos Electorales',         tipo: 'gasto_electoral',   enEstadoResultados: true },
  { itemCSV: 'Campaña Senadores',                                        cuentaBalance: 'Gastos Electorales',         tipo: 'gasto_electoral',   enEstadoResultados: true },
  { itemCSV: 'Campaña Alcaldes',                                         cuentaBalance: 'Gastos Electorales',         tipo: 'gasto_electoral',   enEstadoResultados: true },
  { itemCSV: 'Campaña Concejales',                                       cuentaBalance: 'Gastos Electorales',         tipo: 'gasto_electoral',   enEstadoResultados: true },
  { itemCSV: 'Campaña Gobernadores Regionales',                          cuentaBalance: 'Gastos Electorales',         tipo: 'gasto_electoral',   enEstadoResultados: true },
  { itemCSV: 'Campaña Consejeros Regionales',                            cuentaBalance: 'Gastos Electorales',         tipo: 'gasto_electoral',   enEstadoResultados: true },
  { itemCSV: 'Campaña Primarias Presidencial',                           cuentaBalance: 'Gastos Electorales',         tipo: 'gasto_electoral',   enEstadoResultados: true },
  { itemCSV: 'Gasto Electoral Diputados',                                cuentaBalance: 'Gastos Electorales',         tipo: 'gasto_electoral',   enEstadoResultados: true },
  { itemCSV: 'Gasto Electoral Senadores',                                cuentaBalance: 'Gastos Electorales',         tipo: 'gasto_electoral',   enEstadoResultados: true },
  { itemCSV: 'Gasto Electoral Presidencial',                             cuentaBalance: 'Gastos Electorales',         tipo: 'gasto_electoral',   enEstadoResultados: true },
  { itemCSV: 'Material Grafico Campaña',                                 cuentaBalance: 'Gastos Electorales',         tipo: 'gasto_electoral',   enEstadoResultados: true },
  { itemCSV: 'Honorarios Campaña',                                       cuentaBalance: 'Gastos Electorales',         tipo: 'gasto_electoral',   enEstadoResultados: true },
  { itemCSV: 'Gastos Menores Campaña',                                   cuentaBalance: 'Gastos Electorales',         tipo: 'gasto_electoral',   enEstadoResultados: true },
  { itemCSV: 'Otros gastos Electorales',                                 cuentaBalance: 'Gastos Electorales',         tipo: 'gasto_electoral',   enEstadoResultados: true },
  { itemCSV: 'Aporte Electoral',                                         cuentaBalance: 'Gastos Electorales',         tipo: 'gasto_electoral',   enEstadoResultados: true },
  { itemCSV: 'Aporte Campaña Diputados',                                 cuentaBalance: 'Gastos Electorales',         tipo: 'gasto_electoral',   enEstadoResultados: true },
  { itemCSV: 'Aporte Campaña Senadores',                                 cuentaBalance: 'Gastos Electorales',         tipo: 'gasto_electoral',   enEstadoResultados: true },
  { itemCSV: 'Aporte Candidato Diputado',                                cuentaBalance: 'Gastos Electorales',         tipo: 'gasto_electoral',   enEstadoResultados: true },

  // ─── GASTOS FINANCIEROS (intereses — van a Egresos No Operacionales) ─
  { itemCSV: 'Gastos por Prestamos corto plazo',                         cuentaBalance: 'Egresos No Operacionales',   tipo: 'gasto_financiero',  enEstadoResultados: true },
  { itemCSV: 'Gastos por Prestamos largo plazo',                         cuentaBalance: 'Egresos No Operacionales',   tipo: 'gasto_financiero',  enEstadoResultados: true },
  { itemCSV: 'Gastos financieros por préstamos de corto plazo',          cuentaBalance: 'Egresos No Operacionales',   tipo: 'gasto_financiero',  enEstadoResultados: true },
  { itemCSV: 'Gastos financieros por préstamos de largo plazo',          cuentaBalance: 'Egresos No Operacionales',   tipo: 'gasto_financiero',  enEstadoResultados: true },

  // ─── MOVIMIENTOS DE CAPITAL — NO SON GASTOS ──────────────────────────
  { itemCSV: 'Créditos corto plazo',                                     cuentaBalance: 'Pasivos Corrientes — Oblig. Inst. Crédito', tipo: 'pasivo', enEstadoResultados: false, nota: 'Es un pasivo (deuda recibida), NO un gasto. Aparece en el balance, no en el estado de resultados.' },
  { itemCSV: 'Creditos corto plazo',                                     cuentaBalance: 'Pasivos Corrientes — Oblig. Inst. Crédito', tipo: 'pasivo', enEstadoResultados: false },
  { itemCSV: 'Créditos largo plazo',                                     cuentaBalance: 'Pasivos No Corrientes — Oblig. Inst. Crédito', tipo: 'pasivo', enEstadoResultados: false },
  { itemCSV: 'Creditos largo plazo',                                     cuentaBalance: 'Pasivos No Corrientes — Oblig. Inst. Crédito', tipo: 'pasivo', enEstadoResultados: false },
  { itemCSV: 'Créditos de corto plazo, inversiones y valores de operaciones de capital', cuentaBalance: 'Pasivos / Activos (mixto)', tipo: 'pasivo', enEstadoResultados: false },
  { itemCSV: 'Créditos de largo plazo, inversiones y valores de operaciones de capital', cuentaBalance: 'Pasivos / Activos (mixto)', tipo: 'pasivo', enEstadoResultados: false },
  { itemCSV: 'Inversiones',                                              cuentaBalance: 'Activos No Corrientes',      tipo: 'activo',           enEstadoResultados: false, nota: 'CRÍTICO: $522M en 2018 sin activo registrado en Módulo 16. Debe tener ficha de inventario.' },
  { itemCSV: 'Activo fijo',                                              cuentaBalance: 'Activos No Corrientes — Muebles y Útiles', tipo: 'activo', enEstadoResultados: false, nota: 'Debe generar ficha en Módulo 16 con depreciación Decreto 1172 SII' },
  { itemCSV: 'Valores de Operación de Capital',                          cuentaBalance: 'Activos No Corrientes',      tipo: 'activo',           enEstadoResultados: false },
  { itemCSV: 'Valores de Operacion de Capital',                          cuentaBalance: 'Activos No Corrientes',      tipo: 'activo',           enEstadoResultados: false },

  // ─── MOVIMIENTOS INTERNOS — NO APARECEN EN NINGÚN ESTADO ─────────────
  { itemCSV: 'Transferencias entre cuentas',                             cuentaBalance: 'NO APLICA — movimiento interno', tipo: 'movimiento_interno', enEstadoResultados: false, nota: 'No es gasto ni ingreso. Movimiento entre cuentas del mismo partido. PERO: $485M en 2025 podrían ser aportes a campaña no declarados.' },
  { itemCSV: 'Reintegros',                                               cuentaBalance: 'Activos Corrientes — Deudores varios', tipo: 'activo', enEstadoResultados: false, nota: 'Devolución de un gasto anterior. Reduce el activo "Efectivo" y aumenta "Deudores".' },
  { itemCSV: 'Cheque en Garantía',                                       cuentaBalance: 'Activos Corrientes — Documentos por cobrar', tipo: 'activo', enEstadoResultados: false, nota: 'Contingencia — no es gasto. Es un activo hasta que se cobre o devuelva.' },
  { itemCSV: 'Cheque Devuelto',                                          cuentaBalance: 'Activos Corrientes — Documentos por cobrar', tipo: 'activo', enEstadoResultados: false },
  { itemCSV: 'Cheque cobrado por caja',                                  cuentaBalance: 'Efectivo y equivalentes',    tipo: 'movimiento_interno', enEstadoResultados: false },
  { itemCSV: 'Anticipo Proveedores',                                     cuentaBalance: 'Activos Corrientes — Deudores varios',     tipo: 'activo', enEstadoResultados: false, nota: 'Es un activo (derecho a recibir bien/servicio). Se regulariza al recibir la factura.' },
  { itemCSV: 'Devolución Transferencia Errónea',                         cuentaBalance: 'Efectivo y equivalentes',    tipo: 'movimiento_interno', enEstadoResultados: false },
  { itemCSV: 'Abono Mutuo por pagar',                                    cuentaBalance: 'Pasivos Corrientes — Cuentas por pagar',   tipo: 'pasivo', enEstadoResultados: false },
]

// ════════════════════════════════════════════════════════════════════════
// PUNTO C — DATOS REALES DEL BALANCE 2022 (extraído del PDF SERVEL)
// Único balance con datos extraíbles digitalmente.
// ════════════════════════════════════════════════════════════════════════

// CuentaBalance y BALANCE_2022 importados desde data/balance.ts
// (fuente canónica compartida con el exportador M15)

// Gastos declarados en CSV SERVEL 2022 (para comparación)
const CSV_2022 = {
  personal:         923_691_838,
  bienes_servicios: 725_696_077,
  otros_admin:      64_437_100,
  genero:           106_596_040,
  juvenil:            0,
  campana:            0,
  prestamos_gastos:   6_972_582,
  prestamos_capital: 348_078_530,
  inversiones:        0,
  transferencias:     0,
  total_csv:       2_168_499_385,
}

// ════════════════════════════════════════════════════════════════════════
// PUNTO D — GENERADOR DE BALANCE BORRADOR
// ════════════════════════════════════════════════════════════════════════

function calcularTotales(cuentas: CuentaBalance[], campo: 'monto2022' | 'monto2021') {
  return cuentas.reduce((s, c) => s + c[campo], 0)
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ModuloBalance() {
  const [year, setYear] = useState<'2022' | '2021'>('2022')
  const campo = year === '2022' ? 'monto2022' : 'monto2021'

  // Totales del balance
  const totalActivosCtes     = calcularTotales(BALANCE_2022.activos.corrientes, campo)
  const totalActivosNC       = calcularTotales(BALANCE_2022.activos.noCorrientes, campo)
  const totalOtrosNC         = calcularTotales(BALANCE_2022.activos.otrosNC, campo)
  const totalActivos         = totalActivosCtes + totalActivosNC + totalOtrosNC

  const totalPasivosCtes     = calcularTotales(BALANCE_2022.pasivos.corrientes, campo)
  const totalPasivosNC       = calcularTotales(BALANCE_2022.pasivos.noCorrientes, campo)
  const totalPasivos         = totalPasivosCtes + totalPasivosNC

  const totalPatrimonio      = calcularTotales(BALANCE_2022.patrimonio, campo)
  const totalPasivoPatrimonio= totalPasivos + totalPatrimonio

  // PUNTO C — Validación ecuación contable
  const ecuacionCuadra       = Math.abs(totalActivos - totalPasivoPatrimonio) < 100 // tolerancia $100
  const diferencia           = totalActivos - totalPasivoPatrimonio

  // Estado de resultados
  const totalIngresos        = calcularTotales(BALANCE_2022.resultados.ingresos, campo)
  const totalGastosElect     = calcularTotales(BALANCE_2022.resultados.gastosElectorales, campo)
  const totalGastosCtes      = calcularTotales(BALANCE_2022.resultados.gastosCorrientes, campo)
  const totalDepreciaciones  = calcularTotales(BALANCE_2022.resultados.depreciaciones, campo)
  const totalNoOp            = calcularTotales(BALANCE_2022.resultados.noOperacionales, campo)
  const totalAjustes         = calcularTotales(BALANCE_2022.resultados.ajustes, campo)
  const resultado            = totalIngresos + totalGastosElect + totalGastosCtes + totalDepreciaciones + totalNoOp + totalAjustes

  // Resultado del patrimonio
  const resultadoPatrimonio  = BALANCE_2022.patrimonio.find(p => p.codigo === '2305')?.[campo] ?? 0
  const resultadoCuadra      = Math.abs(resultado - resultadoPatrimonio) < 100

  // Conciliación M12↔M15 (solo 2022 con datos reales)
  const conciliacion = useMemo(() => {
    if (year !== '2022') return null
    const balanceGastosCtes = Math.abs(BALANCE_2022.resultados.gastosCorrientes[0].monto2022)
    const balanceGastosAdmin = Math.abs(BALANCE_2022.resultados.gastosCorrientes[1].monto2022)
    const balanceGenero = Math.abs(BALANCE_2022.resultados.gastosCorrientes[2].monto2022)
    const balanceElectoral = Math.abs(BALANCE_2022.resultados.gastosElectorales[0].monto2022)
    const balanceTotal = balanceGastosCtes + balanceGastosAdmin + balanceGenero + balanceElectoral

    const csvGastosReales = CSV_2022.personal + CSV_2022.bienes_servicios + CSV_2022.otros_admin +
                            CSV_2022.genero + CSV_2022.campana + CSV_2022.prestamos_gastos
    return {
      csvTotal: CSV_2022.total_csv,
      csvGastosReales,
      csvCapital: CSV_2022.prestamos_capital + CSV_2022.inversiones + CSV_2022.transferencias,
      balanceTotal,
      diferencia: csvGastosReales - balanceTotal,
      discrepanciaGenero: CSV_2022.genero - balanceGenero,
    }
  }, [year])

  // Discrepancias detectadas
  const discrepancias = useMemo(() => {
    const items: { titulo: string; descripcion: string; tipo: 'critica' | 'advertencia' | 'info'; ley: string }[] = []
    if (year === '2022') {
      // Género
      items.push({
        titulo: 'Género: CSV declara $106.6M pero balance muestra solo $19.2M',
        descripcion: `Diferencia de $87.4M. Los $87M restantes probablemente están bajo "Gastos Corrientes" sin documentación de actividad específica (programa + lista + informe). SERVEL puede cuestionar que no son actividades de género reales.`,
        tipo: 'critica',
        ley: 'Art. 38 Ley 20.900 + Dictamen CGR',
      })
      // Créditos como gasto
      items.push({
        titulo: 'CSV incluye $348M en "Créditos" que NO son gastos',
        descripcion: 'Los créditos recibidos son pasivos (deuda), no gastos. Inflaron el total del CSV en $348M respecto al gasto real del Estado de Resultados.',
        tipo: 'advertencia',
        ley: 'DS 1174/2016 SERVEL — Módulo 12 vs Módulo 15',
      })
      // Inversiones 2018 (referencia)
      items.push({
        titulo: '$522M en "Inversiones" 2018 sin activo en Módulo 16',
        descripcion: 'El CSV 2018 declara $522M en inversiones pero el balance no muestra un incremento proporcional en activos no corrientes. Los activos no corrientes (muebles) suben solo $3M entre 2021 y 2022.',
        tipo: 'critica',
        ley: 'DS 1174/2016 SERVEL — Módulo 16 (Activos Fijos)',
      })
    }
    return items
  }, [year])

  // ─── Tabla de balance ──────────────────────────────────────────────
  function FilaCuenta({ c, indent = false }: { c: CuentaBalance; indent?: boolean }) {
    return (
      <tr className="border-b border-slate-50 hover:bg-slate-50/50">
        <td className={`py-2 px-4 text-xs text-slate-400 font-mono ${indent ? 'pl-8' : ''}`}>{c.codigo}</td>
        <td className={`py-2 px-4 text-sm text-slate-700 ${indent ? 'pl-8' : 'font-medium'}`}>{c.nombre}</td>
        <td className={`py-2 px-4 text-right text-sm whitespace-nowrap ${c[campo] < 0 ? 'text-red-600' : 'text-slate-700'}`}>
          {c[campo] < 0 ? `(${fmt(Math.abs(c[campo]))})` : fmt(c[campo])}
        </td>
      </tr>
    )
  }

  function FilaTotal({ label, monto, bold = false }: { label: string; monto: number; bold?: boolean }) {
    return (
      <tr className={`border-t-2 border-slate-200 ${bold ? 'bg-indigo-50' : 'bg-slate-50'}`}>
        <td className="py-2.5 px-4" />
        <td className={`py-2.5 px-4 text-sm ${bold ? 'font-bold text-indigo-800' : 'font-semibold text-slate-700'}`}>{label}</td>
        <td className={`py-2.5 px-4 text-right text-sm whitespace-nowrap ${bold ? 'font-bold text-indigo-800' : 'font-semibold text-slate-800'}`}>
          {monto < 0 ? `(${fmt(Math.abs(monto))})` : fmt(monto)}
        </td>
      </tr>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Balance Clasificado — Módulo 15 SERVEL</h2>
          <p className="text-xs text-slate-500">
            Fuente: Balance Clasificado SERVEL 2022 (aprobado 25/10/2024) · Contador: Raúl Reyes Alonso · Rep. Legal: Lautaro Carmona Soto
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select value={year} onChange={e => setYear(e.target.value as '2022' | '2021')}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm">
            <option value="2022">2022</option>
            <option value="2021">2021</option>
          </select>
        </div>
      </div>

      {/* PUNTO C — Validación ecuación contable */}
      <div className={`flex items-center gap-4 rounded-2xl px-5 py-4 ${ecuacionCuadra ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        {ecuacionCuadra ? <CheckCircle size={24} className="text-green-600 shrink-0" /> : <ShieldAlert size={24} className="text-red-600 shrink-0" />}
        <div className="flex-1">
          <p className={`font-semibold text-sm ${ecuacionCuadra ? 'text-green-800' : 'text-red-800'}`}>
            {ecuacionCuadra ? 'Ecuación contable: CUADRADA ✓' : 'ECUACIÓN CONTABLE NO CUADRA'}
          </p>
          <p className="text-xs mt-0.5 opacity-80">
            ACTIVO ({fmt(totalActivos)}) {ecuacionCuadra ? '=' : '≠'} PASIVO + PATRIMONIO ({fmt(totalPasivoPatrimonio)})
            {!ecuacionCuadra && ` · Diferencia: ${fmt(diferencia)}`}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs shrink-0">
          <div className="text-center px-3">
            <p className="font-bold text-lg text-slate-800">{fmt(totalActivos)}</p>
            <p className="text-slate-500">Activo total</p>
          </div>
          <Equal size={18} className={ecuacionCuadra ? 'text-green-600' : 'text-red-600'} />
          <div className="text-center px-3">
            <p className="font-bold text-lg text-slate-800">{fmt(totalPasivoPatrimonio)}</p>
            <p className="text-slate-500">Pasivo + Patrimonio</p>
          </div>
        </div>
      </div>

      {/* Resultado del ejercicio */}
      <div className={`flex items-center gap-4 rounded-2xl px-5 py-3 ${resultadoCuadra ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200'}`}>
        <Scale size={18} className={resultadoCuadra ? 'text-blue-600' : 'text-red-600'} />
        <div>
          <p className={`font-semibold text-sm ${resultadoCuadra ? 'text-blue-800' : 'text-red-800'}`}>
            Resultado del ejercicio {year}: {fmt(resultado)}
          </p>
          <p className="text-xs opacity-80">
            Estado de Resultados ({fmt(resultado)}) {resultadoCuadra ? '=' : '≠'} Patrimonio ({fmt(resultadoPatrimonio)})
            {resultadoCuadra ? ' · Consistente ✓' : ` · Diferencia: ${fmt(resultado - resultadoPatrimonio)}`}
          </p>
        </div>
      </div>

      {/* PUNTO B — Discrepancias M12 ↔ M15 */}
      {discrepancias.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-500" />
            Discrepancias Módulo 12 (CSV) ↔ Módulo 15 (Balance)
          </h3>
          {discrepancias.map((d, i) => (
            <div key={i} className={`border rounded-xl px-4 py-3 ${
              d.tipo === 'critica' ? 'bg-red-50 border-red-200 text-red-800' :
              d.tipo === 'advertencia' ? 'bg-amber-50 border-amber-200 text-amber-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{d.titulo}</p>
                  <p className="text-xs mt-0.5 opacity-90">{d.descripcion}</p>
                </div>
                <span className="text-xs font-medium whitespace-nowrap shrink-0 opacity-70">{d.ley}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabla conciliación CSV ↔ Balance (solo 2022) */}
      {conciliacion && (
        <div className="bg-white rounded-2xl shadow-sm">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Conciliación Módulo 12 (CSV) → Estado de Resultados (Balance) — 2022</h3>
            <p className="text-xs text-slate-500 mt-0.5">El CSV total es {fmt(conciliacion.csvTotal)} pero el Estado de Resultados muestra {fmt(conciliacion.balanceTotal)} en gastos</p>
          </div>
          <div className="p-5 grid grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500">CSV Módulo 12 — Total declarado</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{fmt(conciliacion.csvTotal)}</p>
              <p className="text-xs text-slate-400 mt-0.5">Incluye gastos + movimientos de capital</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4">
              <p className="text-xs text-amber-600">Movimientos de capital (NO son gastos)</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{fmt(conciliacion.csvCapital)}</p>
              <p className="text-xs text-amber-500 mt-0.5">Créditos recibidos + inversiones + transferencias</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-xs text-blue-600">Balance — Gastos del Estado de Resultados</p>
              <p className="text-2xl font-bold text-blue-800 mt-1">{fmt(conciliacion.balanceTotal)}</p>
              <p className="text-xs text-blue-500 mt-0.5">Gastos reales que afectan el patrimonio</p>
            </div>
          </div>
          <div className="px-5 pb-5">
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-800">
              <p className="font-semibold">Discrepancia Fondo de Género:</p>
              <p className="mt-0.5">
                CSV Módulo 12 declara <strong>{fmt(CSV_2022.genero)}</strong> en género,
                pero el balance solo clasifica <strong>{fmt(19_176_625)}</strong> como "Gastos Part. Femenina".
                Diferencia de <strong>{fmt(conciliacion.discrepanciaGenero)}</strong> que probablemente está dentro de "Gastos Corrientes"
                sin el respaldo documental requerido (programa + lista + informe — Dictamen CGR).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PUNTO D — Balance Clasificado completo */}
      <div className="grid grid-cols-2 gap-6">
        {/* ACTIVOS */}
        <div className="bg-white rounded-2xl shadow-sm">
          <div className="p-4 border-b border-slate-100 bg-indigo-50 rounded-t-2xl">
            <h3 className="text-sm font-bold text-indigo-800">ACTIVO</h3>
          </div>
          <table className="w-full text-sm">
            <tbody>
              <tr><td colSpan={3} className="py-2 px-4 text-xs font-bold text-slate-500 uppercase bg-slate-50">Activos Corrientes</td></tr>
              {BALANCE_2022.activos.corrientes.map((c, i) => <FilaCuenta key={i} c={c} indent />)}
              <FilaTotal label="Total Activos Corrientes" monto={totalActivosCtes} />
              <tr><td colSpan={3} className="py-2 px-4 text-xs font-bold text-slate-500 uppercase bg-slate-50">Activos No Corrientes</td></tr>
              {BALANCE_2022.activos.noCorrientes.map((c, i) => <FilaCuenta key={i} c={c} indent />)}
              <FilaTotal label="Total Activos No Corrientes" monto={totalActivosNC} />
              <tr><td colSpan={3} className="py-2 px-4 text-xs font-bold text-slate-500 uppercase bg-slate-50">Otros Activos No Corrientes</td></tr>
              {BALANCE_2022.activos.otrosNC.map((c, i) => <FilaCuenta key={i} c={c} indent />)}
              <FilaTotal label="Total Otros NC" monto={totalOtrosNC} />
              <FilaTotal label="ACTIVO TOTAL" monto={totalActivos} bold />
            </tbody>
          </table>
        </div>

        {/* PASIVOS + PATRIMONIO */}
        <div className="bg-white rounded-2xl shadow-sm">
          <div className="p-4 border-b border-slate-100 bg-indigo-50 rounded-t-2xl">
            <h3 className="text-sm font-bold text-indigo-800">PASIVO Y PATRIMONIO</h3>
          </div>
          <table className="w-full text-sm">
            <tbody>
              <tr><td colSpan={3} className="py-2 px-4 text-xs font-bold text-slate-500 uppercase bg-slate-50">Pasivos Corrientes</td></tr>
              {BALANCE_2022.pasivos.corrientes.map((c, i) => <FilaCuenta key={i} c={c} indent />)}
              <FilaTotal label="Total Pasivos Corrientes" monto={totalPasivosCtes} />
              <tr><td colSpan={3} className="py-2 px-4 text-xs font-bold text-slate-500 uppercase bg-slate-50">Pasivos No Corrientes</td></tr>
              {BALANCE_2022.pasivos.noCorrientes.map((c, i) => <FilaCuenta key={i} c={c} indent />)}
              <FilaTotal label="Total Pasivos No Corrientes" monto={totalPasivosNC} />
              <tr><td colSpan={3} className="py-2 px-4 text-xs font-bold text-slate-500 uppercase bg-slate-50">Patrimonio</td></tr>
              {BALANCE_2022.patrimonio.map((c, i) => <FilaCuenta key={i} c={c} indent />)}
              <FilaTotal label="Total Patrimonio" monto={totalPatrimonio} />
              <FilaTotal label="PASIVO + PATRIMONIO" monto={totalPasivoPatrimonio} bold />
            </tbody>
          </table>
        </div>
      </div>

      {/* Estado de Resultados */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-4 border-b border-slate-100 bg-indigo-50 rounded-t-2xl">
          <h3 className="text-sm font-bold text-indigo-800">ESTADO DE RESULTADOS — {year}</h3>
        </div>
        <table className="w-full text-sm">
          <tbody>
            <tr><td colSpan={3} className="py-2 px-4 text-xs font-bold text-slate-500 uppercase bg-slate-50">Ingresos por Aportes</td></tr>
            {BALANCE_2022.resultados.ingresos.map((c, i) => <FilaCuenta key={i} c={c} indent />)}
            <FilaTotal label="Total Ingresos" monto={totalIngresos} />

            <tr><td colSpan={3} className="py-2 px-4 text-xs font-bold text-slate-500 uppercase bg-slate-50">Gastos Electorales</td></tr>
            {BALANCE_2022.resultados.gastosElectorales.map((c, i) => <FilaCuenta key={i} c={c} indent />)}

            <tr><td colSpan={3} className="py-2 px-4 text-xs font-bold text-slate-500 uppercase bg-slate-50">Gastos Corrientes</td></tr>
            {BALANCE_2022.resultados.gastosCorrientes.map((c, i) => <FilaCuenta key={i} c={c} indent />)}

            <tr><td colSpan={3} className="py-2 px-4 text-xs font-bold text-slate-500 uppercase bg-slate-50">Depreciaciones</td></tr>
            {BALANCE_2022.resultados.depreciaciones.map((c, i) => <FilaCuenta key={i} c={c} indent />)}

            <tr><td colSpan={3} className="py-2 px-4 text-xs font-bold text-slate-500 uppercase bg-slate-50">Ingresos / Egresos No Operacionales</td></tr>
            {BALANCE_2022.resultados.noOperacionales.map((c, i) => <FilaCuenta key={i} c={c} indent />)}

            <tr><td colSpan={3} className="py-2 px-4 text-xs font-bold text-slate-500 uppercase bg-slate-50">Ajustes</td></tr>
            {BALANCE_2022.resultados.ajustes.map((c, i) => <FilaCuenta key={i} c={c} indent />)}

            <FilaTotal label="RESULTADO DEL EJERCICIO" monto={resultado} bold />
          </tbody>
        </table>
        <div className="px-5 py-3 bg-slate-50 rounded-b-2xl text-xs text-slate-500 flex items-center justify-between">
          <span>Contador General: Raúl Reyes Alonso · Representante Legal: Lautaro Carmona Soto (RUT 5.892.999-9)</span>
          <span>Aprobado: 25/10/2024</span>
        </div>
      </div>

      {/* Tabla de mapeo M12 ↔ M15 */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <ArrowRight size={15} className="text-indigo-500" />
            Mapeo: Ítems CSV SERVEL → Cuentas del Balance
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {MAPEO_SERVEL_BALANCE.length} ítems mapeados ·
            {MAPEO_SERVEL_BALANCE.filter(m => m.enEstadoResultados).length} son gastos reales ·
            {MAPEO_SERVEL_BALANCE.filter(m => !m.enEstadoResultados).length} son movimientos de capital/balance
          </p>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white">
              <tr className="text-slate-500 border-b border-slate-100">
                {['Ítem CSV (Módulo 12)', 'Cuenta Balance (Módulo 15)', 'Tipo', '¿Gasto?', 'Nota'].map(h => (
                  <th key={h} className="text-left py-2.5 px-3 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MAPEO_SERVEL_BALANCE.map((m, i) => (
                <tr key={i} className={`border-b border-slate-50 ${!m.enEstadoResultados ? 'bg-amber-50/40' : ''}`}>
                  <td className="py-2 px-3 text-slate-700 font-medium">{m.itemCSV}</td>
                  <td className="py-2 px-3 text-indigo-600">{m.cuentaBalance}</td>
                  <td className="py-2 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                      m.tipo === 'gasto_corriente' ? 'bg-blue-100 text-blue-700' :
                      m.tipo === 'gasto_electoral' ? 'bg-orange-100 text-orange-700' :
                      m.tipo === 'gasto_genero'   ? 'bg-purple-100 text-purple-700' :
                      m.tipo === 'gasto_financiero'? 'bg-slate-100 text-slate-600' :
                      m.tipo === 'activo'          ? 'bg-green-100 text-green-700' :
                      m.tipo === 'pasivo'          ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>{m.tipo.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="py-2 px-3">
                    {m.enEstadoResultados
                      ? <span className="text-green-600 font-semibold">Sí</span>
                      : <span className="text-red-600 font-semibold">No</span>}
                  </td>
                  <td className="py-2 px-3 text-slate-500 max-w-64 truncate" title={m.nota}>{m.nota ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 bg-indigo-50 rounded-b-2xl text-xs text-indigo-700">
          <strong>Importante:</strong> Los ítems marcados en amarillo (No es gasto) aparecen en el CSV Módulo 12 pero
          NO van al Estado de Resultados del balance. Son movimientos de capital (créditos), activos (inversiones) o
          transferencias internas. El balance los clasifica en Activos o Pasivos, no en gastos.
        </div>
      </div>

      {/* 7 cruces que SERVEL verifica */}
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <FileText size={15} className="text-indigo-500" />
          Los 7 Cruces que SERVEL Verifica al Revisar el Balance
        </h3>
        {[
          { id: 1, origen: 'Módulo 6 (Ingresos)', destino: 'Balance pág. 3 (EERR)', regla: 'Aporte estatal M6 = "Ingresos por Aportes" del EERR', estado: year === '2022', ley: 'Art. 33 Ley 20.900' },
          { id: 2, origen: 'Módulo 12 (Gastos)', destino: 'Balance pág. 3 (EERR)', regla: 'Gastos M12 = Gastos del EERR (con reclasificación contable)', estado: false, ley: 'DS 1174/2016' },
          { id: 3, origen: 'Módulo 17 (Préstamos)', destino: 'Balance pág. 2 (Pasivos)', regla: 'Deuda vigente M17 = Pasivos por créditos', estado: year === '2022', ley: 'Art. 39 letra f) DFL N°4/2017' },
          { id: 4, origen: 'Módulo 16 (Activos)', destino: 'Balance pág. 1 (Activos)', regla: 'Inventario M16 = Activos no corrientes', estado: false, ley: 'DS 1174/2016' },
          { id: 5, origen: 'Balance pág. 1', destino: 'Cartola bancaria 31-dic', regla: '"Efectivo y equivalentes" = Saldo real en banco', estado: false, ley: 'DS 1174/2016' },
          { id: 6, origen: 'Módulo 14 × 12 meses', destino: 'Módulo 12 Personal', regla: 'Sueldos anuales nómina ≈ Gastos Personal M12', estado: false, ley: 'DS 1174/2016 M14' },
          { id: 7, origen: 'Balance año N', destino: 'Balance año N-1', regla: 'Patrimonio inicial + Resultado = Patrimonio final', estado: ecuacionCuadra, ley: 'PCGA' },
        ].map(c => (
          <div key={c.id} className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${
            c.estado ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold bg-indigo-100 text-indigo-700">
              {c.id}
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-slate-700">
                <span className="text-indigo-600">{c.origen}</span>
                <ArrowRight size={12} className="inline mx-1 text-slate-400" />
                <span className="text-indigo-600">{c.destino}</span>
              </p>
              <p className="text-xs text-slate-500">{c.regla}</p>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <span className="text-xs text-slate-400">{c.ley}</span>
              {c.estado
                ? <CheckCircle size={16} className="text-green-500" />
                : <AlertTriangle size={16} className="text-slate-300" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
