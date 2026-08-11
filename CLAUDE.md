# CLAUDE.md — Contexto del proyecto FinParty (para Claude Code / Cowork)

> Documento vivo de traspaso de contexto entre **Claude Code** (máquina local, con los datos
> reales) y **Claude Cowork**. Da el estado actual, lo pendiente y una lectura crítica desde
> lo **funcional** y lo **de infraestructura**. Complementa a `COWORK-ONBOARDING.md` (más
> detallado en mapa de repo y convenciones); este archivo prioriza **estado y decisiones**.
>
> Última actualización: 2026-06-22 · rev. autoinscripción + CI.

---

## 1. Qué es

**FinParty** — control financiero, compliance SERVEL y ahora **RRHH** del **Partido Comunista
de Chile** (PCCh · RUT 71.701.800-1 · SERVEL PP007). Marco: DFL N°4/2017, DFL N°3/2017,
Ley 20.900, **Ley 21.719** (datos personales). Repo: `cristobalmoraleslagos/modelodegestiondepartido`, rama **master**.

**Estado de alto nivel:** el frontend está maduro; el backend es funcional pero **no desplegado**;
la instancia hoy se presenta como **plataforma de RRHH** (los módulos financieros existen pero
están ocultos porque el tenant admin aún no los valida).

---

## 2. Stack

| Capa | Tecnología | Estado |
|------|-----------|--------|
| Frontend | React + Vite + TypeScript (`frontend/`) | Vercel, auto-deploy desde `master`. Sin backend → modo demo (localStorage). |
| Backend | FastAPI + SQLAlchemy 2.0 + PostgreSQL (`backend/`) | Completo a nivel de código. **No desplegado** (falta host con HTTPS). |
| Procesamiento | Python (`procesadores/`) | Parsea SII/Defontana/Transparencia → CSV/JSON + minuta. |

**Interruptor clave:** el frontend usa el backend **solo si `VITE_API_URL` está definida**; si no,
degrada a datos hardcodeados / localStorage.

---

## 3. Convenciones que NO hay que romper

- **Typecheck = `tsc -b`** (NO `tsc --noEmit`: el tsconfig raíz usa project references y `--noEmit` es un no-op). Build = `tsc -b && vite build`.
- **`erasableSyntaxOnly` activo** → prohibido usar parameter properties en TS (`constructor(public x)` falla). Declarar el campo aparte.
- **Secretos**: nunca commitear `backend/.env`, `frontend/.env.local`, `*.pfx`. Correr `git status` antes de push. PII en carpetas gitignoreadas (`ARCHIVOS SII/`, `DEFONTANA/`, `PREVIRED/`, `backend/attachments/`, etc.).
- **Commits**: terminar el mensaje con `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Backend auth**: bcrypt directo (passlib 1.7.4 es incompatible con bcrypt≥4.1); JWT HS256; RBAC server-side.
- **Login lo hace siempre una persona**; no ingresar credenciales de terceros en portales (SII/Previred).

---

## 4. Mirada FUNCIONAL

### 4.1 Lo que funciona
- **Financiero** (hoy oculto, ver §6): Presupuesto, Ingresos, Egresos, Tesorería (flujo de caja real 2026 + conciliación), Contabilidad, Compliance (alertas + tabla de límites legales), Rendición SERVEL. Datos reales anclados a Defontana/Transparencia/Previred.
- **Intranet de rendición** (backend): auth JWT + RBAC + lockout + **cambio de contraseña forzado en primer login**; carga de BHE (con anulación), contratos, informes y generación de carpetas de rendición. Auditoría de toda acción.
- **Autoinscripción** (backend, `POST /api/auth/registro` + `/definir-password`): la persona se registra con correo **`@pcchile.org`**, recibe un correo con enlace de token (48 h) para **definir su propia contraseña**, y queda **pendiente de aprobación** por un admin (`Usuario.aprobado`; guards de login). Envío por SMTP genérico (`api/correo.py`), tolerante si no hay credenciales. **Falta el frontend** (registro público + página definir-password).
- **RRHH** (foco actual): ficha de funcionarios/as — el **admin incorpora/desvincula**, funcionario/auditor solo consultan. Backend `api/rrhh.py` (CRUD + auditoría con IP). Frontend Hub RRHH. Ficha **sembrada con la nómina real** (9 personas, derivadas de `FUNCIONARIOS_CANON`, sin exponer sueldos).

### 4.2 Pendiente funcional (RRHH, por orden de valor)
0. **Frontend de autoinscripción**: formulario de registro público (login) + página `/definir-password?token=` + vista de aprobación de pendientes para el admin. El backend ya está.
1. **Contrato + `sueldo_base`** con **cifrado en la app** (decisión tomada; falta implementar) y `datos_previsionales` con permiso adicional.
2. **Ausentismo** (vacaciones/licencias/permisos) con flujo de aprobación + saldo de feriado legal chileno.
3. **Organigrama** (`unidad_organizacional` + jefatura) y **historial de cargo**.
4. **Generador de documentos** (certificados desde plantilla → PDF) e **informes de servicio** (dotación, contratos por vencer).
5. **Seed de backend** (`seed_rrhh.py`) para poblar la tabla `empleados` cuando la BD esté viva.
Ver `RRHH/HOJA-RUTA-RRHH.md`.

### 4.3 Aspectos a MEJORAR (deuda funcional detectada)
- **ModuloAlertas desactualizado**: no refleja la crisis de caja real 2026 (`FLUJO_CAJA_REAL_2026`), solo la proyección 2025. Además, el cálculo del **Fondo Género filtra una categoría que no existe** en los egresos → siempre da $0/déficit; el denominador usa el aporte 2026 parcial.
- **Datos aún no reconciliados** (2025): `cotizaciones2025` y `gastosOrdinarios2025` propuestos por Cowork no calzaban con las fuentes locales → documentados como pendientes en `AUDITORIA_2025`, no hardcodeados. Requieren cartola/Libro Mayor para cerrarse.
- **Fuente única de datos**: se unificó Egresos (`EGRESOS_BASE`) y Deuda (`PRESTAMOS_BASE`); revisar que no reaparezcan duplicados hardcodeados al agregar módulos.

---

## 5. Mirada de INFRAESTRUCTURA

### 5.1 Camino crítico (bloqueante para "RRHH real")
**Desplegar el backend con HTTPS + Postgres.** Vercel aloja solo el frontend; FastAPI+PG necesitan host propio (Railway/Render/Fly o servidor del partido). Mientras no exista, la app va en **modo demo** (localStorage) y no persiste ni audita de verdad.
Secuencia (ver `HOJA-RUTA-INTRANET.md`): host → `bootstrap_db.py` (extensiones + esquema `finparty` + `search_path` + tablas + migraciones + seed admin) → secretos reales en `.env` → `VITE_API_URL` al backend → verificación.

### 5.2 Base de datos
- Postgres 16, esquema **`finparty`**, extensiones `uuid-ossp` + `pg_trgm`. Tablas: **19** (14 base + 5 RRHH). Las crea `create_tables()`; las columnas nuevas, migraciones idempotentes en `api/main.py` y `bootstrap_db.py` (mantener sincronizadas).
- **Corregido**: `bootstrap_db.py` fija `search_path = finparty` de forma persistente. Sin eso, las tablas caían en `public` y las migraciones `finparty.*` fallaban en silencio (la columna `anulada`/`debe_cambiar_password` no se agregaba). Coherencia lograda.

### 5.3 Secretos / configuración
- `.env.example` completo (JWT_SECRET, CORS_ORIGINS, ADMIN_*, SII/Defontana, y autoinscripción: `EMAIL_DOMAIN_PERMITIDO`, `FRONTEND_URL`, `CORREO_REMITENTE`, `TOKEN_PASSWORD_MIN`). Defaults peligrosos marcados `CAMBIAR_...`.
- **SMTP** (`SMTP_HOST/USER/PASSWORD`) alimenta los correos de invitación. Camino de envío para `@pcchile.org` **por definir**: Proton Business SMTP submission, o proveedor transaccional (SES/Postmark/SendGrid) con SPF+DKIM en el DNS de `pcchile.org`.
- Frontend flags: `VITE_API_URL` (backend on/off), **`VITE_APP_SCOPE`** (ver §6), `VITE_PASS_CM`/`VITE_PASS_AU` (login admin demo).

### 5.4 Aspectos a MEJORAR (infra)
- **Cifrado en reposo** de columnas sensibles (`sueldo_base_cifrado`, `cuenta_bancaria_cifrada`, `renta_ref_cifrada`): están modeladas como ciphertext pero el cifrado **aún no se implementa** (decisión: app-layer, p. ej. Fernet/AES, clave por env).
- **Auditoría de lectura** de datos sensibles (spec RRHH §6): `AuditLog` ya tiene `ip`; falta instrumentar la lectura, no solo la escritura.
- **Storage de archivos**: hoy `backend/attachments/` local; migrar a object storage (S3/GCS) al desplegar.
- **Reportería**: separar de las tablas transaccionales (vista materializada/réplica) cuando crezca la dotación.
- **CI mínimo activo** (`.github/workflows/ci.yml`): `tsc -b` + import de `api.main` en cada push/PR. Falta cobertura de **tests** (unitarios/integración), sobre todo para la lógica de negocio futura (feriado legal, cifrado).

---

## 6. Alcance actual de la interfaz — SOLO RRHH

Por decisión del usuario, **el tenant admin aún no valida los módulos financieros**, así que mostrarlos
sería exponer información sin validar. La app se presenta **solo como RRHH**:

- Flag `APP_SCOPE` en `frontend/src/App.tsx` (default `'rrhh'`): el sidebar muestra únicamente
  "Recursos Humanos" y la app abre en ese tab.
- **Nada se elimina**: el código financiero sigue en el repo/bundle, solo oculto de la navegación.
- Para reactivar todo cuando se valide: `VITE_APP_SCOPE=full`.
- **Nota honesta**: ocultar del menú evita *presentar* la info, pero el JS financiero aún viaja en
  el bundle. Aislamiento real (que ni exista en el paquete) = separar en dos apps.

---

## 7. Cómo trabajar aquí (para Cowork)

- Antes de proponer cambios de datos, verificar contra las fuentes locales (Cowork no tiene los
  archivos reales; están en la máquina de Claude Code). Marcar como "por reconciliar" lo que no calce.
- Cambios de frontend: siempre `tsc -b` antes de dar por hecho. Verificar en preview cuando sea observable.
- No tocar el alcance `APP_SCOPE` ni exponer módulos financieros salvo indicación explícita.
- Antes de cualquier push: `git status` para confirmar que ningún `.env`/`.pfx` está en staging.

---

## 8. Punteros

- `COWORK-ONBOARDING.md` — mapa de repo y convenciones en detalle.
- `HOJA-RUTA-INTRANET.md` — despliegue del backend/intranet.
- `RRHH/HOJA-RUTA-RRHH.md` — plan de la plataforma RRHH (fases, reuso/extensión/nuevo; §8 = plan repriorizado).
- `RRHH/HOJA-RUTA-RRHH-actualizada.md` — insumo de Cowork (autoservicio, ARCO, rol jefatura, admin granular).
- `RRHH/spec-plataforma-rrhh.md` — especificación funcional de RRHH.
- `AUDITORIA-INTEGRAL-2026-06.md` — auditoría del modelo (hallazgos, brechas).
