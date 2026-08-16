import { useState, type FormEvent } from 'react'
import { Lock, User, AlertCircle, Eye, EyeOff, ShieldCheck, KeyRound } from 'lucide-react'
import { login, cambiarPassword } from '../auth'

interface Props { onLogin: () => void }

export default function LoginPage({ onLogin }: Props) {
  const [usuario, setUsuario] = useState('')
  const [clave, setClave]     = useState('')
  const [verClave, setVerClave] = useState(false)
  const [error, setError]     = useState('')
  const [cargando, setCargando] = useState(false)

  // Cambio forzado de contraseña en el primer ingreso
  const [forzarCambio, setForzarCambio] = useState(false)
  const [nuevaClave, setNuevaClave]     = useState('')
  const [confirmaClave, setConfirmaClave] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (cargando) return
    setError('')
    setCargando(true)
    try {
      const ses = await login(usuario, clave)
      if (ses.debeCambiarPassword) {
        setForzarCambio(true)
        setCargando(false)
        return
      }
      onLogin()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.')
      setCargando(false)
    }
  }

  async function handleCambio(e: FormEvent) {
    e.preventDefault()
    if (cargando) return
    setError('')
    if (nuevaClave.length < 8) { setError('La nueva contraseña debe tener al menos 8 caracteres.'); return }
    if (nuevaClave !== confirmaClave) { setError('Las contraseñas no coinciden.'); return }
    if (nuevaClave === clave) { setError('La nueva contraseña debe ser distinta de la temporal.'); return }
    setCargando(true)
    try {
      await cambiarPassword(clave, nuevaClave)
      onLogin()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.')
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex">
      {/* ── Hero institucional (desktop) — imagen + qué hace el sistema ── */}
      <div className="hidden lg:flex flex-col justify-center gap-8 w-[46%] p-14 relative overflow-hidden bg-gradient-to-br from-amaranto-900/50 via-slate-900 to-slate-950 border-r border-slate-800">
        {/* Para una foto real: reemplazar los blur decorativos por un <img> o bg-image institucional */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amaranto-600/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -left-20 w-80 h-80 bg-indigo-800/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-amaranto-600 rounded-2xl shadow-lg mb-6">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white leading-tight">Portal del<br />funcionario/a</h2>
          <p className="text-slate-400 mt-3 max-w-sm">Recursos Humanos e intranet del Partido Comunista de Chile, en un solo lugar.</p>
        </div>
        <div className="relative z-10">
          <p className="text-xs font-semibold text-amaranto-300 uppercase tracking-widest mb-3">Qué puedes hacer</p>
          <ul className="space-y-2.5">
            {[
              'Consultar la ficha de personas',
              'Registrar tu asistencia (ingreso/salida)',
              'Cargar boletas de honorarios (BHE)',
              'Solicitar vacaciones y permisos',
              'Ver calendario, cumpleaños y comunicados',
              'Generar y revisar informes internos',
            ].map(t => (
              <li key={t} className="flex items-start gap-2.5 text-sm text-slate-300">
                <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-amaranto-600 flex items-center justify-center text-white text-[10px] leading-none">✓</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative z-10 text-xs text-slate-600">PCCh · RUT 71.701.800-1 · SERVEL PP007</p>
      </div>

      {/* ── Columna de acceso ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-900/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-slate-800/40 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm z-10">
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amaranto-600 rounded-2xl shadow-lg shadow-indigo-900/50 mb-4">
            <ShieldCheck size={30} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">FinParty</h1>
          <p className="text-slate-400 text-sm mt-1">Sistema de Control Financiero Partidario</p>
          <p className="text-slate-600 text-xs mt-0.5">PCCh · RUT 71.701.800-1 · SERVEL PP007</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/70 border border-slate-700/50 rounded-2xl p-7 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 bg-amaranto-500 rounded-full" />
            <h2 className="text-base font-semibold text-white">
              {forzarCambio ? 'Cambia tu contraseña' : 'Acceso al Sistema'}
            </h2>
          </div>

          {forzarCambio ? (
            <form onSubmit={handleCambio} className="space-y-4">
              <p className="text-xs text-slate-400 flex items-start gap-2">
                <KeyRound size={14} className="shrink-0 mt-0.5 text-amber-400" />
                Tu acceso usa una contraseña temporal. Define una nueva para continuar.
              </p>
              {/* Nueva contraseña */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={verClave ? 'text' : 'password'}
                    value={nuevaClave}
                    onChange={e => { setNuevaClave(e.target.value); setError('') }}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                    required
                    className="w-full bg-slate-900/70 border border-slate-600/50 text-white placeholder-slate-600 rounded-xl pl-9 pr-11 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500/50 transition-all"
                  />
                  <button type="button" onClick={() => setVerClave(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors" tabIndex={-1}>
                    {verClave ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              {/* Confirmar */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={verClave ? 'text' : 'password'}
                    value={confirmaClave}
                    onChange={e => { setConfirmaClave(e.target.value); setError('') }}
                    placeholder="Repite la nueva contraseña"
                    autoComplete="new-password"
                    required
                    className="w-full bg-slate-900/70 border border-slate-600/50 text-white placeholder-slate-600 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500/50 transition-all"
                  />
                </div>
              </div>
              {error && (
                <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              <button type="submit" disabled={cargando}
                className="w-full bg-amaranto-600 hover:bg-amaranto-500 active:bg-amaranto-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-2.5 text-sm transition-colors mt-1 flex items-center justify-center gap-2">
                {cargando ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar y entrar'
                )}
              </button>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Usuario */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
                Usuario
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={usuario}
                  onChange={e => { setUsuario(e.target.value); setError('') }}
                  placeholder="Nombre de usuario"
                  autoComplete="username"
                  required
                  className="w-full bg-slate-900/70 border border-slate-600/50 text-white placeholder-slate-600 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500/50 transition-all"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
                Contraseña
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={verClave ? 'text' : 'password'}
                  value={clave}
                  onChange={e => { setClave(e.target.value); setError('') }}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full bg-slate-900/70 border border-slate-600/50 text-white placeholder-slate-600 rounded-xl pl-9 pr-11 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setVerClave(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {verClave ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Botón */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-amaranto-600 hover:bg-amaranto-500 active:bg-amaranto-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-2.5 text-sm transition-colors mt-1 flex items-center justify-center gap-2"
            >
              {cargando ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verificando...
                </>
              ) : (
                'Ingresar al sistema'
              )}
            </button>
          </form>
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 text-center space-y-1">
          <p className="text-xs text-slate-700">Acceso restringido a personal autorizado</p>
          <p className="text-xs text-slate-800">Ley 21.719 · Protección de Datos Personales · Chile</p>
        </div>
      </div>
      </div>
    </div>
  )
}
