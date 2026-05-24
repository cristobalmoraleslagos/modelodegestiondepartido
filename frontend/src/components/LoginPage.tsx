import { useState, type FormEvent } from 'react'
import { Lock, User, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react'

const CREDENCIALES = { usuario: 'Cristóbal Morales', clave: 'CBAML241243.' }

interface Props { onLogin: () => void }

export default function LoginPage({ onLogin }: Props) {
  const [usuario, setUsuario] = useState('')
  const [clave, setClave]     = useState('')
  const [verClave, setVerClave] = useState(false)
  const [error, setError]     = useState('')
  const [cargando, setCargando] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (cargando) return
    setError('')
    setCargando(true)
    setTimeout(() => {
      if (usuario.trim() === CREDENCIALES.usuario && clave === CREDENCIALES.clave) {
        onLogin()
      } else {
        setError('Usuario o contraseña incorrectos. Verifique sus credenciales.')
        setCargando(false)
      }
    }, 650)
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-900/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-slate-800/40 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm z-10">
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-900/50 mb-4">
            <ShieldCheck size={30} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">FinParty</h1>
          <p className="text-slate-400 text-sm mt-1">Sistema de Control Financiero Partidario</p>
          <p className="text-slate-600 text-xs mt-0.5">PCCh · RUT 71.701.800-1 · SERVEL PP007</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/70 border border-slate-700/50 rounded-2xl p-7 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 bg-indigo-500 rounded-full" />
            <h2 className="text-base font-semibold text-white">Acceso al Sistema</h2>
          </div>

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
              className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-2.5 text-sm transition-colors mt-1 flex items-center justify-center gap-2"
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
        </div>

        {/* Footer */}
        <div className="mt-5 text-center space-y-1">
          <p className="text-xs text-slate-700">Acceso restringido a personal autorizado</p>
          <p className="text-xs text-slate-800">Ley 21.719 · Protección de Datos Personales · Chile</p>
        </div>
      </div>
    </div>
  )
}
