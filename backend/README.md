# FinParty Backend — Pipeline de Ingesta Financiera

**Partido Comunista de Chile · RUT 71.701.800-1**  
Versión 1.0 · Mayo 2026 · Confidencial

---

## ¿Qué hace este sistema?

Lee diariamente el correo de finanzas del partido, extrae automáticamente la información financiera (boletas de honorarios, facturas, cartolas bancarias, nóminas PREVIRED) y la carga en una base de datos PostgreSQL local.

```
Correo finanzas → IMAP → Parser → PostgreSQL → Dashboard Frontend
```

---

## Arquitectura

```
backend/
├── docker-compose.yml     ← PostgreSQL 16 + pgAdmin 4
├── requirements.txt       ← Dependencias Python
├── .env.example           ← Plantilla de configuración
├── config.py              ← Carga y expone variables de entorno
├── main.py                ← Punto de entrada (una vez / daemon)
├── pipeline.py            ← Orquestador principal
├── email_reader.py        ← Lector IMAP
├── setup.py               ← Instalación automática
├── run_daily.bat          ← Ejecutor Windows (Programador de Tareas)
├── run_daily.sh           ← Ejecutor Linux/macOS (crontab)
├── db/
│   ├── database.py        ← Motor SQLAlchemy
│   ├── models.py          ← Tablas PostgreSQL
│   └── loader.py          ← Carga con deduplicación y auditoría
├── parsers/
│   ├── dte_xml.py         ← Parser XML (BHE + Factura Electrónica)
│   ├── pdf_extractor.py   ← Parser PDF (pdfplumber)
│   └── excel_extractor.py ← Parser Excel (PREVIRED, Cartolas)
├── logs/                  ← Logs de ejecución
└── attachments/           ← Copia local de adjuntos procesados
```

---

## Instalación (primera vez)

### Requisitos previos
- Python 3.10 o superior
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y corriendo
- Git (para clonar el repositorio)

### Pasos

```bash
# 1. Ir al directorio backend
cd backend/

# 2. (Recomendado) Crear entorno virtual
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# 3. Ejecutar setup automático
python setup.py
```

El setup:
- Instala todas las dependencias Python
- Crea `.env` desde `.env.example`
- Levanta PostgreSQL + pgAdmin con Docker
- Crea las tablas en la BD

### Configurar credenciales

Editar el archivo `.env` generado:

```env
# Correo IMAP del partido
IMAP_HOST=imap.gmail.com
IMAP_USER=finanzas@pcch.cl
IMAP_PASSWORD=xxxx-xxxx-xxxx-xxxx   ← Contraseña de aplicación Gmail

# A quién enviar el resumen diario
NOTIF_DESTINATARIOS=cristobal.morales@pcch.cl,alejandro.urquiza@pcch.cl
```

> **Gmail**: Ir a Cuenta → Seguridad → Contraseñas de aplicación → Generar

---

## Uso

```bash
# Probar conexiones sin procesar nada
python main.py --test

# Ejecutar el pipeline UNA VEZ (ahora)
python main.py

# Modo demonio: ejecutar diariamente a las 07:00
python main.py --daemon
```

### Automatización en Windows

1. Abrir **Programador de Tareas**
2. Crear tarea básica → Diaria → Hora: 07:00
3. Acción: Iniciar programa → `run_daily.bat`
4. Marcar "Ejecutar tanto si el usuario inició sesión como si no"

---

## Base de datos

### Acceder con pgAdmin
- URL: http://localhost:5050
- Usuario: `admin@pcch.cl`
- Contraseña: `admin2026!`
- Servidor: `finparty_db` → puerto 5432 → BD `finparty`

### Tablas principales

| Tabla | Contenido |
|-------|-----------|
| `emails_procesados` | Log de cada correo revisado |
| `documentos_cargados` | Cada adjunto parseado (BHE, facturas, etc.) |
| `uf_historica` | Valores UF sincronizados diariamente |
| `personal_nomina` | Nómina de trabajadores y honorarios |
| `retenciones_f29` | Control de obligaciones F29 por período |
| `movimientos_bancarios` | Cartolas bancarias parseadas |
| `audit_log` | Registro inmutable de todas las operaciones |

### Consultas útiles

```sql
-- Documentos pendientes de revisión manual
SELECT tipo, rut_emisor, nombre_emisor, monto_bruto, confidence_score, archivo_nombre
FROM documentos_cargados
WHERE estado = 'pendiente_revision'
ORDER BY fecha_carga DESC;

-- Resumen de retenciones por período
SELECT periodo, total_honorarios, total_retencion, estado
FROM retenciones_f29
ORDER BY periodo DESC;

-- UF de los últimos 30 días
SELECT fecha, valor FROM uf_historica
ORDER BY fecha DESC LIMIT 30;

-- Documentos de hoy
SELECT tipo, nombre_emisor, monto_bruto, estado, confidence_score
FROM documentos_cargados
WHERE DATE(fecha_carga) = CURRENT_DATE
ORDER BY fecha_carga DESC;
```

---

## Sistema de Confianza (confidence_score)

| Rango | Estado | Acción |
|-------|--------|--------|
| ≥ 0.80 | `cargado` | Cargado automáticamente |
| 0.50–0.79 | `pendiente_revision` | Requiere aprobación manual en pgAdmin |
| < 0.50 | `pendiente_revision` | Revisar urgente — datos incompletos |

Los documentos con `confidence_score < 0.80` se cargan con `estado = 'pendiente_revision'` y se incluyen en el resumen diario por email.

---

## Tipos de documentos soportados

| Tipo | Extensión | Confianza | Descripción |
|------|-----------|-----------|-------------|
| **BHE** | `.xml` | 0.95–1.00 | Boleta Honorarios Electrónica (SII) |
| **FACTURA** | `.xml` | 0.95–1.00 | Factura Electrónica DTE Tipo 33/34 |
| **BHE PDF** | `.pdf` | 0.80–0.90 | Boleta en PDF (cuando no hay XML) |
| **CARTOLA** | `.pdf`/`.xlsx` | 0.75–0.85 | Cartola bancaria |
| **PREVIRED** | `.xlsx` | 0.85–0.95 | Nómina cotizaciones previsionales |
| **F29 TGR** | `.pdf` | 0.70–0.85 | Comprobante pago impuestos SII |
| **PDF escaneado** | `.pdf` | 0.10–0.30 | Requiere OCR manual |

---

## Gestionar la BD Docker

```bash
# Detener (sin borrar datos)
docker compose down

# Iniciar
docker compose up -d

# Ver logs de PostgreSQL
docker logs finparty_db

# Backup de la BD
docker exec finparty_db pg_dump -U finparty_user finparty > backup_$(date +%Y%m%d).sql

# Restaurar backup
docker exec -i finparty_db psql -U finparty_user finparty < backup_20260525.sql
```

---

## Notas de seguridad

- El archivo `.env` **nunca** se sube a Git (está en `.gitignore`)
- Las contraseñas de la BD se cambian modificando `docker-compose.yml` y `.env` en conjunto
- El `audit_log` es inmutable por diseño — no tiene operación UPDATE ni DELETE en el código
- Para Gmail, usar siempre **Contraseñas de Aplicación** (no la contraseña de la cuenta)

---

*FinParty · PCCh · Confidencial · Ley 21.719 Protección de Datos Personales*
