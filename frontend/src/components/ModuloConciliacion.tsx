import { AlertTriangle, CheckCircle, Building2 } from 'lucide-react'
import { fmt } from '../utils'

interface Cuenta {
  nombre: string
  tipo: string
  banco: string
  saldoSistema: number
  saldoBanco: number
  estado: 'Cuadrada' | 'Con diferencia'
}

interface Partida {
  cuenta: string
  descripcion: string
  monto: number
  fechaOrigen: string
  diasPendiente: number
  tipo: 'Depósito en tránsito' | 'Cheque no cobrado' | 'Error contable'
}

const CUENTAS: Cuenta[] = [
  { nombre: 'Cuenta Corriente Operacional', tipo: 'Corriente', banco: 'Banco Estado', saldoSistema: 28_450_300, saldoBanco: 28_593_300, estado: 'Con diferencia' },
  { nombre: 'Cuenta Corriente Campaña', tipo: 'Corriente', banco: 'Banco de Chile', saldoSistema: 4_210_000, saldoBanco: 4_210_000, estado: 'Cuadrada' },
  { nombre: 'Cuenta Vista Fondo Género', tipo: 'Vista', banco: 'BancoEstado', saldoSistema: 2_180_500, saldoBanco: 2_037_500, estado: 'Con diferencia' },
]

const PARTIDAS: Partida[] = [
  { cuenta: 'Cuenta Corriente Operacional', descripcion: 'Cotización militante no acreditada aún', monto: 85_000, fechaOrigen: '2026-05-18', diasPendiente: 3, tipo: 'Depósito en tránsito' },
  { cuenta: 'Cuenta Corriente Operacional', descripcion: 'Transferencia aporte estatal Q2', monto: 55_500_000, fechaOrigen: '2026-04-30', diasPendiente: 21, tipo: 'Depósito en tránsito' },
  { cuenta: 'Cuenta Corriente Operacional', descripcion: 'Cheque proveedor impresión emitido no cobrado', monto: -342_000, fechaOrigen: '2026-04-15', diasPendiente: 36, tipo: 'Cheque no cobrado' },
  { cuenta: 'Cuenta Vista Fondo Género', descripcion: 'Cargo bancario comisión mantenimiento', monto: -12_500, fechaOrigen: '2026-05-01', diasPendiente: 20, tipo: 'Error contable' },
  { cuenta: 'Cuenta Vista Fondo Género', descripcion: 'Intereses devengados no registrados', monto: -130_500, fechaOrigen: '2026-04-30', diasPendiente: 21, tipo: 'Error contable' },
]

const colorEstado = (e: Cuenta['estado']) =>
  e === 'Cuadrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'

const colorPartida = (d: number) =>
  d > 60 ? 'text-red-600 font-semibold' : d > 30 ? 'text-amber-600' : 'text-slate-500'

const colorTipo = (t: Partida['tipo']) =>
  t === 'Error contable' ? 'bg-red-100 text-red-700' :
  t === 'Cheque no cobrado' ? 'bg-amber-100 text-amber-700' :
  'bg-blue-100 text-blue-700'

export default function ModuloConciliacion() {
  const cuentasConDif = CUENTAS.filter(c => c.estado === 'Con diferencia').length
  const partidasVencidas = PARTIDAS.filter(p => p.diasPendiente > 60).length

  return (
    <div className="space-y-6">
      {/* Alertas generales */}
      {cuentasConDif > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-5 py-4">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">{cuentasConDif} cuenta(s) con diferencias pendientes</p>
            <p className="text-xs mt-0.5">Resolver antes del cierre del trimestre (30 de junio). SERVEL puede solicitar el estado de conciliación en la auditoría anual.</p>
          </div>
        </div>
      )}

      {/* Estado por cuenta */}
      <div className="grid grid-cols-3 gap-4">
        {CUENTAS.map((c, i) => {
          const dif = c.saldoBanco - c.saldoSistema
          return (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-slate-500">{c.banco}</p>
                  <p className="text-sm font-semibold text-slate-800">{c.nombre}</p>
                </div>
                <Building2 size={18} className="text-indigo-400 shrink-0 mt-0.5" />
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Saldo sistema</span>
                  <span className="font-medium">{fmt(c.saldoSistema)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Saldo banco</span>
                  <span className="font-medium">{fmt(c.saldoBanco)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-1">
                  <span className="text-slate-500">Diferencia</span>
                  <span className={`font-bold ${dif !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {dif >= 0 ? '+' : ''}{fmt(dif)}
                  </span>
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${colorEstado(c.estado)}`}>
                {c.estado === 'Cuadrada' ? <><CheckCircle size={11} className="inline mr-1" />Cuadrada</> : <><AlertTriangle size={11} className="inline mr-1" />Con diferencia</>}
              </span>
            </div>
          )
        })}
      </div>

      {/* Partidas conciliatorias */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Partidas Conciliatorias Pendientes</h2>
          {partidasVencidas > 0 && (
            <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full">
              {partidasVencidas} con más de 60 días
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100">
                {['Cuenta', 'Descripción', 'Tipo', 'Monto', 'Fecha origen', 'Días pendiente'].map(h => (
                  <th key={h} className="text-left py-3 px-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PARTIDAS.map((p, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">{p.cuenta}</td>
                  <td className="py-3 px-4 text-slate-700">{p.descripcion}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${colorTipo(p.tipo)}`}>{p.tipo}</span>
                  </td>
                  <td className={`py-3 px-4 font-medium whitespace-nowrap ${p.monto < 0 ? 'text-red-600' : 'text-green-700'}`}>
                    {p.monto >= 0 ? '+' : ''}{fmt(p.monto)}
                  </td>
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{p.fechaOrigen}</td>
                  <td className={`py-3 px-4 whitespace-nowrap ${colorPartida(p.diasPendiente)}`}>
                    {p.diasPendiente} días
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
