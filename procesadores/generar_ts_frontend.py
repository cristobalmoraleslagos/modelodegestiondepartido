"""
generar_ts_frontend.py
──────────────────────
Lee los datos procesados (M12 Gastos CSVs, BHE JSON)
y genera archivos TypeScript listos para importar en el frontend.

Genera:
  frontend/src/data/bhe_historico.ts   → Nómina histórica 2022-2025
  frontend/src/data/gastos_historico.ts → M12 Gastos anuales por categoría
  (actualiza datos en ModuloHistorico a través de gastos_historico.ts)

Uso:
  python generar_ts_frontend.py
"""
from __future__ import annotations

import csv
import io
import json
import os
import re
import sys
from collections import defaultdict

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT        = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR_OUT_M12 = os.path.join(ROOT, "procesadores", "output", "M12_Gastos")
DIR_OUT     = os.path.join(ROOT, "procesadores", "output")
DIR_TS      = os.path.join(ROOT, "frontend", "src", "data")
DIR_BHE_JSON= os.path.join(DIR_OUT, "bhe_todas.json")

# Mapeo de ítems SERVEL a categorías del modelo
CATEGORIA_MAP = {
    "Gastos de Personal":                              "personal",
    "Adquisición de Bienes o Servicios y Gastos corrientes": "bienes",
    "Otros gastos de administración":                  "admin",
    "Otros gastos de Administración":                  "admin",
    "Actividades de Fomento a Participación Femenina": "genero",
    "Actividades 10% mujer":                           "genero",
    "Actividades de Fomento a Participación Juvenil":  "juvenil",
    "Actividades de Educación Cívica":                 "educacion",
    "Actividades de Investigación":                    "investigacion",
    "Preparación de candidatos (elección popular)":    "candidatos",
    "Preparacion de militantes":                       "militantes",
    "Gastos de las actividades de formación de militantes": "militantes",
    "Créditos corto plazo":                            "creditos",
    "Créditos largo plazo":                            "creditosLP",
    "Gastos por Prestamos corto plazo":                "prestamosCP",
    "Gastos por Prestamos largo plazo":                "prestamosLP",
    "Inversiones":                                     "inversiones",
}

MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
         "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]


# ─── Leer M12 y calcular totales anuales ─────────────────────────────────────

def leer_m12_anual(anio: int) -> dict:
    """Lee el CSV Q4 (acumulado anual) y retorna totales por categoría."""
    path = os.path.join(DIR_OUT_M12, f"{anio}-4.csv")
    if not os.path.exists(path):
        return {}

    totales: dict[str, int] = defaultdict(int)
    total_general = 0

    for enc in ["utf-8-sig", "latin-1", "cp1252"]:
        try:
            with open(path, "r", encoding=enc) as f:
                reader = csv.DictReader(f, delimiter=";")
                for row in reader:
                    item = row.get("Item de Gastos", "").strip()
                    categoria = CATEGORIA_MAP.get(item)
                    monto_fila = 0
                    for mes in MESES:
                        val = row.get(mes, "0").replace(".", "").replace(",", "").strip()
                        try:
                            monto_fila += int(val) if val else 0
                        except ValueError:
                            pass
                    if categoria:
                        totales[categoria] += monto_fila
                    total_general += monto_fila
            break
        except UnicodeDecodeError:
            pass

    totales["gastoTotal"] = total_general
    return dict(totales)


def extraer_serie_historica() -> list[dict]:
    """Extrae datos anuales de todos los M12 disponibles."""
    APORTES_ESTATALES = {
        2017: 800_000_000, 2018: 900_000_000, 2019: 950_000_000,
        2020: 950_000_000, 2021: 1_370_047_598,
        2022: 1_240_127_041, 2023: 1_200_000_000,
        2024: 1_200_000_000, 2025: 1_200_000_000, 2026: 134_400_000,
    }

    serie = []
    for anio in range(2022, 2027):
        m12 = leer_m12_anual(anio)
        if not m12:
            continue

        entrada = {
            "anio":           anio,
            "aporteEstatal":  APORTES_ESTATALES.get(anio, None),
            "gastoTotal":     m12.get("gastoTotal", None),
            "personal":       m12.get("personal", None) or None,
            "bienes":         m12.get("bienes", None) or None,
            "admin":          m12.get("admin", None) or None,
            "genero":         m12.get("genero", None) or None,
            "juvenil":        m12.get("juvenil", None) or None,
            "educacion":      m12.get("educacion", None) or None,
            "militantes":     m12.get("militantes", None) or None,
            "candidatos":     m12.get("candidatos", None) or None,
            "fuente":         f"M12 Gastos SERVEL {anio} — procesado desde finanzas/Gastos/{anio}-4.csv",
        }
        serie.append(entrada)
        print(f"  {anio}: gasto total = ${m12.get('gastoTotal',0):,.0f}")

    return serie


# ─── Leer BHE y generar nómina histórica ─────────────────────────────────────

def extraer_nomina_historica() -> dict[str, list]:
    """
    Carga el JSON de BHEs y agrupa por año→ lista de contratistas únicos
    con sus honorarios anuales.
    Solo incluye quienes tienen bruto anual ≥ 20 UTM.
    """
    UTM_20 = {2022: 56_242*20, 2023: 62_055*20, 2024: 66_574*20, 2025: 71_638*20}

    if not os.path.exists(DIR_BHE_JSON):
        print("[WARN] bhe_todas.json no encontrado — ejecuta bhe_parser.py primero")
        return {}

    with open(DIR_BHE_JSON, "r", encoding="utf-8") as f:
        boletas = json.load(f)

    # Agrupar por (año, rut)
    agrupado: dict[tuple, dict] = defaultdict(lambda: {
        "nombre": "", "rut": "", "anio": 0,
        "bruto": 0, "retencion": 0, "boletas": 0, "meses": set()
    })

    for b in boletas:
        key = (b["anio"], b["rut_emisor"])
        agrupado[key]["nombre"]    = b["nombre_emisor"]
        agrupado[key]["rut"]       = b["rut_emisor"]
        agrupado[key]["anio"]      = b["anio"]
        agrupado[key]["bruto"]    += b["honorario_bruto"]
        agrupado[key]["retencion"]+= b["retencion"]
        agrupado[key]["boletas"]  += 1
        agrupado[key]["meses"].add(b["mes"])

    # Filtrar por umbral y convertir sets
    por_anio: dict[int, list] = defaultdict(list)
    for (anio, rut), datos in agrupado.items():
        umbral = UTM_20.get(anio, 1_200_000)
        if datos["bruto"] >= umbral:
            datos["meses"] = len(datos["meses"])
            por_anio[anio].append(datos)

    # Ordenar por bruto desc
    for anio in por_anio:
        por_anio[anio].sort(key=lambda x: x["bruto"], reverse=True)

    return dict(por_anio)


# ─── Generadores TypeScript ───────────────────────────────────────────────────

def _ts_null(v) -> str:
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, str):
        escaped = v.replace("\\", "\\\\").replace("'", "\\'")
        return f"'{escaped}'"
    return str(int(v))


def generar_gastos_historico_ts(serie: list[dict]) -> None:
    """Genera gastos_historico.ts con los datos M12 por año."""
    path = os.path.join(DIR_TS, "gastos_historico.ts")

    lines = [
        "/**",
        " * gastos_historico.ts — Serie histórica de Gastos del Partido PCCh",
        " * Generado automáticamente por procesadores/generar_ts_frontend.py",
        " * Fuente: finanzas/Gastos/*.csv (Módulo 12 SERVEL)",
        " *",
        " * NO EDITAR MANUALMENTE — regenerar con: python procesadores/generar_ts_frontend.py",
        " */",
        "",
        "export interface DatoAnualGasto {",
        "  anio:          number",
        "  aporteEstatal: number | null",
        "  gastoTotal:    number | null",
        "  personal:      number | null",
        "  bienes:        number | null",
        "  admin:         number | null",
        "  genero:        number | null",
        "  juvenil:       number | null",
        "  educacion:     number | null",
        "  militantes:    number | null",
        "  candidatos:    number | null",
        "  fuente:        string",
        "}",
        "",
        "/** Serie M12 Gastos 2022-2026 — fuente SERVEL (procesada desde Gastos/*.csv) */",
        "export const GASTOS_HISTORICO: DatoAnualGasto[] = [",
    ]

    for d in sorted(serie, key=lambda x: x["anio"]):
        lines.append("  {")
        lines.append(f"    anio:          {d['anio']},")
        lines.append(f"    aporteEstatal: {_ts_null(d['aporteEstatal'])},")
        lines.append(f"    gastoTotal:    {_ts_null(d['gastoTotal'])},")
        lines.append(f"    personal:      {_ts_null(d['personal'])},")
        lines.append(f"    bienes:        {_ts_null(d['bienes'])},")
        lines.append(f"    admin:         {_ts_null(d['admin'])},")
        lines.append(f"    genero:        {_ts_null(d['genero'])},")
        lines.append(f"    juvenil:       {_ts_null(d['juvenil'])},")
        lines.append(f"    educacion:     {_ts_null(d['educacion'])},")
        lines.append(f"    militantes:    {_ts_null(d['militantes'])},")
        lines.append(f"    candidatos:    {_ts_null(d['candidatos'])},")
        lines.append(f"    fuente:        '{d['fuente']}',")
        lines.append("  },")

    lines.append("]")
    lines.append("")
    lines.append("/** Lookup rápido: GASTOS_HISTORICO_MAP[año] → DatoAnualGasto */")
    lines.append("export const GASTOS_HISTORICO_MAP = Object.fromEntries(")
    lines.append("  GASTOS_HISTORICO.map(d => [d.anio, d])")
    lines.append(")")

    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    print(f"  [TS] {path}")


def generar_bhe_historico_ts(por_anio: dict) -> None:
    """Genera bhe_historico.ts con la nómina histórica de honorarios."""
    path = os.path.join(DIR_TS, "bhe_historico.ts")

    lines = [
        "/**",
        " * bhe_historico.ts — Nómina histórica de honorarios (BHE) 2022-2025",
        " * Generado automáticamente por procesadores/generar_ts_frontend.py",
        " * Fuente: ARCHIVOS SII/BHE/*.xls (SII Clave Tributaria)",
        " *",
        " * Incluye solo contratistas con honorario bruto anual ≥ 20 UTM.",
        " * NO EDITAR MANUALMENTE.",
        " */",
        "",
        "export interface ContratistaBHE {",
        "  anio:       number",
        "  rut:        string",
        "  nombre:     string",
        "  bruto:      number   // honorario bruto anual CLP",
        "  retencion:  number   // retención total anual CLP",
        "  boletas:    number   // número de BHEs emitidas",
        "  meses:      number   // meses con al menos 1 BHE",
        "}",
        "",
        "/** Nómina BHE histórica — contratistas ≥ 20 UTM por año */",
        "export const BHE_HISTORICO: ContratistaBHE[] = [",
    ]

    total_registros = 0
    for anio in sorted(por_anio.keys()):
        for c in por_anio[anio]:
            nombre = c["nombre"].replace("'", "\\'")
            lines.append(
                f"  {{ anio: {anio}, rut: '{c['rut']}', "
                f"nombre: '{nombre}', "
                f"bruto: {c['bruto']}, retencion: {c['retencion']}, "
                f"boletas: {c['boletas']}, meses: {c['meses']} }},"
            )
            total_registros += 1

    lines.append("]")
    lines.append("")
    lines.append("/**")
    lines.append(" * Totales anuales BHE — bruto y retención.")
    lines.append(" * Útil para F29 reconciliación y ModuloRetenciones histórico.")
    lines.append(" */")
    lines.append("export const BHE_TOTALES_ANUALES: Record<number, {")
    lines.append("  bruto: number; retencion: number; contratistas: number")
    lines.append("}> = {")

    for anio in sorted(por_anio.keys()):
        bruto   = sum(c["bruto"] for c in por_anio[anio])
        ret     = sum(c["retencion"] for c in por_anio[anio])
        n       = len(por_anio[anio])
        lines.append(f"  {anio}: {{ bruto: {bruto}, retencion: {ret}, contratistas: {n} }},")

    lines.append("}")
    lines.append("")

    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    print(f"  [TS] {path} ({total_registros} registros)")


# ─── Patch ModuloHistorico ────────────────────────────────────────────────────

def patch_modulo_historico(serie: list[dict]) -> None:
    """
    Actualiza las entradas de la SERIE en ModuloHistorico.tsx
    con los datos reales de gastos_historico.ts.
    Reemplaza los valores null con los datos reales procesados.
    """
    path = os.path.join(ROOT, "frontend", "src", "components", "ModuloHistorico.tsx")
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Buscar el bloque de imports para agregar el nuevo import
    import_line = "import { GASTOS_HISTORICO_MAP } from '../data/gastos_historico'"
    if import_line not in content:
        # Insertar después del último import existente
        last_import = content.rfind("import ")
        end_of_line = content.find("\n", last_import)
        content = content[:end_of_line+1] + import_line + "\n" + content[end_of_line+1:]

    # Buscar el bloque de uso de GASTOS_HISTORICO_MAP y añadir lógica de merge
    # Insertamos después de la declaración de SERIE para que el componente use datos reales
    merge_code = """
// ─── Merge con datos M12 procesados ─────────────────────────────────────────
// Combina la serie hardcoded con los datos reales de gastos_historico.ts
// Los campos null de SERIE se reemplazan con los valores reales del M12
const SERIE_MERGED: DatoAnual[] = SERIE.map(d => {
  const real = GASTOS_HISTORICO_MAP[d.año]
  if (!real) return d
  return {
    ...d,
    gastoTotal: d.gastoTotal ?? real.gastoTotal,
    personal:   d.personal   ?? real.personal,
    bienes:     d.bienes     ?? real.bienes,
    admin:      d.admin      ?? real.admin,
    genero:     d.genero     ?? real.genero,
    juvenil:    d.juvenil    ?? real.juvenil,
    fuente:     d.fuente !== 'Datos no disponibles en portal al momento del análisis'
                ? d.fuente : real.fuente,
  }
})

"""

    if "SERIE_MERGED" not in content:
        # Insertar después del cierre de EVENTOS
        idx = content.find("const EVENTOS: Evento[] = [")
        if idx == -1:
            idx = content.rfind("]\n\n")
        end_eventos = content.find("\n\nexport default", idx)
        if end_eventos == -1:
            end_eventos = content.find("\nfunction ", idx)
        if end_eventos != -1:
            content = content[:end_eventos] + "\n" + merge_code + content[end_eventos:]

    # Reemplazar los usos de SERIE por SERIE_MERGED en el componente
    # (solo dentro del componente, no en la definición)
    content = re.sub(
        r'\bSERIE\b(?!_MERGED|\s*:|\s*=)',
        'SERIE_MERGED',
        content,
        count=0
    )
    # Restaurar la definición original
    content = content.replace(
        "const SERIE_MERGED_MERGED:",
        "const SERIE:"
    ).replace(
        "const SERIE_MERGED: DatoAnual[] = [",
        "const SERIE: DatoAnual[] = ["
    )

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"  [PATCH] {path}")


# ─── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    os.makedirs(DIR_TS, exist_ok=True)

    print("=" * 60)
    print("GENERADOR TypeScript — datos SII → frontend FinParty")
    print("=" * 60)

    print("\n── PASO 1: Extraer serie histórica M12 ──")
    serie = extraer_serie_historica()

    print("\n── PASO 2: Extraer nómina histórica BHE ──")
    por_anio = extraer_nomina_historica()
    for anio, lista in sorted(por_anio.items()):
        print(f"  {anio}: {len(lista)} contratistas ≥20 UTM")

    print("\n── PASO 3: Generar TypeScript ──")
    generar_gastos_historico_ts(serie)
    generar_bhe_historico_ts(por_anio)

    print("\n── PASO 4: Patch ModuloHistorico ──")
    patch_modulo_historico(serie)

    print("\n" + "=" * 60)
    print("COMPLETADO — archivos TypeScript generados:")
    print(f"  frontend/src/data/gastos_historico.ts")
    print(f"  frontend/src/data/bhe_historico.ts")
    print(f"  frontend/src/components/ModuloHistorico.tsx (patched)")
    print("=" * 60)


if __name__ == "__main__":
    main()
