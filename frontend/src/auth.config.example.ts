// Plantilla de referencia — auth.config.ts YA está en el repo (sin contraseñas hardcodeadas).
// Las contraseñas se configuran como variables de entorno:
//   - Producción (Vercel): Dashboard → Settings → Environment Variables
//   - Local: archivo frontend/.env.local (en .gitignore)
//       VITE_PASS_CM=tu_clave
//       VITE_PASS_AU=tu_clave
export const USUARIOS: Record<string, string> = {
  'Nombre Apellido': (import.meta.env.VITE_PASS_XX as string) ?? '',
}
