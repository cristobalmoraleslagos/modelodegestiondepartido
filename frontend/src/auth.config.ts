/**
 * auth.config.ts — Credenciales del sistema FinParty.
 *
 * Las contraseñas se configuran como variables de entorno en Vercel:
 *   VITE_PASS_CM  = contraseña de Cristóbal Morales
 *   VITE_PASS_AU  = contraseña de Alejandro Urquiza
 *
 * Para desarrollo local: crear un archivo .env.local con estas variables.
 * Nunca hardcodear contraseñas en este archivo.
 */
export const USUARIOS: Record<string, string> = {
  'Cristóbal Morales': (import.meta.env.VITE_PASS_CM as string) ?? '',
  'Alejandro Urquiza':  (import.meta.env.VITE_PASS_AU as string) ?? '',
}
