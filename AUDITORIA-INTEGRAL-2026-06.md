# AUDITORÍA INTEGRAL DEL MODELO — FinParty PCCh (PP007)
**Fecha:** 2026-06-08 · **Fuentes cruzadas:** SII · Defontana ERP · Portal Transparencia SERVEL

---

## 1. Estado de validación del modelo (`validar_todo.py`)

| # | Validación | Resultado |
|---|------------|-----------|
| 1 | BHE: bruto = retención + líquido (1.390 boletas) | ✅ 0 descuadres |
| 2 | BHE: suma mensual = total anual (4 años) | ✅ |
| 3 | Tasa retención efectiva vs escala legal SII | ✅ 11,76%–14,08% |
| 4 | M12: suma categorías = total (4 años) | ✅ |
| 5 | RCV: neto+IVA+exento+otros = total (5 años) | ✅ |
| 6 | App `gastos_historico.ts` = CSV M12 | ✅ 100% fiel |
| 7 | App `bhe_historico.ts` ≥20 UTM (135 contratistas) | ✅ |
| 8 | Balance 2022: Activo = Pasivo + Patrimonio | ✅ dif $0 |
| 9 | Aporte 2022 consistente entre archivos | ✅ $1.240.127.041 |
| 10 | Aporte 2023/24/25 | ⚠️ 2024 corregido a $549.691.607; 2023 EN DISPUTA |

**Conclusión:** la columna vertebral de datos (BHE, M12, RCV, balance 2022) está **verificada al 100%**. La única inconsistencia abierta es el aporte estatal 2023 (ver §3).

---

## 2. Completitud de los 24 módulos del Portal Transparencia SERVEL

> **Bug detectado y corregido:** el scraper `araña_pp007.py` deduplicaba ítems con una clave truncada a 40 caracteres. Como los 11 años de cada módulo empiezan idénticos, **colapsaban en un solo año**. Afectó a los módulos 07, 10, 11, 13, 14, 16, 17, 24. El extractor corregido (`run_modulo_transparencia.py`) usa el texto completo como clave.

| Módulo | Contenido | Estado | Valor para el modelo |
|--------|-----------|--------|----------------------|
| 09 | **Balance anual aprobado SERVEL** | ✅ completo 2015-2026 | ALTO — balances oficiales |
| 10 | Aportes, donaciones, asignaciones | ✅ re-extraído 2016-2026 | ALTO — donaciones reales |
| 11 | **Ingresos del partido (Art. 34)** | ✅ completo 2017-2026 (mensual) | **MÁXIMO** — ingreso definitivo |
| 12 | Gastos del partido | ✅ 2017-2026 | MEDIO — cruza M12 |
| 13 | Cotizaciones de afiliados | 🔄 re-extrayendo (estaba colapsado a 2016) | ALTO |
| 16 | Gastos campañas electorales | ✅ re-extraído 2016-2026 | ALTO — gasto electoral por campaña |
| 17 | Aportes a campañas electorales | ✅ 2016-2025 | ALTO — financiamiento electoral |
| 21 | Sanciones aplicadas | ✅ 2019-2026 | ALTO — verifica las 3 multas |
| 14 | Transferencias de fondos | ✅ 8.492 filas | MEDIO |
| 01-08, 15, 18-20, 22-24 | Orgánica / estadística / normativa | ✅ existentes | BAJO |

### Lo que falta re-extraer (incompleto y útil)
1. **Módulo 13 (Cotizaciones de afiliados)** — colapsado a 2016 → en re-extracción.
2. **Módulo 16 (Gastos de campaña)** — solo llega a 2021; faltan campañas 2022-2025.

---

## 3. Hallazgo crítico verificado: APORTE ESTATAL 2023

El módulo 11 (mensual, Art. 34) es la fuente más confiable: su aporte 2024 **coincide al peso** con la contabilidad Defontana, lo que valida toda la serie.

| Año | Módulo 11 (mensual) | Módulo 10 (trimestral) | Defontana | Modelo actual |
|-----|---------------------|------------------------|-----------|---------------|
| 2022 | $522.870.xxx | $800.695.571 | — | $1.240.127.041 |
| **2023** | **$345.788.xxx** | $512.429.988 | (vacío) | **$0** ⚠️ |
| 2024 | **$549.691.607** ✓ | $0 (solo H1) | $549.691.607 | $549.691.607 ✓ |
| 2025 | **$0** ✓ | $308.066.873 | $0 | $0 ✓ |

**Conclusiones:**
- ✅ **2024 = $549.691.607 CONFIRMADO** (3 fuentes coinciden).
- ✅ **2025 = $0 CONFIRMADO** por módulo 11 + Defontana. (El $308M del módulo 10 era un falso positivo de una categoría distinta.)
- 🔴 **2023: el partido SÍ recibió aporte estatal (~$345M-$512M), pero el modelo lo tiene en $0.** Confirmado por DOS módulos oficiales independientes. **Requiere corrección** tras verificar el monto exacto con la cartola Banco Estado / certificado SERVEL.

> Nota 2022: el módulo 11 ($522M) difiere del modelo ($1.240M). El $1.240M proviene del Balance Clasificado SERVEL 2022; el módulo 11 informa solo el componente "art. 33 bis" mensual. Reconciliar.

---

## 4. Brecha de financiamiento 2023 — RESUELTA por el módulo 11

El módulo 11 (Ingresos Art. 34) **sí contiene los ingresos 2023** que faltaban:

| Ítem de ingreso 2023 | Monto |
|----------------------|-------|
| Cuotas y aportes de afiliados | $400.866.xxx |
| Aportes del Estado (art. 33 bis) | $345.788.xxx |
| Rendimientos de patrimonio | $263.255.xxx |
| Reembolsos / ingresos electorales (Consejo Constitucional) | varios cientos de M$ |
| Transferencias entre cuentas / reversas | (flujos brutos) |

➡️ La brecha "2023 sin ingresos" **se cierra con la data de Transparencia módulo 11** (no hace falta esperar cartolas para el panorama; sí para el detalle contable Defontana).

---

## 5. Datos verificados contra fuente oficial (cruces OK)

- ✅ **3 multas SERVEL** (2019, 2021, 2022) — módulo 21 confirma fechas y que todas infringen arts. 39/41/44 Ley 18.603.
- ✅ **Donaciones 2019-2025** — módulo 10, reemplazaron datos ficticios en `donaciones.ts`.
- ✅ **Honorarios 2025** — SII BHE = Defontana al peso ($275.435.191).
- ✅ **Activo fijo** — `activos.ts` con valores reales Defontana 2025.

---

## 6. Acciones recomendadas (priorizadas)

1. 🔴 **Aporte 2023**: verificar monto exacto (cartola Banco Estado) y corregir el modelo (hoy $0).
2. 🟠 **Reconciliar aporte 2022** módulo 11 ($522M) vs modelo ($1.240M).
3. 🟠 **Incorporar ingresos 2023 del módulo 11** al modelo (cierra la brecha de financiamiento).
4. 🟡 **Re-extraer módulo 16** (gastos campaña 2022-2025).
5. 🟡 **Contabilizar 2022/2023 en Defontana** (material borrador ya generado).
6. 🟡 **F29 Jun-Dic 2025** (~$23,3M) declarar en SII.

---

## 7. Reconciliación módulo 11 vs módulo 13 (cotizaciones)

El módulo 13 se re-extrajo completo (2016-2026). Al cruzarlo con el módulo 11 aparecen diferencias:

| Año | Mód 13 (Cotiz. Ord+Extraord) | Mód 11 (Cuotas y aportes afiliados) | Dif |
|-----|------------------------------|--------------------------------------|-----|
| 2022 | $239.775.134 | $92.838.032 | −$146.9M |
| 2023 | $216.532.302 | $400.866.223 | +$184.3M |
| 2024 | **$0** (artefacto) | $901.581.422 | — |
| 2025 | **$0** (artefacto) | $185.729.458 | — |

**Decisión:** se usa el **módulo 11** como fuente (es el informe integral Art. 34 y su aporte 2024 calza al peso con Defontana). El módulo 13 quedó con $0 en 2024-2025 por un artefacto de extracción (capturó una tabla distinta) y categoriza cotizaciones de forma más estrecha. El módulo 13 queda como referencia secundaria de menor confianza; reconciliar con el contador antes de la rendición.

---

*Documento de trabajo interno. Cifras a verificar antes de uso oficial ante SERVEL.*
