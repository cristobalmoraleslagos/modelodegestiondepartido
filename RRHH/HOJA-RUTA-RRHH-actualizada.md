# Hoja de ruta RRHH — actualizada (Cowork)

> Insumo para fusionar con `RRHH/HOJA-RUTA-RRHH.md` en el repo (Claude Code tiene la versión
> vigente; este documento no la reemplaza, la complementa con hallazgos de auditoría +
> funcionalidad de usuario/administración que no estaban explícitos).
>
> Basado en `CLAUDE.md` (última actualización 2026-06-22) y en la revisión crítica previa
> (bug Fondo Género, cifrado pendiente, auditoría de lectura, aislamiento de bundle).

---

## 1. Funcionalidad de usuario (autoservicio) — mejoras propuestas

Hoy: el/la funcionario/a solo **consulta** su propia ficha; el admin incorpora/desvincula. No hay
rol de jefatura diferenciado ni flujo de solicitudes.

**Prioritarias (van con la hoja de ruta existente, no son un módulo aparte):**
- **Transparencia de accesos**: que la persona pueda ver quién consultó su ficha y cuándo (usa el
  mismo `AuditLog` que ya existe, solo filtrado por `empleado_id = usuario_actual`). Encaja
  directamente con derechos ARCO de la Ley 21.719 y construye confianza — vale más en este
  contexto (datos de personal de un partido) que en un RRHH genérico.
- **Solicitud de actualización de datos propios** (dirección, teléfono, contacto de emergencia)
  en vez de edición directa: la persona propone el cambio, el admin lo aprueba. Evita que el
  autoservicio se convierta en una puerta de edición sin control, y deja registro.
- **Descarga de certificados propios** — depende del generador de documentos (fase 3), pero el
  autoservicio es la superficie natural para exponerlo, no un flujo separado para el admin.
- **Solicitud de vacaciones/permisos** con saldo visible — depende de ausentismo (fase 2).

**Después, no urgente:**
- Notificaciones al propio usuario (vencimiento de su contrato, documentos por vencer).
- Historial propio de cargo/remuneración visible (ya existe `historial_cargo` en el modelo).

## 2. Funcionalidad de administración — mejoras propuestas

Hoy: un solo rol admin con CRUD completo sobre `empleados`. No hay rol de jefatura ni
permisos diferenciados dentro de RRHH (todo o nada).

**Gap más importante: permisos granulares dentro de "admin".** Ahora mismo cualquier admin ve
sueldo, cuenta bancaria y datos de salud si esos campos existen. Conviene separar al menos dos
niveles: **admin operativo** (altas/bajas, contratos, sin acceso a `datos_previsionales`) y
**admin con acceso a datos sensibles** (explícito, auditado en lectura). Esto es más barato de
diseñar ahora que después de que haya varios admins acostumbrados al acceso total.

**Rol de jefatura** (no existe hoy, estaba en la spec original pero no se implementó): ver la
ficha básica de su equipo (sin sueldo/datos previsionales salvo permiso adicional), aprobar
solicitudes de ausentismo. Es un prerrequisito funcional para que el flujo de vacaciones (fase 2)
tenga sentido — sin jefatura, ¿quién aprueba?

**Gestión de plantillas de documentos** desde la interfaz admin, no hardcodeada en backend —
si el generador de documentos (fase 3) nace sin esto, cada certificado nuevo requiere a Claude
Code, lo cual no escala para el equipo del partido.

**Registro de solicitudes de derechos ARCO** (acceso, rectificación, cancelación, oposición) —
requisito de Ley 21.719 aplicable a datos de funcionarios. Puede ser tan simple como un estado en
una tabla de solicitudes con SLA, no requiere un módulo grande, pero hoy no existe ningún lugar
donde quede trazado si alguien pidió corrección o eliminación de sus datos.

**Exportación de informes de fiscalización con registro reforzado** — dado que estos informes
pueden ser evidencia ante SERVEL, quién los generó y cuándo debería quedar auditado con el mismo
nivel que una escritura sensible, no como una lectura común.

---

## 3. Hoja de ruta priorizada

Orden pensado por dependencias reales, no solo por valor — varias fases del `CLAUDE.md` original
se reordenan porque tienen prerrequisitos que no estaban explícitos.

### Fase 0 — Bloqueante técnico (antes de tocar datos reales)
1. Desplegar backend con HTTPS + Postgres (host propio: Railway/Render/Fly o servidor del
   partido). Sin esto todo el resto vive en modo demo y no hay auditoría real.
2. `bootstrap_db.py` → secretos reales en `.env` (verificar que no queden defaults
   `CAMBIAR_...` en producción) → `VITE_API_URL` apuntando al backend → verificación.
3. Mínimo de CI: `tsc -b` + import del backend en cada push. Antes de agregar cifrado y RBAC
   granular es el momento más barato de meter esto — después cuesta más retrofit.

### Fase 1 — Datos sensibles (bloqueante para cargar sueldo/cuenta bancaria real)
1. Implementar cifrado en la app (Fernet/AES, clave por env) para `sueldo_base_cifrado`,
   `cuenta_bancaria_cifrada`, `renta_ref_cifrada`.
2. **Guard server-side**: rechazar escritura en esos campos si no hay clave de cifrado
   configurada — no confiar solo en "ya lo priorizamos".
3. `datos_previsionales` como entidad con permiso adicional, separado del resto de la ficha.
4. Auditoría de **lectura** de datos sensibles (no solo escritura) en `api/rrhh.py`.
5. Rol admin con acceso a datos sensibles, distinto del admin operativo.

### Fase 2 — Ausentismo + jefatura
1. Rol de jefatura (ver equipo, aprobar solicitudes).
2. Ausentismo (vacaciones/licencias/permisos) con saldo de feriado legal chileno — tratar el
   cálculo de feriado progresivo como lógica de negocio con tests, no como CRUD simple.
3. Autoservicio: solicitud de vacaciones/permisos con saldo visible.

### Fase 3 — Organigrama, historial de cargo, generador de documentos
1. `unidad_organizacional` + jefatura → vista de organigrama.
2. Historial de cargo (ya modelado, falta exponerlo).
3. Generador de documentos (certificados desde plantilla → PDF) **con gestión de plantillas
   desde admin**, no hardcodeada.
4. Autoservicio: descarga de certificados propios.

### Fase 4 — Informes de servicio
1. Dotación, contratos por vencer, ausentismo, saldo de vacaciones.
2. Informe para fiscalización SERVEL con auditoría reforzada de exportación.
3. Evaluar en este punto si separar reportería de tablas transaccionales — probablemente
   prematuro con ~9-20 personas, revisar solo si la dotación crece.

### Fase 5 — Transparencia y cumplimiento
1. Autoservicio: quién consultó mi ficha (usa `AuditLog` existente, sin desarrollo nuevo de
   backend, solo endpoint + vista filtrada).
2. Registro de solicitudes de derechos ARCO.
3. `seed_rrhh.py` para poblar `empleados` cuando la BD esté viva (mover de datos hardcodeados
   a seed real).

### Fase 6 — Deuda técnica y financiero (antes de reactivar `APP_SCOPE=full`)
1. **Fix bug Fondo Género** en `ModuloAlertas` (filtra una categoría inexistente → siempre da
   $0/déficit) — bloqueante para reactivar lo financiero, con test de regresión.
2. Reconciliar `cotizaciones2025` y `gastosOrdinarios2025` contra cartola/Libro Mayor.
3. Evaluar separación real del bundle financiero (dos apps) si el módulo financiero contiene
   datos o lógica no trivial — no basta con ocultar del sidebar.
4. Migrar `backend/attachments/` a object storage (S3/GCS) al desplegar.

---

## 4. Qué no cambia respecto al `CLAUDE.md` original

- El orden de valor funcional que ya tenían (contrato+cifrado primero) seguía siendo correcto;
  este documento lo mantiene, pero inserta prerrequisitos (CI, rol jefatura) que no estaban
  explícitos y que evitan retrabajo.
- No se toca `APP_SCOPE` ni se expone lo financiero — fase 6 es explícitamente "antes de
  reactivar", no una sugerencia de reactivarlo ahora.
- Las convenciones de §3 del CLAUDE.md (`tsc -b`, secretos, commits, login siempre humano)
  siguen aplicando sin cambios.
