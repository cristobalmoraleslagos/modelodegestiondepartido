# Onboarding del modelo FinParty para Claude Cowork

> Documento de traspaso de contexto. Trabajaré este proyecto entre **Claude Code**
> (en mi máquina, donde están los datos reales) y **Claude Cowork**. Esta guía le da
> a Cowork lo que necesita para ser productivo de inmediato sin re-derivar el contexto.

---

## 1. Qué es el proyecto

**FinParty** — sistema de **control financiero y compliance** del **Partido Comunista de Chile**
(PCCh, RUT **71.701.800-1**, SERVEL **PP007**). Su objetivo es preparar y resguardar la
**rendición de cuentas ante SERVEL** y dar trazabilidad a ingresos, gastos, honorarios,
contratos y balances.

**Marco normativo** que cumple: DFL N°4/2017 (Ley 18.603, partidos), DFL N°3/2017 (Ley 19.884,
gasto electoral), Ley 20.900, Ley 21.719 (datos personales).

Repo GitHub: `cristobalmoraleslagos/modelodegestiondepartido` · rama principal: **master**.

---

## 2. Stack y arquitectura

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Frontend | **React + Vite + TypeScript** (`frontend/`) | Despliega en Vercel (`modelodegestiondepartido.vercel.app`), auto-deploy desde `master`. Sin backend en ese despliegue → usa datos hardcodeados/`localStorage` como fallback. |
| Backend | **FastAPI + SQLAlchemy 2.0 + PostgreSQL** (`backend/`) | API REST + pipeline de ingesta por correo. Requiere Postgres (docker-compose). No está desplegado en producción aún. |
| Procesamiento | **Python** (`procesadores/`) | Parsea datos SII/Defontana/Transparencia → CSV/JSON en `procesadores/output/` y genera la minuta `.docx`. |

El frontend habla con el backend **solo si** `VITE_API_URL` está definida; si no, degrada con gracia.

---

## 3. Mapa del repositorio

```
frontend/            React+Vite+TS (la app que ve el usuario)
  src/
    components/      Hubs y Módulos (HubIngresos, ModuloDonaciones, HubIntranet, …)
    data/            Datos canónicos del modelo (.ts): defontana, donaciones, activos,
                     gastos_historico, bhe_historico, balance, personal, prestamos…
    exporters/       servel.ts → genera los archivos de rendición SERVEL (M6,M12,M13,M14,M15,M16,M17)
    api.ts           Cliente HTTP (fetch) + helpers autenticados (authGet/authSend/authUpload)
    auth.ts          Sesión intranet (login dual: backend real / fallback demo)
    utils.ts         APORTES_ESTATALES, fmt(), constantes
backend/             FastAPI
  api/main.py        App + endpoints de analítica
  api/intranet.py    Intranet: auth, BHE, contratos, informes, rendición
  api/security.py    bcrypt + JWT + RBAC + auditoría
  db/models.py       Modelos SQLAlchemy (incl. Usuario, Contrato, DocumentoCargado, AuditLog)
  SECURITY.md        Modelo de seguridad de la intranet
procesadores/        Scripts Python
  validar_todo.py    32 validaciones cruzadas del modelo (correr siempre tras tocar datos)
  gen_minuta.py      Genera la minuta de levantamiento (.docx)
  auditoria_integral.py  Cruce SII ↔ Defontana ↔ modelo
  output/            Salidas procesadas (CSV/JSON) — fuente para frontend y minuta
scraper_transparencia/  Araña del Portal Transparencia SERVEL + run_modulo_transparencia.py
ORGANIZACION-DATOS.md   Mapa de las carpetas de datos por fuente
AUDITORIA-INTEGRAL-2026-06.md  Informe de auditoría del modelo
```

### Carpetas de datos (NO versionadas — están en `.gitignore`)
- `ARCHIVOS SII/` — BHE (.xls), F29 (.xlsx), RCV (.csv).
- `DEFONTANA/` — Libro Mayor, Balances, Estado Situación, Flujo de Caja, Contabilización.
- `scraper_transparencia/Extraccion_Completa_PP007/` — 24 módulos de Transparencia.
- `ENTREGA_TRANSPARENCIA_PP007/` — paquete ordenado para compartir.
- `backend/attachments/`, `backend/rendicion/` — uploads y rendiciones generadas.

> **Importante para Cowork:** estos datos viven en mi máquina local y **no están en GitHub**.
> Si Cowork necesita operarlos, hay que **subirlos explícitamente** a Cowork (ver §7).

---

## 4. Las 3 fuentes de datos

| Fuente | Qué aporta | Dónde |
|--------|-----------|-------|
| **SII** | BHE (1.390 honorarios), RCV (1.971 compras), F29, M12 (gastos) | `ARCHIVOS SII/` → procesado en `procesadores/output/` |
| **Defontana** (ERP contable) | Libro Mayor 2024/2025, EEFF, balances, ingresos (grupo 3) | `DEFONTANA/` |
| **Transparencia SERVEL** | 24 módulos (ingresos, gastos, cotizaciones, sanciones, balances aprobados…) | `scraper_transparencia/` |

---

## 5. Cómo correr cada cosa

```bash
# Frontend (dev)
cd frontend && npm install && npm run dev          # Vite (default :5173)

# Typecheck (OJO: usar tsc -b, NO tsc --noEmit — ver §6)
cd frontend && npm run typecheck                   # = tsc -b
cd frontend && npm run build                       # tsc -b && vite build

# Validadores del modelo (correr SIEMPRE tras tocar datos)
python procesadores/validar_todo.py                # 32 checks, deben quedar en verde

# Generar la minuta de levantamiento (.docx)
python procesadores/gen_minuta.py                  # → Minuta-Diagnostico-SII-PCCh.docx

# Backend + Intranet (requiere Postgres)
cd backend && docker-compose up -d db
pip install -r requirements.txt
export JWT_SECRET=$(openssl rand -hex 32)
export ADMIN_USER=admin@pcch.cl ADMIN_PASS='ClaveFuerte123'
python seed_admin.py                               # crea el admin (idempotente)
uvicorn api.main:app --reload                      # API en :8000
# y en el frontend: VITE_API_URL=http://localhost:8000 npm run dev
```

---

## 6. Convenciones críticas (no romper)

1. **Typecheck = `tsc -b`** (no `tsc --noEmit`). El `tsconfig.json` raíz tiene `files: []` con
   project references, así que `tsc --noEmit` es un **no-op** que NO detecta errores. El script
   `build` ya usa `tsc -b && vite build`, por lo que un error de tipos rompe el deploy.
2. **Secretos: NUNCA en el código.** `JWT_SECRET`, `DB_PASSWORD`, claves SII/IMAP y `VITE_PASS_*`
   van por variables de entorno. `backend/.env` y `frontend/.env.local` están en `.gitignore` y
   **no deben commitearse jamás**.
3. **Datos reales no se versionan** (están gitignored). El repo lleva **código + documentos**, no
   los `.xls/.csv/.xlsx` fuente ni los uploads.
4. **Commits:** ramear desde `master` si corresponde; mensajes en español, terminar con
   `Co-Authored-By: Claude <noreply@anthropic.com>`. Commitear/pushear solo cuando se pide.
5. **Datos ficticios eliminados:** `donaciones.ts` y `activos.ts` ya se reemplazaron por datos
   reales. Queda **`prestamos.ts` con datos inventados** (5 préstamos) pendiente de reemplazar.
6. Tras tocar cualquier dato del modelo, correr `validar_todo.py` y `tsc -b`.

---

## 7. Cómo trabajar entre Claude Code y Cowork

| | **Claude Code (local)** | **Claude Cowork** |
|---|---|---|
| Acceso a datos reales | ✅ (en mi máquina) | ❌ salvo que yo los suba |
| Ejecutar backend/Postgres, scrapers | ✅ | limitado |
| Edición de código del repo | ✅ | ✅ (sobre lo que esté en Cowork/GitHub) |
| Mejor para | implementar, correr, parsear datos sensibles | redactar, analizar, documentos, planificar, revisar |

**La fuente de verdad del código es GitHub (`master`).** Flujo sugerido:
- Cambios de **código** → se commitean en Claude Code y se pushean; Cowork trabaja sobre el repo sincronizado.
- Para que Cowork analice **datos**, subir a Cowork solo lo necesario y **anonimizado/agregado** cuando contenga PII (RUT/nombres). Los `.docx` de minuta y los CSV de `procesadores/output/` son buenos artefactos para compartir sin exponer los `.xls` crudos.
- **No subir a Cowork** `.env`, contraseñas, ni los originales con PII completa sin necesidad.

---

## 8. Estado actual (qué hay con certeza)

- Contabilidad Defontana **2024 y 2025 completa y cuadrada**; **2022 y 2023 sin contabilizar**.
- SERVEL tiene balances **aprobados solo hasta 2021** (backlog 2022-2025).
- Aporte estatal confirmado: **2023 = $345.788.634**, **2024 = $549.691.607**, **2025 = $0**
  (Transparencia módulo 11 + Defontana). Monto exacto 2023 a reconfirmar con cartola.
- Datos consolidados de las 3 fuentes (ingresos, gastos, donaciones, gasto electoral) 2016-2026.
- **Módulo Intranet** (auth real bcrypt/JWT/RBAC, carga BHE con anuladas, contratos, informes,
  generación de carpeta de rendición) construido y verificado (`tsc -b`, build, import backend,
  parser BHE, validadores — todo verde).

### Pendientes principales
1. Contabilizar 2022/2023 en Defontana (faltan **cartolas bancarias**).
2. Reconfirmar aporte 2023 con cartola Banco Estado.
3. Cuota de género 2023 (posible incumplimiento: gastó $22,1M vs requerido $34,6M).
4. F29 Jun-Dic 2025 (~$23,3M) sin declarar.
5. Convenio "Progreso" $4.262M (origen + 338 cuotas).
6. Reemplazar `prestamos.ts` ficticio por el crédito real ($480M Banco Estado, nov-2025).
7. Probar el flujo intranet end-to-end con Postgres real.

---

## 9. Documentos de referencia (en el repo)

- `AUDITORIA-INTEGRAL-2026-06.md` — auditoría del modelo y completitud de fuentes.
- `ORGANIZACION-DATOS.md` — estructura de las carpetas de datos por fuente.
- `backend/SECURITY.md` — modelo de seguridad de la intranet.
- `Minuta-Diagnostico-SII-PCCh.docx` (gitignored, regenerable) — levantamiento de información.
- Memoria del proyecto (Claude Code): `project_finparty.md`.

---

*Mantener este documento al día cuando cambie el stack, las convenciones o el estado.*
