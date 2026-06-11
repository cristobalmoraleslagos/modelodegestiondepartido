# Seguridad de la Intranet FinParty

Documento del modelo de seguridad del módulo de intranet (acceso de funcionarios,
carga de BHE/contratos, generación de rendiciones).

## Controles implementados

| Área | Control |
|------|---------|
| Contraseñas | Hash **bcrypt** (passlib). Nunca en claro, ni en logs, ni en el código. Mínimo 8 caracteres. |
| Sesión | **JWT HS256** firmado con `JWT_SECRET` (env). Expiración corta (`JWT_EXPIRE_MIN`, default 60 min). |
| Autorización | **RBAC verificado en el servidor** (`require_rol`) en cada endpoint sensible. El frontend solo oculta UI; la decisión real es del backend. |
| Fuerza bruta | Bloqueo de cuenta tras `LOGIN_MAX_INTENTOS` (5) por `LOGIN_BLOQUEO_MIN` (15 min). Respuesta de login uniforme (no revela si el usuario existe). |
| Auditoría | Tabla `audit_log` inmutable: login (ok/fallido), carga/anulación de BHE, carga/descarga de contratos, alta/edición de usuarios, generación de rendición — con usuario y timestamp. |
| Uploads | Validación de extensión/MIME y tamaño (`MAX_UPLOAD_MB`). Contratos solo PDF. Nombre de archivo saneado. Hash **sha256** del contenido. Guardado en `attachments/` (fuera del web root); nunca se ejecuta. |
| Inyección | ORM SQLAlchemy con consultas parametrizadas. Validación de entrada con Pydantic. |
| CORS | Restringido a `CORS_ORIGINS` (no `*`). |
| Secretos | `JWT_SECRET`, `DB_PASSWORD`, credenciales SII/IMAP por variables de entorno. `.env` está en `.gitignore`. |
| PII | RUT y nombres son datos personales: acceso por rol y toda lectura sensible queda auditada. |

## Roles

- **admin**: gestiona usuarios, carga/anula BHE, contratos, genera rendiciones.
- **funcionario**: carga/anula BHE, contratos, genera rendiciones (no gestiona usuarios).
- **auditor**: solo lectura (informes, listados).

## Variables de entorno requeridas en producción

```
JWT_SECRET=<cadena aleatoria larga, p.ej. openssl rand -hex 32>
DB_PASSWORD=<clave fuerte>
CORS_ORIGINS=https://intranet.tu-dominio.cl
ADMIN_USER=admin@pcch.cl        # solo para el seed inicial
ADMIN_PASS=<clave fuerte>       # solo para el seed inicial
```

## Lo que PRODUCCIÓN debe sumar (fuera del alcance del código)

1. **TLS/HTTPS obligatorio** (terminación en reverse proxy / load balancer). Sin HTTPS, el JWT viaja en claro.
2. **Backups** automáticos y cifrados de Postgres + `attachments/`.
3. **Rotación** periódica de `JWT_SECRET` y `DB_PASSWORD`.
4. **2FA** para administradores (roadmap).
5. **Rate limiting** a nivel de gateway además del lockout de la app.
6. **Almacenamiento cifrado en reposo** del volumen de `attachments/` y de la base.
7. **Monitoreo/alertas** sobre `audit_log` (p.ej. múltiples LOGIN_FALLIDO).
8. Política de **expiración/complejidad** de contraseñas y revisión de accesos.

## Notas

- El token se guarda en `sessionStorage` del navegador (se borra al cerrar la pestaña). Esto es aceptable para una intranet interna; mitigar XSS es prioritario (CSP, escape de salidas) ya que sessionStorage es accesible por JS.
- El default `JWT_SECRET=dev-only-change-me-in-prod` solo sirve para desarrollo. **Desplegar con ese valor es una vulnerabilidad crítica.**
