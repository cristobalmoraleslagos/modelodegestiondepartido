/**
 * auth.ts — Sesión de la intranet FinParty.
 *
 * Modo backend (VITE_API_URL definido): autentica contra /api/auth/login
 * (JWT + bcrypt + RBAC en el servidor). Es el modo seguro para producción.
 *
 * Modo demo (sin backend): cae al gate client-side de auth.config.ts para no
 * romper el despliegue estático actual. NO es seguro y se trata como rol 'admin'
 * local únicamente para navegar la app sin servidor.
 */
import { API_DISPONIBLE, BASE, getToken, setToken, clearToken } from './api'
import { USUARIOS } from './auth.config'

export type Rol = 'admin' | 'funcionario' | 'auditor'

export interface Sesion {
  nombre: string
  rol: Rol
  username: string
  modo: 'backend' | 'demo'
  debeCambiarPassword?: boolean
}

const SES_KEY = 'finparty_usuario'

export function getSesion(): Sesion | null {
  const raw = sessionStorage.getItem(SES_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) as Sesion }
  catch { return null }
}

export function getRol(): Rol | null { return getSesion()?.rol ?? null }

export function logout() {
  clearToken()
  sessionStorage.removeItem(SES_KEY)
}

/** Lanza Error con mensaje legible si falla. */
export async function login(username: string, password: string): Promise<Sesion> {
  if (API_DISPONIBLE) {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
    })
    if (!res.ok) {
      const detail = (await res.json().catch(() => ({}))).detail
      throw new Error(detail ?? 'Usuario o contraseña incorrectos.')
    }
    const data = await res.json() as {
      access_token: string
      usuario: { nombre: string; rol: Rol; username: string; debe_cambiar_password?: boolean }
    }
    setToken(data.access_token)
    const ses: Sesion = {
      nombre: data.usuario.nombre, rol: data.usuario.rol, username: data.usuario.username,
      modo: 'backend', debeCambiarPassword: Boolean(data.usuario.debe_cambiar_password),
    }
    sessionStorage.setItem(SES_KEY, JSON.stringify(ses))
    return ses
  }

  // ── Modo demo (sin backend) ──
  // Usuario de prueba integrado para ver la intranet sin servidor.
  // NO es una credencial real: es pública por diseño, solo habilita el modo demo.
  if (username.trim().toUpperCase() === 'USER PRUEBA' && password === 'PRUEBA123') {
    const ses: Sesion = { nombre: 'Usuario Prueba', rol: 'funcionario', username: 'USER PRUEBA', modo: 'demo' }
    sessionStorage.setItem(SES_KEY, JSON.stringify(ses))
    return ses
  }
  const claveEsperada = USUARIOS[username.trim()]
  if (!claveEsperada || password !== claveEsperada) {
    throw new Error('Usuario o contraseña incorrectos.')
  }
  const ses: Sesion = { nombre: username.trim(), rol: 'admin', username: username.trim(), modo: 'demo' }
  sessionStorage.setItem(SES_KEY, JSON.stringify(ses))
  return ses
}

/**
 * Cambio de contraseña del propio usuario (self-service). Solo modo backend.
 * Al éxito, limpia el flag debeCambiarPassword en la sesión local.
 */
export async function cambiarPassword(actual: string, nueva: string): Promise<void> {
  if (!API_DISPONIBLE) throw new Error('El cambio de contraseña requiere el modo backend.')
  const res = await fetch(`${BASE}/api/auth/cambiar-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken() ?? ''}` },
    body: JSON.stringify({ password_actual: actual, password_nueva: nueva }),
  })
  if (!res.ok) {
    const detail = (await res.json().catch(() => ({}))).detail
    throw new Error(detail ?? 'No se pudo cambiar la contraseña.')
  }
  const ses = getSesion()
  if (ses) {
    ses.debeCambiarPassword = false
    sessionStorage.setItem(SES_KEY, JSON.stringify(ses))
  }
}
