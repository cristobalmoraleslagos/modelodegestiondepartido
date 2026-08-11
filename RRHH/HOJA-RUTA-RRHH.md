# Hoja de ruta — Plataforma RRHH sobre el backend FinParty

**Proyecto:** FinParty PCCh — extensión de la intranet hacia una suite de RRHH.
**Base:** [spec-plataforma-rrhh.md](spec-plataforma-rrhh.md)
**Fecha:** 2026-06-22
**Decisión de fondo:** NO se construye una plataforma nueva. Se **extiende el backend FastAPI + PostgreSQL de FinParty**, que ya tiene auth, RBAC, `Contrato`, `DocumentoCargado`, `AuditLog` y `PersonalNomina`.

---

## 1. Premisas adoptadas (respuestas a las preguntas abiertas del spec §8)

Para no bloquear el diseño, se fijan estas premisas (ajustables si el usuario indica lo contrario):

| Pregunta abierta | Premisa adoptada | Impacto |
|------------------|------------------|---------|
| ¿Calcula remuneraciones? | **No.** Solo almacena/muestra liquidaciones externas (Previred/Defontana ya integrados). | Evita reimplementar cálculo previsional chileno. |
| ¿Single o multi-tenant? | **Single-tenant** — CONFIRMADO: "solo será usada por funcionarios/as del Partido Comunista". | Modelo sin `organizacion_id`; simple. |
| ¿Storage de archivos? | Reusar `backend/attachments/` local → migrar a object storage (S3/GCS) al desplegar. | Consistente con la intranet actual. |
| ¿Integración externa? | Previred/Defontana son la **fuente** de datos previsionales; RRHH no los duplica, referencia. | `datos_previsionales` guarda lo mínimo. |
| ¿Jurisdicción? | **Chile única.** | Feriado legal, feriado progresivo, finiquito, Ley 21.719. |

---

## 2. Mapa spec → código (reusar / extender / nuevo)

| Entidad spec | Estado en FinParty | Acción |
|--------------|--------------------|--------|
| `usuario` / `rol` | ✅ `Usuario` (RBAC, lockout, cambio forzado de clave) | **Reusar.** Agregar rol `jefatura` y `autoservicio`. |
| `log_auditoria` | ✅ `AuditLog` | **Extender:** agregar columna `ip`; auditar también LECTURA de datos sensibles. |
| `contrato` | ✅ `Contrato` | **Extender:** `unidad_id`, `jefatura_directa_id`, `jornada`, `sueldo_base` (cifrado), `centro_costo`. |
| `documento` | ≈ `DocumentoCargado` | **Extender/nuevo:** agregar `confidencialidad` (estándar/sensible) y `version`. Evaluar tabla `documento_rrhh` separada si el uso diverge del pipeline BHE. |
| `empleado` | ≈ `PersonalNomina` (parcial) | **Nuevo `empleado`:** ficha completa (datos personales, estado, contacto emergencia, foto). Vincular con `PersonalNomina`. |
| `historial_cargo` | ❌ | **Nuevo.** |
| `ausentismo` | ❌ (demo en `HubIntranetDemo`) | **Nuevo** en backend. |
| `datos_previsionales` | ❌ (tabla aislada) | **Nuevo**, con permisos estrictos y columnas cifradas. |
| `unidad_organizacional` | ❌ | **Nuevo** (jerárquico, self-FK). |

---

## 3. Plan por fases

### Fase 0 — Decisiones y base (0,5 día)
- [ ] Confirmar las premisas de §1 con el usuario (sobre todo single-tenant y "sin cálculo de remuneraciones").
- [ ] Definir método de cifrado de columnas sensibles: **`pgcrypto`** (recomendado) vs cifrado en la app. Afecta si `sueldo_base` es filtrable.

### Fase 1 — MVP (modelo + módulos base) (~4-5 días)
Aprovecha todo lo ya construido. Orden sugerido:
1. **Modelos nuevos** (`db/models.py`): `Empleado`, `UnidadOrganizacional`, `HistorialCargo`, `Ausentismo`, `DatosPrevisionales`; extender `Contrato` y `AuditLog`.
2. **Migraciones idempotentes** (patrón `_migrar_columnas` + `bootstrap_db.py`).
3. **Seguridad**: roles `jefatura`/`autoservicio`; dependencia `require_dato_sensible` (permiso adicional para previsional/salud); auditoría de lectura sensible con IP.
4. **Endpoints** (`api/rrhh.py`, nuevo router): CRUD ficha/contrato/historial; carpeta documental con confidencialidad; generador de documentos (plantillas Jinja2 → PDF); informes de servicio (§5 del spec).
5. **Frontend**: nuevo Hub RRHH con Ficha, Carpeta documental, Generador de certificados, Informes; portal de Autoservicio (el funcionario ve solo su ficha). Reusar el patrón Hub/Módulo actual.

### Fase 2 — Flujos y organigrama (~3-4 días)
- Ausentismo con flujo de aprobación (jefatura) + saldo de vacaciones (feriado legal chileno, feriado progresivo).
- Organigrama dinámico (`unidad_organizacional` + `jefatura_directa_id`).
- Notificaciones automáticas (contratos por vencer, documentos, exámenes) — reusar el scheduler existente (`schedule`/`apscheduler`).
- Evaluaciones de desempeño.

### Fase 3 — Analítica e integración (~3-4 días)
- Reportería sobre **réplica/vista materializada** de solo lectura (desacoplar de lo transaccional).
- Reclutamiento (vacantes → postulantes → conversión a ficha).
- Dashboard con series históricas.

---

## 4. Seguridad — adiciones exigidas por el spec (§6) sobre lo actual

- **Ley 21.719 (2024)** — nombrar explícitamente (el spec la cita como "actualización de la 19.628"): DPD, registro de actividades de tratamiento, consentimiento. **La filiación política es dato sensible.**
- **Segregación de datos sensibles**: `datos_previsionales` y documentos de salud requieren permiso adicional, no basta el acceso a la ficha.
- **Auditoría de LECTURA** de datos sensibles (hoy `AuditLog` solo cubre acciones de escritura de forma consistente) + captura de **IP**.
- **Cifrado en reposo** de `sueldo_base`, cuenta bancaria y datos de salud (definir método en Fase 0).
- **Retención documental**: política de conservación según Dirección del Trabajo (contratos, licencias) antes de habilitar borrado.

---

## 5. Definición de "MVP entregable"

1. Se puede crear/editar la ficha de un funcionario con su contrato e historial de cargo.
2. Se cargan documentos con nivel de confidencialidad y versionado; los sensibles exigen permiso adicional.
3. Se emite un certificado (renta/antigüedad) desde plantilla en PDF.
4. Se generan los informes de dotación y "contratos por vencer".
5. El funcionario ve su propia ficha por autoservicio.
6. Toda lectura/escritura de datos sensibles queda auditada con IP.

---

## 6. Riesgos

| Riesgo | Mitigación |
|--------|-----------|
| Duplicar datos previsionales ya en Previred/Defontana | `datos_previsionales` referencia, no recalcula |
| Elegir multi-tenant tarde | Decidir en Fase 0 (premisa: single-tenant) |
| `documento` RRHH mezclado con el pipeline BHE de `DocumentoCargado` | Evaluar tabla separada `documento_rrhh` en Fase 1 |
| Cifrado de columnas retrofit | Definir método en Fase 0, antes de poblar datos |

---

## 7. Avance

**Hecho:**
- Modelos nuevos + migraciones idempotentes (5 tablas RRHH + extensiones).
- Router `api/rrhh.py` — **ficha de funcionarios/as**: el admin incorpora personas
  (`POST /api/rrhh/empleados`), lista/consulta (`GET`), edita/desvincula (`PATCH`). Auditado con IP.
- Frontend Hub RRHH (ficha, alta por admin, listado) + **seed con la nómina real** (9 personas,
  derivadas de `FUNCIONARIOS_CANON`, sin exponer sueldos).
- **Alcance solo-RRHH** (`APP_SCOPE`, ver §6 del CLAUDE.md).
- **CI mínimo** (`.github/workflows/ci.yml`): `tsc -b` + import del backend en cada push.

---

## 8. Plan repriorizado por dependencias (fusión con insumo de Cowork)

Reordena por prerrequisitos reales, no solo por valor. Detalle en
`RRHH/HOJA-RUTA-RRHH-actualizada.md` (insumo de Cowork).

**Fase 0 — Bloqueante técnico (antes de tocar datos reales):**
1. Desplegar backend con HTTPS + Postgres (host propio). *Depende del usuario; no ejecutable por el agente.*
2. `bootstrap_db.py` → secretos reales (sin defaults `CAMBIAR_...`) → `VITE_API_URL` → verificación.
3. ~~CI mínimo~~ ✅ **hecho**.

**Fase 1 — Datos sensibles (bloqueante para cargar sueldo/cuenta reales):**
1. Cifrado en la app (Fernet/AES, clave por env) para `*_cifrado`.
2. **Guard server-side**: rechazar escritura en campos sensibles si no hay clave de cifrado.
3. `datos_previsionales` con permiso adicional; **auditoría de LECTURA** (no solo escritura).
4. **Admin operativo** vs **admin con acceso a datos sensibles** (permisos granulares dentro de admin).

**Fase 2 — Ausentismo + jefatura:** rol **jefatura** (prerrequisito de la aprobación) → ausentismo
con feriado legal/progresivo (lógica de negocio con tests) → autoservicio de solicitudes.

**Fase 3 — Organigrama, historial de cargo, generador de documentos** (con **gestión de plantillas
desde admin**, no hardcodeada) + descarga de certificados por autoservicio.

**Fase 4 — Informes de servicio** (dotación, contratos por vencer, ausentismo) + informe de
fiscalización SERVEL con **auditoría reforzada de exportación**.

**Fase 5 — Transparencia y cumplimiento Ley 21.719:** "quién consultó mi ficha" (usa `AuditLog`
filtrado), **registro de solicitudes ARCO**, `seed_rrhh.py` para poblar `empleados` en la BD.

**Fase 6 — Deuda técnica (antes de reactivar `APP_SCOPE=full`):** fix bug **Fondo Género** en
`ModuloAlertas` (con test de regresión), reconciliar cifras 2025, evaluar aislamiento real del
bundle financiero, migrar `attachments/` a object storage.

**Aportes de valor del insumo de Cowork** (no estaban explícitos): transparencia de accesos al
titular, solicitud de cambio de datos con aprobación (no edición directa), rol jefatura como
prerrequisito de ausentismo, permisos granulares dentro de admin, registro ARCO.
