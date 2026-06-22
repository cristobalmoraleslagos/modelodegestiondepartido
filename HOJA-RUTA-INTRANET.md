# Hoja de ruta — Habilitar el Módulo Intranet

**Proyecto:** FinParty PCCh (SERVEL PP007)
**Objetivo de la tarea:** dejar operativo el Módulo Intranet (acceso de funcionarios con login real, carga de BHE con marca de anulación, carga de contratos, informes y generación de carpetas de rendición), con seguridad de producción.
**Fecha de emisión:** 2026-06-22

---

## 1. Estado actual (punto de partida)

El módulo **ya está desarrollado** (código completo y compilando). Lo que falta NO es programar, sino **desplegar, configurar secretos, sembrar el primer usuario, verificar de punta a punta y endurecer para producción**.

| Pieza | Estado | Evidencia |
|-------|--------|-----------|
| Backend auth (bcrypt + JWT + RBAC + auditoría + lockout) | ✅ Hecho | `backend/api/security.py` |
| Endpoints (auth, usuarios, BHE, contratos, informes, rendición) | ✅ Hecho (13 endpoints) | `backend/api/intranet.py` |
| Router montado + CORS configurable | ✅ Hecho | `backend/api/main.py` |
| Modelos (Usuario, Contrato, DocumentoCargado.anulada) | ✅ Hecho | `backend/db/models.py` |
| Seed del admin (lee `ADMIN_USER`/`ADMIN_PASS` de entorno) | ✅ Hecho | `backend/seed_admin.py` |
| Base de datos (Docker Compose + init.sql) | ✅ Hecho | `backend/docker-compose.yml`, `backend/init.sql` |
| Frontend Hub + 4 módulos (CargaBHE, Contratos, Informes, Usuarios) | ✅ Hecho | `frontend/src/components/HubIntranet.tsx` |
| Conmutación automática demo ↔ real (`API_DISPONIBLE`) | ✅ Hecho | `frontend/src/api.ts` (lee `VITE_API_URL`) |
| **Backend desplegado y accesible (HTTPS)** | ❌ **Pendiente** | — |
| **Secretos de producción definidos** | ❌ **Pendiente** | `.env` real no existe |
| **Primer usuario admin creado** | ❌ **Pendiente** | — |
| **Frontend apuntando al backend (`VITE_API_URL`)** | ❌ **Pendiente** | hoy en demo / localhost |

> **Brecha detectada:** `backend/.env.example` **no documenta** las variables `JWT_SECRET`, `ADMIN_USER`, `ADMIN_PASS`, `CORS_ORIGINS`, `JWT_EXPIRE_MIN` aunque `config.py` sí las usa. Corregir el `.env.example` es parte de la Fase 1.

---

## 2. Decisión previa requerida (bloqueante)

**¿Dónde correrá el backend (FastAPI + PostgreSQL)?** Vercel aloja **solo** el frontend estático; el backend necesita un host propio con HTTPS.

- **Opción A (recomendada para partir): VPS / contenedor** (Railway, Render, Fly.io o un servidor del partido) con Docker. Ya hay `Dockerfile.api` y `docker-compose.yml`.
- **Opción B: servidor on-premise** del partido (mayor control de datos, requiere TLS y backups gestionados internamente).

Esta decisión condiciona las Fases 2–3 (dominio, CORS, `VITE_API_URL`). **Definir antes de avanzar.**

---

## 3. Hoja de ruta por fases

### Fase 0 — Preparación (0,5 día)
- [ ] **0.1** Confirmar la decisión de hosting (Sección 2).
- [ ] **0.2** Definir el dominio del backend (p. ej. `api.finparty.pcch.cl`) y del frontend.
- [ ] **0.3** Confirmar responsables: quién será **admin** inicial y qué **funcionarios** tendrán acceso (lista de nombres + correos + rol: `funcionario` / `auditor`).

### Fase 1 — Configuración y secretos (0,5 día)
- [ ] **1.1** Completar `backend/.env.example` con las variables faltantes (`JWT_SECRET`, `JWT_EXPIRE_MIN`, `CORS_ORIGINS`, `ADMIN_USER`, `ADMIN_PASS`, `ADMIN_NOMBRE`).
- [ ] **1.2** Crear `backend/.env` REAL (NO commitear — ya está en `.gitignore`) con:
  - `DB_PASSWORD` fuerte y único (NO usar el default `finparty_2026!`).
  - `JWT_SECRET` aleatorio de ≥32 bytes (NO usar `dev-only-change-me-in-prod`).
  - `CORS_ORIGINS` = dominio real del frontend (no `localhost` en prod).
- [ ] **1.3** Verificar antes de cualquier push: `git status` no debe mostrar `backend/.env`, `frontend/.env.local`, ni `*.pfx`.

### Fase 2 — Backend + Base de datos (1 día)
- [ ] **2.1** Levantar PostgreSQL: `cd backend && docker compose up -d postgres`.
- [ ] **2.2** Instalar dependencias: `pip install -r backend/requirements.txt`.
- [ ] **2.3** Inicializar la BD en **un solo comando** (extensiones + esquema + search_path + tablas + migraciones + seed del admin):
      `ADMIN_USER=admin@pcch.cl ADMIN_PASS='ClaveFuerte!' python backend/bootstrap_db.py`
      *(idempotente; reemplaza el paso manual de `seed_admin.py`)*.
- [ ] **2.4** Arrancar la API (`uvicorn` / `run_api.bat`) y confirmar `GET /docs` (OpenAPI) responde.
- [ ] **2.5** Desplegar el backend en el host elegido **con HTTPS/TLS** (reverse proxy o plataforma con TLS gestionado).

### Fase 3 — Frontend (0,5 día)
- [ ] **3.1** Definir `VITE_API_URL` = URL pública del backend (variable de entorno en Vercel para producción).
- [ ] **3.2** Confirmar que `CORS_ORIGINS` del backend incluye el dominio del frontend.
- [ ] **3.3** Build + deploy del frontend. Validar que la intranet sale de modo demo (`API_DISPONIBLE === true`) y muestra el login real.

### Fase 4 — Verificación de punta a punta (0,5 día)
- [ ] **4.1** Login como admin → crear un **funcionario** de prueba.
- [ ] **4.2** Login como funcionario → **subir una BHE** (.xls SII) y **marcar una boleta como anulada** con motivo; confirmar en `GET /api/bhe`.
- [ ] **4.3** **Subir un contrato** (PDF) → verificar archivo en `attachments/contratos/` y descarga (`GET /api/contratos/{id}/download`).
- [ ] **4.4** Generar un **informe de honorarios** y una **carpeta de rendición** (`POST /api/rendicion/generar?periodo=…`) → verificar carpeta `rendicion/<periodo>/`.
- [ ] **4.5** Revisar el **`AuditLog`**: cada acción (login, alta de usuario, upload, anulación, rendición) quedó registrada.
- [ ] **4.6** Probar **lockout**: 5 intentos fallidos bloquean la cuenta `LOGIN_BLOQUEO_MIN` minutos.

### Fase 5 — Endurecimiento de producción (1 día)
- [ ] **5.1** TLS obligatorio (HTTPS) en backend y frontend; redirección desde HTTP.
- [ ] **5.2** Backups automáticos de PostgreSQL (diarios) + prueba de restauración.
- [ ] **5.3** Rotación/custodia de secretos (`JWT_SECRET`, `DB_PASSWORD`) fuera del repo.
- [ ] **5.4** Límites de subida (`MAX_UPLOAD_MB`) y validación MIME/extensión confirmados.
- [ ] **5.5** Revisar `SECURITY.md` y documentar el roadmap de 2FA (pendiente declarado).
- [ ] **5.6** Política de retención de datos PII (contratos, BHE) acorde a Ley 21.719.

---

## 4. Checklist de seguridad pre-go-live (obligatorio)

- [ ] Ningún `.env` / `*.pfx` / secreto en el repositorio (`git status` limpio).
- [ ] `JWT_SECRET` y `DB_PASSWORD` cambiados respecto de los valores por defecto.
- [ ] `CORS_ORIGINS` restringido al dominio del frontend (sin `*`).
- [ ] Contraseñas con hash bcrypt (verificado — nunca en claro ni en logs).
- [ ] RBAC validado en servidor (no solo en la UI).
- [ ] HTTPS activo en ambos extremos.
- [ ] Auditoría (`AuditLog`) registrando todas las acciones sensibles.
- [ ] Backup de DB probado.

---

## 5. Definición de "habilitado" (criterio de cierre)

El módulo se considera **habilitado** cuando:
1. Un funcionario real inicia sesión en el dominio de producción (no demo).
2. Puede cargar una BHE, marcar anulación, subir un contrato y generar una carpeta de rendición.
3. Toda acción queda auditada.
4. El checklist de seguridad (Sección 4) está 100% verde.

**Esfuerzo estimado total:** ~4 días hábiles (sin contar la provisión del host, que depende de terceros).

---

## 6. Riesgos y dependencias

| Riesgo / dependencia | Mitigación |
|----------------------|-----------|
| Sin host de backend con HTTPS, el frontend queda en modo demo | Resolver la decisión de la Sección 2 en Fase 0 |
| `.env.example` incompleto induce a omitir secretos críticos | Tarea 1.1 lo corrige antes de configurar |
| Secretos por defecto (`finparty_2026!`, `dev-only-change-me-in-prod`) | Tareas 1.2 / 4 las bloquean |
| PII de contratos/BHE (Ley 21.719) | Acceso por rol + retención (Tarea 5.6) |
| Login lo realiza siempre una persona del partido | El equipo técnico guía; no se ingresan credenciales por terceros |
