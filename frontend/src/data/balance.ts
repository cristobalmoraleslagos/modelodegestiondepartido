/**
 * balance.ts — Fuente canónica del Balance Clasificado (Módulo 15 SERVEL).
 * Importar desde aquí en ModuloBalance y en el exportador SERVEL (M15).
 *
 * FUENTE: Balance Clasificado SERVEL 2022 (extraído del PDF oficial del portal).
 * Único balance con datos digitalizables — 2021 incluido como comparativo.
 * Los años 2023-2025 NO tienen balance aprobado/publicado (rendiciones pendientes).
 */

export interface CuentaBalance {
  codigo:    string
  nombre:    string
  monto2022: number
  monto2021: number
}

export const BALANCE_2022 = {
  activos: {
    corrientes: [
      { codigo: '1101', nombre: 'Efectivo y equivalentes',         monto2022: 197_017_756,     monto2021: 55_601_590 },
      { codigo: '1102', nombre: 'Deudores por venta y otras ctas', monto2022: 1_892_232,       monto2021: 0 },
      { codigo: '1103', nombre: 'Documentos por cobrar',           monto2022: 81_380_100,      monto2021: 431_959_285 },
      { codigo: '1104', nombre: 'Deudores varios',                 monto2022: 11_532_020,      monto2021: 6_961_315 },
      { codigo: '1105', nombre: 'Impuestos por recuperar',         monto2022: 0,               monto2021: 0 },
      { codigo: '1106', nombre: 'Otros activos corrientes',        monto2022: 0,               monto2021: 1_640_000 },
    ],
    noCorrientes: [
      { codigo: '1201', nombre: 'Bienes raíces',                   monto2022: 1_994_234_325,   monto2021: 1_994_234_325 },
      { codigo: '1202', nombre: 'Muebles y útiles',                monto2022: 194_348_767,     monto2021: 191_346_125 },
      { codigo: '1205', nombre: 'Depreciación acumulada',          monto2022: -320_586_917,    monto2021: -291_928_024 },
    ],
    otrosNC: [
      { codigo: '1303', nombre: 'Intereses diferidos no corrientes',monto2022: 80_000,         monto2021: 7_610_870 },
      { codigo: '1304', nombre: 'Otros activos no corrientes',      monto2022: 4_345_776_931,  monto2021: 3_865_460_391 },
    ],
  },
  pasivos: {
    corrientes: [
      { codigo: '2101', nombre: 'Oblig. con inst. de créditos',    monto2022: 46_048_982,      monto2021: 130_102_977 },
      { codigo: '2102', nombre: 'Acreedores comerciales',          monto2022: 70_591_656,      monto2021: 124_678_841 },
      { codigo: '2103', nombre: 'Documentos por pagar',            monto2022: 0,               monto2021: 0 },
      { codigo: '2104', nombre: 'Otros acreedores',                monto2022: 1_420_000,       monto2021: 9_239_990 },
      { codigo: '2105', nombre: 'Provisiones',                     monto2022: 67_477_947,      monto2021: 22_686_555 },
      { codigo: '2106', nombre: 'Retenciones',                     monto2022: 18_532_670,      monto2021: 42_485_010 },
      { codigo: '2107', nombre: 'Cuentas por pagar',               monto2022: 52_593_050,      monto2021: 61_918_609 },
    ],
    noCorrientes: [
      { codigo: '2201', nombre: 'Oblig. con inst. de créditos LP',  monto2022: 67_573_922,     monto2021: 116_433_340 },
    ],
  },
  patrimonio: [
    { codigo: '2301', nombre: 'Capital neto',                       monto2022: 1_542_831_053,  monto2021: 1_542_831_053 },
    { codigo: '2302', nombre: 'Revalorización capital propio',      monto2022: 129_516_838,    monto2021: 129_516_838 },
    { codigo: '2303', nombre: 'Excedentes ejercicio anterior',      monto2022: 1_569_125_165,  monto2021: 1_310_574_614 },
    { codigo: '2304', nombre: 'Excedentes acumulados',              monto2022: 2_131_972_706,  monto2021: 2_612_248_254 },
    { codigo: '2305', nombre: 'Resultado del ejercicio',            monto2022: 807_991_225,    monto2021: 160_169_796 },
  ],
  resultados: {
    ingresos: [
      { codigo: '4101', nombre: 'Ingresos por aportes',             monto2022: 1_240_127_041,  monto2021: 1_370_047_598 },
      { codigo: '4104', nombre: 'Otros ingresos',                   monto2022: 35_000_000,     monto2021: 0 },
    ],
    gastosElectorales: [
      { codigo: '4201', nombre: 'Gastos electorales',               monto2022: -289_133_622,   monto2021: 0 },
    ],
    gastosCorrientes: [
      { codigo: '4301', nombre: 'Gastos corrientes',                monto2022: -480_438_294,   monto2021: -236_547_765 },
      { codigo: '4302', nombre: 'Gastos de administración',         monto2022: -250_498_353,   monto2021: -1_234_440_125 },
      { codigo: '4303', nombre: 'Gastos participación femenina',    monto2022: -19_176_625,    monto2021: 0 },
    ],
    depreciaciones: [
      { codigo: '4401', nombre: 'Depreciaciones',                   monto2022: -34_162_444,    monto2021: -29_729_166 },
    ],
    noOperacionales: [
      { codigo: '5101', nombre: 'Ingresos no operacionales',        monto2022: 94_219_093,     monto2021: 86_292_867 },
      { codigo: '5201', nombre: 'Egresos no operacionales (actividad)', monto2022: 0,          monto2021: -14_771_604 },
      { codigo: '5202', nombre: 'Egresos no operacionales',         monto2022: -16_487_623,    monto2021: -7_702_635 },
    ],
    ajustes: [
      { codigo: '5301', nombre: 'Ajuste por unidades reajustables (UF)', monto2022: 528_542_052, monto2021: 227_020_626 },
    ],
  },
}

/**
 * Aplana el balance jerárquico en filas para exportación M15.
 * Cada fila: { seccion, codigo, nombre, monto } para el año solicitado.
 * Solo hay datos para 2021 y 2022.
 */
export interface FilaBalance {
  seccion: string
  codigo:  string
  nombre:  string
  monto:   number
}

export function aplanarBalance(anio: 2021 | 2022): FilaBalance[] {
  const campo = anio === 2022 ? 'monto2022' : 'monto2021'
  const filas: FilaBalance[] = []
  const push = (seccion: string, cuentas: CuentaBalance[]) =>
    cuentas.forEach(c => filas.push({ seccion, codigo: c.codigo, nombre: c.nombre, monto: c[campo] }))

  push('Activo Corriente',        BALANCE_2022.activos.corrientes)
  push('Activo No Corriente',     BALANCE_2022.activos.noCorrientes)
  push('Otros Activos No Ctes.',  BALANCE_2022.activos.otrosNC)
  push('Pasivo Corriente',        BALANCE_2022.pasivos.corrientes)
  push('Pasivo No Corriente',     BALANCE_2022.pasivos.noCorrientes)
  push('Patrimonio',              BALANCE_2022.patrimonio)
  push('Resultado — Ingresos',            BALANCE_2022.resultados.ingresos)
  push('Resultado — Gastos Electorales',  BALANCE_2022.resultados.gastosElectorales)
  push('Resultado — Gastos Corrientes',   BALANCE_2022.resultados.gastosCorrientes)
  push('Resultado — Depreciaciones',      BALANCE_2022.resultados.depreciaciones)
  push('Resultado — No Operacionales',    BALANCE_2022.resultados.noOperacionales)
  push('Resultado — Ajustes',             BALANCE_2022.resultados.ajustes)

  return filas
}
