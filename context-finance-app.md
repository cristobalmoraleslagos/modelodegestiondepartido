# CONTEXTO DE DESARROLLO: MÓDULO DE CONTROL FINANCIERO PARTIDARIO (CHILE)

## 1. OBJETIVO DEL SISTEMA
Desarrollar una solución GovTech interna para la gestión, control contable y cumplimiento normativo (Compliance) de un partido político en Chile, asegurando que la carga de datos de cotizaciones y remuneraciones se adecúe estrictamente a las auditorías del Servicio Electoral (SERVEL) y las obligaciones de Transparencia Activa.

## 2. MARCO LEGAL Y REGLAS DE NEGOCIO (CHILE)
- **Ley 18.603 (Art. 36 bis):** Obligación de publicar de manera permanente, desagregada y trimestral los balances, cotizaciones de afiliados y transferencias. Actualización obligatoria dentro de los primeros 10 días hábiles del término de cada trimestre (Instrucción General N° 12 CPLT).
- **Ley 18.603 (Art. 39 bis - Nepotismo):** Prohibición absoluta de contratar con fondos públicos a cónyuges, convivientes civiles o parientes hasta el segundo grado de consanguinidad o afinidad de los miembros de la directiva central del partido.
- **Ley 20.900 (Fondo de Género):** Obligación de destinar al menos el 10% del total del aporte estatal anual al fomento de la participación política de las mujeres. Su incumplimiento rechaza el balance anual.
- **Ley 19.884 (Límites y Origen):** Prohibición total de aportes de personas jurídicas (empresas). Control estricto de topes de aportes mensuales/anuales en UF por persona natural. Separación de cuentas de gasto regular vs. gasto de campaña.

## 3. ARQUITECTURA DEL PIPELINE ETL (INGESTA DE COTIZACIONES)
1. **Extract (Ingesta):** Lectura automatizada de cartolas bancarias (CSV/Excel) e inserción en tabla intermedia `staging_banco`.
2. **Transform (Sanitización y Match):**
   - Limpieza mediante Expresiones Regulares (Regex) para aislar RUTs del campo descripción/comentarios.
   - **Matching Engine en cascada:** 1) Match exacto por RUT; 2) Match por ID de Pago; 3) Fuzzy Matching (algoritmo Levenshtein > 92%) sobre nombres.
   - Si la coincidencia falla, el registro se aísla en `cuenta_suspension_banco` para cuadratura contable manual.
3. **Validate (Compliance):** Consulta SQL de acumulados anuales por RUT para bloquear aportes sobre los límites legales de la Ley 19.884.
4. **Load (Carga):** Escritura indexada en `cotizaciones_consolidadas`.

## 4. MODELO DE DATOS ESENCIAL (POSTGRESQL)

```sql
CREATE TABLE padron_militantes (
    militante_id SERIAL PRIMARY KEY,
    rut VARCHAR(12) UNIQUE NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    comuna_militancia VARCHAR(100),
    estado_cotizacion VARCHAR(20) DEFAULT 'Activo'
);

CREATE TABLE directiva_central (
    directivo_id SERIAL PRIMARY KEY,
    rut VARCHAR(12) UNIQUE NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    cargo VARCHAR(100) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_termino DATE
);

CREATE TABLE cotizaciones_consolidadas (
    cotizacion_id SERIAL PRIMARY KEY,
    militante_id INT REFERENCES padron_militantes(militante_id),
    fecha_contable DATE NOT NULL,
    monto_clp INT NOT NULL,
    canal_pago VARCHAR(30),
    codigo_transaccion_banco VARCHAR(100) UNIQUE
);

CREATE TABLE cuenta_suspension_banco (
    suspension_id SERIAL PRIMARY KEY,
    fecha_transaccion DATE NOT NULL,
    descripcion_cruda_banco VARCHAR(255),
    monto_clp INT NOT NULL,
    codigo_transaccion_banco VARCHAR(100) UNIQUE,
    estado_revision VARCHAR(20) DEFAULT 'Pendiente'
);

CREATE TABLE nomina_funcionarios (
    funcionario_id SERIAL PRIMARY KEY,
    rut VARCHAR(12) UNIQUE NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    calidad_contractual VARCHAR(50) NOT NULL,
    sueldo_bruto_clp INT NOT NULL,
    banco_id VARCHAR(50) NOT NULL,
    tipo_cuenta VARCHAR(20) NOT NULL,
    numero_cuenta VARCHAR(50) NOT NULL,
    es_pariente_directiva BOOLEAN DEFAULT FALSE,
    imputable_fondo_mujeres BOOLEAN DEFAULT FALSE,
    area_desempeno VARCHAR(30) NOT NULL,
    estado_activo BOOLEAN DEFAULT TRUE
);
```

## 5. REQUISITOS DEL DASHBOARD FRONTEND (REACT + RECHARTS)
- Módulo Presupuestario: Vista de ingresos combinados (Aportes Estatales vs. Cotizaciones Internas).
- Alerta de Género (Ley 20.900): Gráfico de progreso que compute el 10% del fondo estatal recibido y gatille una alerta visual (roja/amarilla) si el gasto ejecutado en el ítem Mujeres está bajo la cuota legal.
- Módulo de Personal / Formulario de Contratación:
  - Formulario para añadir registros a `nomina_funcionarios`.
  - Validación lógica inmediata: Si `es_pariente_directiva` es TRUE, bloquear el envío del formulario con la advertencia: "CONTRATACION RECHAZADA: Infracción al Art. 39 bis de la Ley 18.603."
  - Barra de consumo del presupuesto mensual total de sueldos.
