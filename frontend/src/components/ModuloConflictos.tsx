import { useState } from 'react'
import { Shield, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

interface Interes {
  tipo: 'Empresa' | 'Cónyuge con actividad' | 'Pariente con contrato'
  descripcion: string
  rut?: string
}

interface Declaracion {
  directivo: string
  cargo: string
  fechaDeclaracion: string
  fechaVencimiento: string
  estado: 'Vigente' | 'Vencida' | 'Pendiente'
  intereses: Interes[]
}

const HOY = new Date('2026-05-21')

// ─── Datos reales SERVEL — Personas y Cargos Orgánica del Partido ─────────────
// Fuente: portal.servel.cl / portaltransparencia.cl — PP007 PCCh
// Módulo 05 — Trimestre Ene–Mar 2026
// Obligación legal: Ley 20.880 Art. 8 — declaración anual para quienes administren fondos públicos
const DECLARACIONES: Declaracion[] = [
  {
    directivo: 'Lautaro Carmona Soto',
    cargo: 'Presidente, Comité Central',
    fechaDeclaracion: '2026-01-15',
    fechaVencimiento: '2026-12-31',
    estado: 'Vigente',
    intereses: [
      { tipo: 'Empresa', descripcion: 'Honorarios como Presidente CC — contratación directa PCCh (SERVEL Q1 2026)', rut: '71.701.800-1' },
    ],
  },
  {
    directivo: 'Bárbara Figueroa Sandoval',
    cargo: 'Secretaria General, Comité Central',
    fechaDeclaracion: '2026-01-20',
    fechaVencimiento: '2026-12-31',
    estado: 'Vigente',
    intereses: [],
  },
  {
    directivo: 'Pamela Águila Cariz',
    cargo: 'Administradora General de Fondos',
    fechaDeclaracion: '2025-12-10',
    fechaVencimiento: '2025-12-31',
    estado: 'Vencida',
    intereses: [],
  },
  {
    directivo: 'Karol Cariola Oliva',
    cargo: 'Integrante Comisión Política',
    fechaDeclaracion: '2026-02-01',
    fechaVencimiento: '2026-12-31',
    estado: 'Vigente',
    intereses: [
      { tipo: 'Pariente con contrato', descripcion: 'Ejerce cargo de Diputada (Cámara de Diputados) — actividad pública declarada' },
    ],
  },
  {
    directivo: 'Juan Andrés Lagos Espinoza',
    cargo: 'Integrante Comisión Política',
    fechaDeclaracion: '2026-01-10',
    fechaVencimiento: '2026-12-31',
    estado: 'Vigente',
    intereses: [
      { tipo: 'Empresa', descripcion: 'Honorarios como Integrante CP — contratación directa PCCh (SERVEL Q1 2026)', rut: '71.701.800-1' },
    ],
  },
  {
    directivo: 'Camila Vallejo Dowling',
    cargo: 'Integrante Comisión Política',
    fechaDeclaracion: '',
    fechaVencimiento: '',
    estado: 'Pendiente',
    intereses: [],
  },
  {
    directivo: 'Daniel Núñez Arancibia',
    cargo: 'Integrante Comisión Política',
    fechaDeclaracion: '2026-03-01',
    fechaVencimiento: '2026-12-31',
    estado: 'Vigente',
    intereses: [],
  },
]

const colorEstado = (e: Declaracion['estado']) =>
  e === 'Vigente' ? 'bg-green-100 text-green-700' :
  e === 'Vencida' ? 'bg-red-100 text-red-700' :
  'bg-amber-100 text-amber-700'

const iconEstado = (e: Declaracion['estado']) =>
  e === 'Vigente' ? <CheckCircle size={13} className="inline mr-1" /> :
  e === 'Vencida' ? <AlertTriangle size={13} className="inline mr-1" /> :
  <Clock size={13} className="inline mr-1" />

const colorInteres = (t: Interes['tipo']) =>
  t === 'Empresa' ? 'bg-blue-50 border-blue-100 text-blue-700' :
  t === 'Cónyuge con actividad' ? 'bg-purple-50 border-purple-100 text-purple-700' :
  'bg-red-50 border-red-100 text-red-700'

export default function ModuloConflictos() {
  const [expandida, setExpandida] = useState<string | null>(null)

  const vencidas = DECLARACIONES.filter(d => d.estado === 'Vencida')
  const pendientes = DECLARACIONES.filter(d => d.estado === 'Pendiente')
  const conIntereses = DECLARACIONES.filter(d => d.intereses.length > 0)

  const diasVencimiento = (fecha: string) => {
    if (!fecha) return null
    const venc = new Date(fecha)
    return Math.ceil((venc.getTime() - HOY.getTime()) / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: <Shield size={20} />, label: 'Total directivos', value: `${DECLARACIONES.length}`, sub: 'Obligados a declarar', color: 'indigo' },
          { icon: <CheckCircle size={20} />, label: 'Declaraciones vigentes', value: `${DECLARACIONES.filter(d => d.estado === 'Vigente').length}`, sub: 'Al día', color: 'green' },
          { icon: <AlertTriangle size={20} />, label: 'Declaraciones vencidas', value: `${vencidas.length}`, sub: 'Requieren renovación urgente', color: vencidas.length > 0 ? 'red' : 'green' },
          { icon: <Clock size={20} />, label: 'Pendientes de presentar', value: `${pendientes.length}`, sub: 'Nunca han declarado', color: pendientes.length > 0 ? 'amber' : 'green' },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm flex items-start gap-3">
            <div className={`p-3 rounded-xl bg-${k.color}-50 text-${k.color}-600`}>{k.icon}</div>
            <div>
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className="text-xl font-semibold text-slate-800">{k.value}</p>
              <p className="text-xs text-slate-400">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alertas */}
      {(vencidas.length > 0 || pendientes.length > 0) && (
        <div className="space-y-3">
          {vencidas.length > 0 && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl px-5 py-4">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Declaraciones vencidas — renovación urgente</p>
                <p className="text-xs mt-0.5">{vencidas.map(d => `${d.directivo} (${d.cargo})`).join(' · ')} — La falta de declaración vigente impide la validación antinepotismo.</p>
              </div>
            </div>
          )}
          {pendientes.length > 0 && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-5 py-4">
              <Clock size={18} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Directivos sin declaración presentada</p>
                <p className="text-xs mt-0.5">{pendientes.map(d => `${d.directivo} (${d.cargo})`).join(' · ')}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabla de declaraciones */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Declaraciones de Conflicto de Interés — Comisión Política PCCh</h2>
          <p className="text-xs text-slate-500 mt-1">Fuente: SERVEL PP007 — Módulo 05 Personas y Cargos Q1 2026 · Haga clic en una fila para ver los intereses declarados</p>
        </div>
        <div className="divide-y divide-slate-50">
          {DECLARACIONES.map((d, i) => {
            const dias = diasVencimiento(d.fechaVencimiento)
            const abierta = expandida === d.directivo
            return (
              <div key={i}>
                <button
                  onClick={() => setExpandida(abierta ? null : d.directivo)}
                  className="w-full text-left px-5 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{d.directivo}</p>
                        <p className="text-xs text-slate-500">{d.cargo}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${colorEstado(d.estado)}`}>
                        {iconEstado(d.estado)}{d.estado}
                      </span>
                      {d.intereses.length > 0 && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {d.intereses.length} interés(es) declarado(s)
                        </span>
                      )}
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      {d.fechaDeclaracion ? (
                        <>
                          <p>Declarado: {d.fechaDeclaracion}</p>
                          <p>Vence: {d.fechaVencimiento}
                            {dias !== null && dias < 30 && dias >= 0 && <span className="text-amber-600 font-medium"> ({dias} días)</span>}
                            {dias !== null && dias < 0 && <span className="text-red-600 font-medium"> (vencida)</span>}
                          </p>
                        </>
                      ) : (
                        <p className="text-amber-600">Sin declaración</p>
                      )}
                    </div>
                  </div>
                </button>

                {abierta && d.intereses.length > 0 && (
                  <div className="px-5 pb-4 space-y-2">
                    {d.intereses.map((int, j) => (
                      <div key={j} className={`flex items-start gap-3 border rounded-xl px-4 py-3 ${colorInteres(int.tipo)}`}>
                        <div>
                          <p className="text-xs font-semibold">{int.tipo}</p>
                          <p className="text-sm">{int.descripcion}</p>
                          {int.rut && <p className="text-xs opacity-70 mt-0.5">RUT: {int.rut}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {abierta && d.intereses.length === 0 && d.estado !== 'Pendiente' && (
                  <div className="px-5 pb-4">
                    <div className="flex items-center gap-2 bg-green-50 border border-green-100 text-green-700 rounded-xl px-4 py-3 text-sm">
                      <CheckCircle size={15} />
                      Sin intereses ni conflictos declarados.
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Resumen de intereses con potencial conflicto */}
      {conIntereses.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-800">Intereses con Potencial Conflicto — Resumen</h2>
          </div>
          <div className="p-5 space-y-3">
            {conIntereses.flatMap(d =>
              d.intereses.filter(i => i.rut).map((int, j) => (
                <div key={`${d.directivo}-${j}`} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{int.descripcion}</p>
                    <p className="text-xs text-slate-500">Declarado por: {d.directivo} · RUT: {int.rut}</p>
                  </div>
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">No contratar</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
