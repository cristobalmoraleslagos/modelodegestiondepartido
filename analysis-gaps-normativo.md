# ANÁLISIS NORMATIVO: VACÍOS Y MEJORAS AL SISTEMA

Fecha de análisis: 2026-05-21

---

## VACÍOS CRÍTICOS IDENTIFICADOS

### 1. Modelo de datos — Deficiencias estructurales

#### `padron_militantes` — Datos insuficientes para auditoría SERVEL

El padrón actual no captura:
- `fecha_afiliacion` / `fecha_desafiliacion` — SERVEL exige trazabilidad temporal del militante activo al momento de cada cotización.
- `region` — requerido para informes territoriales desagregados (Art. 36 bis exige desglose por región).
- `genero` — necesario para el cruce con el Fondo de Género (Ley 20.900).
- `tipo_militante` — la Ley 18.603 distingue entre afiliado activo, militante en formación y afiliado suspendido.
- Historial de cambios de estado — sin esto no hay auditoría temporal posible.

#### `directiva_central` — Imposible resolver nepotismo automáticamente

El esquema almacena directivos pero no modela las relaciones de parentesco. El campo `es_pariente_directiva BOOLEAN` en `nomina_funcionarios` es un checkbox manual, no una validación automática. Esto es un riesgo legal grave: si alguien marca FALSE siendo pariente, el sistema no lo detecta.

#### `cotizaciones_consolidadas` — Sin control de período fiscal ni UF

- No hay `periodo_tributario` (año/mes) — imprescindible para los límites anuales de la Ley 19.884.
- No hay `monto_uf` ni `valor_uf_dia` — los topes legales son en UF, no en CLP.
- No hay `fecha_ingreso_sistema` (audit trail) separado de `fecha_contable`.
- No hay `usuario_validador` — quién aprobó la transacción.

#### `nomina_funcionarios` — Sin historial de remuneraciones

- Una sola fila por funcionario no permite registrar cambios de sueldo, cambios de cargo o licencias.
- No hay `fecha_contrato_inicio` / `fecha_contrato_termino`.
- No hay `prevision_social` (AFP/INP) — dato crítico para informes de cumplimiento laboral.

---

### 2. Vacíos en el pipeline ETL

#### Sin manejo de duplicados entre ejecuciones

El pipeline no define qué sucede si `staging_banco` recibe el mismo archivo bancario dos veces. Sin una clave de idempotencia a nivel de ingesta, se generan duplicados en `cotizaciones_consolidadas`.

#### Sin log de auditoría del pipeline

No existe tabla `etl_log` que registre: fecha de ejecución, registros procesados, registros rechazados, errores, usuario ejecutor. SERVEL puede solicitar la trazabilidad del proceso de carga.

#### Fuzzy matching sin scoring multivariable

El umbral fijo de 92% Levenshtein falla con nombres compuestos frecuentes en Chile (ej. "María José González" vs "María González"). Se necesita scoring con múltiples variables: RUT parcial, monto, fecha, nombre.

#### Sin manejo de devoluciones (chargebacks)

Un militante puede pedir devolución de una cotización erróneamente cobrada. El modelo no tiene tabla ni estado para reversiones contables auditables.

---

### 3. Vacíos legales específicos

#### Ley 19.884 — Topes en UF no implementados

Los topes legales son:
- Aporte máximo mensual por persona natural: 500 UF
- Aporte máximo anual por persona natural: 3.000 UF

El sistema valida en CLP pero el CLP fluctúa diariamente. Se necesita tabla `valor_uf_diario` o integración con la API CMF para la conversión al momento de la transacción.

#### Ley 20.900 — Fondo de Género subespecificado

El 10% aplica sobre el aporte estatal anual total recibido, no sobre el presupuesto interno. La propuesta no modela de dónde viene el dato del aporte estatal. Se necesita:
- Tabla `aportes_estatales` con el monto recibido por año/trimestre.
- Cálculo trimestral dado el Art. 36 bis, no solo anual.
- Tabla `presupuesto_genero_detalle` para registrar cada gasto imputable al fondo.

#### Ley 18.603 Art. 36 bis — Plazo de publicación sin alerta

El sistema no implementa un mecanismo de alerta para los 10 días hábiles post-trimestre. Los días hábiles en Chile excluyen feriados que varían por año. Se necesita tabla `calendario_feriados` o integración con API de feriados.cl.

#### Transparencia Activa — Sin módulo de exportación

SERVEL y el CPLT exigen exportación en formatos específicos (XML para SERVEL, PDF/CSV para CPLT). La propuesta no define ningún módulo de exportación.

---

### 4. Seguridad y privacidad (Ley 21.719 vigente desde 2025)

#### Datos personales sin cifrado

El esquema almacena RUTs, nombres completos y números de cuenta bancaria en texto plano. La Ley 21.719 exige:
- Cifrado de datos sensibles en reposo.
- Control de acceso basado en roles (RBAC).
- Registro de accesos a datos personales (audit log de consultas).

#### Sin RBAC definido

No hay modelo de roles: ¿quién puede aprobar cotizaciones? ¿quién puede contratar funcionarios? ¿quién puede exportar a SERVEL? Sin esto no se cumple el principio de separación de funciones exigido en auditorías.

---

## TABLA RESUMEN DE GAPS

| N | Area | Gap | Severidad | Accion requerida |
|---|------|-----|-----------|------------------|
| 1 | Datos | `padron_militantes` sin fecha afiliacion, region, genero | CRITICO | Agregar campos |
| 2 | Legal | Topes Ley 19.884 en CLP, deben ser en UF | CRITICO | Tabla valor_uf_diario + API CMF |
| 3 | Legal | Nepotismo validado por checkbox, sin relaciones modeladas | CRITICO | Tabla parentesco_directivos |
| 4 | ETL | Sin control de idempotencia en ingesta | ALTO | Hash de archivo en staging_banco |
| 5 | Datos | Sin historial de remuneraciones | ALTO | Tabla historial_remuneraciones |
| 6 | Legal | Fondo Genero sin detalle de gastos | ALTO | Tabla presupuesto_genero_detalle |
| 7 | Seguridad | RUTs y cuentas en texto plano | ALTO | Cifrado en reposo (AES-256) |
| 8 | Seguridad | Sin RBAC ni audit log | ALTO | Tablas usuarios_sistema + audit_log |
| 9 | ETL | Sin log de ejecuciones ETL | MEDIO | Tabla etl_log |
| 10 | Legal | Sin alerta de 10 dias habiles post-trimestre | MEDIO | Tabla calendario_feriados + cron |
| 11 | Legal | Sin modulo de exportacion para SERVEL/CPLT | MEDIO | Vista + exportador XML/CSV |
| 12 | Datos | Sin historial de cambios de estado militante | MEDIO | Tabla historial_estado_militante |
| 13 | Datos | Sin manejo de reversiones/devoluciones | MEDIO | Tabla reversiones_cotizacion |
| 14 | Legal | Aportes estatales no modelados | MEDIO | Tabla aportes_estatales |

---

## SCHEMA MEJORADO (POSTGRESQL)

```sql
-- UF diaria (integracion CMF/SII)
CREATE TABLE valor_uf_diario (
    fecha DATE PRIMARY KEY,
    valor_clp DECIMAL(10,2) NOT NULL
);

-- Calendario de feriados (para computo de dias habiles)
CREATE TABLE calendario_feriados (
    fecha DATE PRIMARY KEY,
    descripcion VARCHAR(100)
);

-- Aportes estatales anuales (base para calculo Fondo Genero)
CREATE TABLE aportes_estatales (
    aporte_id SERIAL PRIMARY KEY,
    anio SMALLINT NOT NULL,
    trimestre SMALLINT CHECK (trimestre BETWEEN 1 AND 4),
    monto_clp BIGINT NOT NULL,
    fecha_recepcion DATE NOT NULL,
    resolucion_referencia VARCHAR(100),
    UNIQUE (anio, trimestre)
);

-- Padron de militantes (ampliado)
CREATE TABLE padron_militantes (
    militante_id SERIAL PRIMARY KEY,
    rut VARCHAR(12) UNIQUE NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    genero VARCHAR(30) NOT NULL,
    region_id SMALLINT NOT NULL,
    comuna_militancia VARCHAR(100),
    tipo_militante VARCHAR(20) DEFAULT 'Activo',
    estado_cotizacion VARCHAR(20) DEFAULT 'Activo',
    fecha_afiliacion DATE NOT NULL,
    fecha_desafiliacion DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Historial de cambios de estado del militante
CREATE TABLE historial_estado_militante (
    historial_id SERIAL PRIMARY KEY,
    militante_id INT REFERENCES padron_militantes(militante_id),
    estado_anterior VARCHAR(50),
    estado_nuevo VARCHAR(50) NOT NULL,
    fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INT NOT NULL,
    motivo VARCHAR(255)
);

-- Directiva central
CREATE TABLE directiva_central (
    directivo_id SERIAL PRIMARY KEY,
    rut VARCHAR(12) UNIQUE NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    cargo VARCHAR(100) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_termino DATE
);

-- Relaciones de parentesco con directivos (validacion antinepotismo real)
CREATE TABLE parentesco_directivos (
    parentesco_id SERIAL PRIMARY KEY,
    directivo_id INT REFERENCES directiva_central(directivo_id),
    rut_pariente VARCHAR(12) NOT NULL,
    nombre_pariente VARCHAR(255) NOT NULL,
    grado_parentesco VARCHAR(30) NOT NULL,
    fecha_registro DATE NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

-- Cotizaciones consolidadas (ampliada)
CREATE TABLE cotizaciones_consolidadas (
    cotizacion_id SERIAL PRIMARY KEY,
    militante_id INT REFERENCES padron_militantes(militante_id),
    fecha_contable DATE NOT NULL,
    periodo_anio SMALLINT NOT NULL,
    periodo_mes SMALLINT NOT NULL,
    monto_clp INT NOT NULL,
    valor_uf_dia DECIMAL(10,2) NOT NULL,
    monto_uf DECIMAL(10,4) GENERATED ALWAYS AS (monto_clp / valor_uf_dia) STORED,
    canal_pago VARCHAR(30) NOT NULL,
    codigo_transaccion_banco VARCHAR(100) UNIQUE NOT NULL,
    staging_origen_id INT,
    usuario_validador_id INT,
    fecha_ingreso_sistema TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) DEFAULT 'Valida'
);

-- Reversiones contables (devoluciones/chargebacks)
CREATE TABLE reversiones_cotizacion (
    reversion_id SERIAL PRIMARY KEY,
    cotizacion_id INT REFERENCES cotizaciones_consolidadas(cotizacion_id),
    fecha_reversion DATE NOT NULL,
    motivo VARCHAR(50) NOT NULL,
    descripcion VARCHAR(255),
    usuario_autorizador_id INT NOT NULL
);

-- Staging bancario con control de idempotencia
CREATE TABLE staging_banco (
    staging_id SERIAL PRIMARY KEY,
    archivo_origen_hash VARCHAR(64) NOT NULL,
    fecha_proceso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_transaccion DATE NOT NULL,
    descripcion_cruda VARCHAR(255),
    monto_clp INT NOT NULL,
    codigo_transaccion_banco VARCHAR(100),
    estado_proceso VARCHAR(20) DEFAULT 'Pendiente',
    UNIQUE(archivo_origen_hash, codigo_transaccion_banco)
);

-- Cuenta de suspension (ampliada)
CREATE TABLE cuenta_suspension_banco (
    suspension_id SERIAL PRIMARY KEY,
    staging_id INT REFERENCES staging_banco(staging_id),
    fecha_transaccion DATE NOT NULL,
    descripcion_cruda_banco VARCHAR(255),
    monto_clp INT NOT NULL,
    codigo_transaccion_banco VARCHAR(100) UNIQUE,
    motivo_suspension VARCHAR(50) NOT NULL,
    estado_revision VARCHAR(20) DEFAULT 'Pendiente',
    militante_resuelto_id INT REFERENCES padron_militantes(militante_id),
    usuario_resolutor_id INT,
    fecha_resolucion TIMESTAMP
);

-- ETL Log de auditoria de procesos
CREATE TABLE etl_log (
    log_id SERIAL PRIMARY KEY,
    fecha_ejecucion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    archivo_procesado VARCHAR(255),
    archivo_hash VARCHAR(64),
    registros_ingesta INT DEFAULT 0,
    registros_validados INT DEFAULT 0,
    registros_suspendidos INT DEFAULT 0,
    registros_rechazados INT DEFAULT 0,
    usuario_ejecutor_id INT,
    resultado VARCHAR(20) NOT NULL,
    detalle_error TEXT
);

-- Nomina de funcionarios (sin sueldo, que va en historial)
CREATE TABLE nomina_funcionarios (
    funcionario_id SERIAL PRIMARY KEY,
    rut VARCHAR(12) UNIQUE NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    genero VARCHAR(30) NOT NULL,
    calidad_contractual VARCHAR(60) NOT NULL,
    fecha_contrato_inicio DATE NOT NULL,
    fecha_contrato_termino DATE,
    area_desempeno VARCHAR(30) NOT NULL,
    banco_id VARCHAR(50) NOT NULL,
    tipo_cuenta VARCHAR(20) NOT NULL,
    numero_cuenta VARCHAR(50) NOT NULL,
    es_pariente_directiva BOOLEAN DEFAULT FALSE,
    imputable_fondo_mujeres BOOLEAN DEFAULT FALSE,
    estado_activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Historial de sueldos (trazabilidad de remuneraciones)
CREATE TABLE historial_remuneraciones (
    historial_id SERIAL PRIMARY KEY,
    funcionario_id INT REFERENCES nomina_funcionarios(funcionario_id),
    sueldo_bruto_clp INT NOT NULL,
    fecha_vigencia_inicio DATE NOT NULL,
    fecha_vigencia_termino DATE,
    prevision_social VARCHAR(30) NOT NULL,
    tasa_afp DECIMAL(4,2) NOT NULL,
    usuario_autorizador_id INT NOT NULL
);

-- Detalle de gasto Fondo Genero (para computo del 10%)
CREATE TABLE presupuesto_genero_detalle (
    gasto_id SERIAL PRIMARY KEY,
    anio SMALLINT NOT NULL,
    trimestre SMALLINT CHECK (trimestre BETWEEN 1 AND 4),
    tipo_gasto VARCHAR(20) NOT NULL,
    descripcion VARCHAR(255),
    monto_clp INT NOT NULL,
    funcionario_id INT REFERENCES nomina_funcionarios(funcionario_id),
    fecha_gasto DATE NOT NULL,
    comprobante_referencia VARCHAR(100),
    usuario_registro_id INT NOT NULL
);

-- Roles y usuarios del sistema (RBAC)
CREATE TABLE usuarios_sistema (
    usuario_id SERIAL PRIMARY KEY,
    rut VARCHAR(12) UNIQUE NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    rol VARCHAR(20) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    ultimo_acceso TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit log de accesos (Ley 21.719)
CREATE TABLE audit_log_acceso (
    audit_id SERIAL PRIMARY KEY,
    usuario_id INT REFERENCES usuarios_sistema(usuario_id),
    accion VARCHAR(10) NOT NULL,
    tabla_afectada VARCHAR(100) NOT NULL,
    registro_id INT,
    ip_origen VARCHAR(45),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vista de exportacion trimestral SERVEL
CREATE VIEW v_informe_trimestral_cotizaciones AS
SELECT
    EXTRACT(YEAR FROM c.fecha_contable) AS anio,
    EXTRACT(QUARTER FROM c.fecha_contable) AS trimestre,
    m.rut,
    m.nombre_completo,
    m.region_id,
    SUM(c.monto_clp) AS total_clp,
    SUM(c.monto_uf) AS total_uf,
    COUNT(*) AS n_transacciones
FROM cotizaciones_consolidadas c
JOIN padron_militantes m ON c.militante_id = m.militante_id
WHERE c.estado = 'Valida'
GROUP BY 1, 2, 3, 4, 5;
```

---

## ARQUITECTURA DE TECNOLOGÍA PROPUESTA

### Stack recomendado

| Capa | Tecnología | Justificación |
|------|------------|---------------|
| Frontend | React 18 + TypeScript + Recharts | Requerido por el contexto original |
| Backend API | Node.js + Express o FastAPI (Python) | FastAPI si se implementa el ETL en Python |
| Base de datos | PostgreSQL 16 | ENUM flexible, GENERATED columns, mejor soporte JSON |
| ETL | Python + pandas + rapidfuzz | rapidfuzz implementa Levenshtein optimizado |
| Cifrado | pgcrypto (PostgreSQL extension) | Cifrado de RUTs y cuentas en la BD |
| Auth | JWT + RBAC middleware | Control de acceso por roles |
| Deploy | GitHub -> Vercel (frontend) + Railway/Render (backend+BD) | Costo bajo para proyecto GovTech |
| UF API | CMF Chile: api.cmfchile.cl | API oficial gratuita para valor UF diario |
| Feriados | feriados.cl o MinTrabajo | Para calculo de dias habiles |

### Flujo de despliegue

```
GitHub (main) -> GitHub Actions CI
    -> Vercel (deploy automatico frontend)
    -> Railway/Render (deploy automatico backend + migraciones)
```

---

## PRÓXIMOS PASOS DE IMPLEMENTACIÓN

1. **Fase 1 - Base de datos:** Ejecutar schema mejorado en PostgreSQL, scripts de migración versionados con Flyway o db-migrate.
2. **Fase 2 - ETL Python:** Pipeline de ingesta de cartolas con idempotencia, fuzzy matching con rapidfuzz, y validacion UF via API CMF.
3. **Fase 3 - API REST:** Endpoints para CRUD de militantes, funcionarios, cotizaciones y consultas de compliance.
4. **Fase 4 - Frontend React:** Dashboard con módulos de presupuesto, alerta género, formulario de contratación con validación antinepotismo.
5. **Fase 5 - Deploy:** Configurar GitHub Actions, Vercel y Railway.
6. **Fase 6 - Exportación SERVEL:** Generador de informes trimestrales en formato requerido por CPLT.
