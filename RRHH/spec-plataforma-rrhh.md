# Especificación funcional — Plataforma intranet de RRHH

Documento de entrada para desarrollo con Claude Code. Define alcance, modelo de datos, módulos y reportes de una plataforma de RRHH con gestión documental por funcionario/a y generación de informes de servicio.

## 1. Objetivo

Construir una plataforma que centralice la información de personas de la organización, permita gestionar documentación asociada a cada funcionario/a (carpeta digital), y genere informes de servicio y reportería de RRHH bajo control de acceso por rol.

## 2. Alcance (MVP vs. fases posteriores)

**MVP**
- Ficha de funcionario/a (datos personales, contractuales, previsionales)
- Carpeta documental por persona con carga y versionado de archivos
- Generación de documentos desde plantillas (certificados, contratos)
- Informes de servicio básicos (dotación, contratos por vencer, ausentismo)
- Roles y permisos (Admin RRHH, Jefatura, Autoservicio del funcionario)
- Registro de auditoría de accesos y cambios

**Fase 2**
- Gestión de vacaciones y permisos con flujo de aprobación
- Evaluaciones de desempeño
- Organigrama dinámico
- Notificaciones automáticas (vencimientos de contrato, documentos, exámenes)

**Fase 3**
- Reclutamiento y selección (vacantes, postulantes, conversión a ficha)
- Integración con sistema de remuneraciones (si es externo)
- Dashboard analítico con series históricas

## 3. Modelo de datos (entidades principales)

### 3.1 `empleado`
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| rut / documento_identidad | string | único |
| nombres, apellidos | string | |
| fecha_nacimiento | date | |
| genero | enum | opcional |
| email_personal, email_corporativo | string | |
| telefono, direccion | string | |
| contacto_emergencia | jsonb | nombre, relación, teléfono |
| estado | enum | activo, inactivo, licencia, desvinculado |
| fecha_ingreso, fecha_egreso | date | |
| foto_url | string | |
| created_at, updated_at, updated_by | metadata | trazabilidad obligatoria |

### 3.2 `contrato`
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| empleado_id | FK | |
| tipo_contrato | enum | indefinido, plazo fijo, honorarios, por obra |
| cargo | string | |
| unidad_id | FK | referencia a `unidad_organizacional` |
| jefatura_directa_id | FK | referencia a `empleado` |
| jornada | enum | completa, parcial, teletrabajo |
| fecha_inicio, fecha_termino | date | fecha_termino null si es indefinido |
| sueldo_base | numeric | considerar encriptación a nivel de columna |
| centro_costo | string | |
| documento_url | string | contrato firmado (repositorio documental) |
| estado | enum | vigente, terminado, anexado |

### 3.3 `historial_cargo`
Registra cambios de cargo, unidad, jefatura o renta a lo largo del tiempo (promociones, traslados). Permite reconstruir la trayectoria de la persona sin sobrescribir datos.

### 3.4 `documento`
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| empleado_id | FK | |
| tipo_documento | enum | contrato, anexo, certificado, licencia médica, evaluación, otro |
| nombre_archivo | string | |
| url_almacenamiento | string | referencia a storage (S3, GCS, etc.) |
| version | int | |
| confidencialidad | enum | estándar, sensible (salud, previsión, banco) |
| fecha_carga | timestamp | |
| cargado_por | FK empleado/usuario | |

### 3.5 `ausentismo`
Cubre vacaciones, licencias médicas y permisos. Incluye tipo, fecha inicio/fin, días, estado de aprobación, aprobador, documento de respaldo.

### 3.6 `datos_previsionales`
Tabla separada (no embebida en `empleado`) para AFP/mutual/isapre-fonasa u equivalente local, número de cuenta bancaria, forma de pago. Se recomienda aislarla con permisos más estrictos que el resto de la ficha.

### 3.7 `unidad_organizacional`
Estructura jerárquica (área, departamento, jefatura) usada para organigrama y reportes de dotación por unidad.

### 3.8 `usuario` y `rol`
Usuarios del sistema (no necesariamente 1:1 con `empleado`, aunque en autoservicio sí lo son). Roles sugeridos: `admin_rrhh`, `jefatura`, `autoservicio`, `auditor` (solo lectura de logs).

### 3.9 `log_auditoria`
Registro inmutable de accesos y modificaciones: usuario, acción, entidad afectada, timestamp, IP. Obligatorio para datos sensibles.

## 4. Módulos funcionales

1. **Ficha de funcionario/a** — CRUD de `empleado`, `contrato`, `historial_cargo`.
2. **Carpeta documental** — carga, versionado, categorización y descarga de `documento`, con control de confidencialidad.
3. **Generador de documentos** — motor de plantillas (ej. Handlebars/Jinja) que combina plantilla + datos de `empleado`/`contrato` para emitir certificados y contratos en PDF.
4. **Ausentismo** — solicitud, aprobación y saldo de vacaciones/permisos/licencias.
5. **Organigrama** — vista jerárquica basada en `unidad_organizacional` y `jefatura_directa_id`.
6. **Informes de servicio** — ver sección 5.
7. **Autoservicio** — portal donde el/la funcionario/a ve su propia ficha, descarga certificados y hace solicitudes.
8. **Administración** — gestión de usuarios, roles, plantillas y parámetros del sistema.

## 5. Informes de servicio (reportería)

Cada informe debe soportar filtros (fecha, unidad, tipo de contrato, estado), exportación a PDF/Excel, y quedar registrado en `log_auditoria` (quién lo generó y cuándo).

| Informe | Fuente de datos | Uso típico |
|---|---|---|
| Dotación (headcount) | `empleado` + `contrato` | Vigencia por área, fecha de corte |
| Contratos por vencer | `contrato.fecha_termino` | Alertas de renovación |
| Rotación / antigüedad | `empleado.fecha_ingreso/egreso` | Tasa de rotación, permanencia promedio |
| Ausentismo | `ausentismo` | Tasa por tipo, tendencia mensual |
| Saldo de vacaciones | `ausentismo` | Riesgo de acumulación excesiva |
| Certificado de renta / antigüedad | `empleado` + `contrato` | Documento individual, no agregado |
| Cumplimiento de capacitación | módulo fase 2 | Vencimientos de certificaciones obligatorias |
| Informe para fiscalización | `contrato` + `ausentismo` | Respaldo ante organismo regulador local |

## 6. Seguridad y control de acceso

- **RBAC** por rol descrito en 3.8; adicionalmente, un funcionario solo accede a su propia ficha vía autoservicio.
- **Segregación de datos sensibles**: `datos_previsionales` y documentos de salud requieren permiso explícito adicional, distinto del acceso general a la ficha.
- **Auditoría obligatoria** en lectura y escritura de datos sensibles (no solo escritura).
- **Cifrado**: en tránsito (TLS) y en reposo para columnas sensibles (sueldo, cuenta bancaria, datos de salud).
- **Retención y eliminación**: definir política de retención documental según normativa local y plazos legales de conservación de contratos/licencias.
- **Cumplimiento normativo**: si aplica en Chile, considerar Ley 19.628 sobre protección de datos personales (y su actualización reciente hacia estándar tipo GDPR) y requisitos de la Dirección del Trabajo para respaldo de informes.

## 7. Consideraciones de arquitectura para Claude Code

- Separar la capa de reportería de las tablas operacionales (vistas materializadas o réplica de solo lectura) para que la generación de informes no compita con las operaciones transaccionales cuando crezca la dotación.
- Almacenamiento de documentos fuera de la base relacional (object storage) con la BD guardando solo referencias y metadata.
- Motor de plantillas desacoplado del módulo de ficha, para poder agregar nuevos tipos de certificado sin tocar el modelo de datos.
- Diseñar `documento` y `datos_previsionales` como entidades separadas desde el inicio — evita una migración dolorosa después para aplicar permisos diferenciados.
- Feature flags o configuración por módulo, dado que el alcance está pensado en fases (MVP → fase 2 → fase 3).

## 8. Preguntas abiertas para definir antes de implementar

- ¿La plataforma calculará remuneraciones o solo almacenará/mostrará liquidaciones generadas externamente?
- ¿Un solo tenant (una empresa) o multi-tenant (varias empresas/clientes)?
- ¿Qué proveedor de almacenamiento de archivos se usará (S3, GCS, almacenamiento local)?
- ¿Existe un sistema de remuneraciones o control de asistencia externo con el que haya que integrarse (API)?
- ¿Jurisdicción única o múltiple? Afecta campos previsionales, feriados, cálculo de vacaciones y normativa de retención.
