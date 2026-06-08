# Organización de las carpetas de datos — FinParty PCCh

Estructura **por fuente de origen → tipo de documento**. Las carpetas de datos
están en `.gitignore` (no se versionan); solo se versiona el código que las procesa.

## 🟦 `ARCHIVOS SII/` — Servicio de Impuestos Internos
| Subcarpeta | Contenido | Lo lee |
|-----------|-----------|--------|
| `BHE/{2022..2025}/` | Boletas de honorarios (.xls mensual/anual + .cgi) | `config.py → DIR_BHE` (bhe_parser) |
| `F29/` | Resultados Formularios de Impuesto 2022-2025 (.xlsx) | `config.py → DIR_F29`, gen_minuta, validar_todo |
| `Registro de Compra y Ventas/2026/` | RCV mensual 2022-2026 (.csv) | `config.py → DIR_RCV` (rcv_resumen) |

## 🟥 `DEFONTANA/` — ERP contable del partido
| Subcarpeta | Contenido | Lo lee |
|-----------|-----------|--------|
| `Libro Mayor/` | LIBRO MAYOR 2023-2026.CSV (asientos) | `auditoria_integral.py` (recursivo) |
| `Balances/` | Balance Comprobación, Balance General, Balance Defontana (.xlsx/.pdf) | — |
| `Estado Situacion/` | Estado-Situacion-Financiera 2023-2025 (.xlsx) | `auditoria_integral.py` (recursivo) |
| `Flujo de Caja/` | Flujo de Caja (.xlsx) | — |
| `Contabilizacion/` | Contabilizacion_2023_Defontana.xlsx (borrador generado) | `gen_contabilizacion_defontana.py` (escribe) |

> Las lecturas de DEFONTANA son **recursivas** (`glob(**)`), así que reorganizar
> subcarpetas no rompe el código.

## 🟩 `scraper_transparencia/Extraccion_Completa_PP007/` — Portal Transparencia SERVEL
| Subcarpeta / archivo | Contenido | Lo lee |
|----------------------|-----------|--------|
| `01..24_*.xlsx` | Los 24 módulos oficiales (cada módulo = un tipo de documento) | análisis ad-hoc |
| `_csvs/` | CSVs crudos del scraper | `config.py → DIR_SCRAPER` |
| `_reextraidos_fix/` | Re-extracciones corregidas (MOD10/13/16 con fix del bug) | `run_modulo_transparencia.py` |
| `screenshots/` | Capturas de cada módulo | — |

## 🗄️ `_ARCHIVO/` — Descartados (no borrados, por seguridad)
| Subcarpeta | Contenido | Motivo |
|-----------|-----------|--------|
| `Defontana_libromayor_viejo/` | Informe_Libro_Mayor 20231129* (.CSV) | Export antiguo, superado por LIBRO MAYOR YYYY.CSV |
| `Pitrufquen_ajeno/` | bep*.pdf | Municipalidad de Pitrufquén — NO es del PCCh |
| `minutas_viejas/` | Minuta-...-v2.docx | Versión fallback antigua (regenerable) |

## ⚙️ Salidas procesadas (versionadas) — `procesadores/output/`
`bhe_todas.json` · `M12_Gastos/` · `RCV_Resumen/` · `Transparencia_M11_ingresos_detalle.csv` ·
`Transparencia_M16_gastos_campana.csv` · `Transparencia_M6_ingresos.csv` · `Nomina_Contrataciones/`

---
*Duplicados revisados: no se eliminó nada que el modelo necesite. "Flujo de Caja.xlsx" y
"Flujo de Caja (1).xlsx" se conservaron ambos (hash distinto = versiones diferentes).*
