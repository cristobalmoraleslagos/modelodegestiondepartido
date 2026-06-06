"""
generar_nomina_servel.py
────────────────────────
Genera el CSV "Nómina de contrataciones sobre 20 UTM" (M12 personal)
en formato SERVEL a partir de los datos BHE parseados.

Regla: se incluye a todo contratista cuyo honorario bruto ANUAL
       supere 20 UTM para el año correspondiente.

Columnas SERVEL:
  Año Informado | Trimestre Informado | Individualización del Contrato |
  Contratista | Rut | Socios o Accionistas | Objeto de la Contratación |
  Unidad Monetaria | Monto | Fecha de Inicio del Contrato |
  Fecha de Término del Contrato | Link al Contrato | Link a Modificaciones

Uso:
  python generar_nomina_servel.py
"""
from __future__ import annotations

import csv
import io
import json
import os
import sys
from collections import defaultdict
from dataclasses import dataclass
from typing import Optional

if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    except Exception:
        pass

from config import DIR_OUTPUT, DIR_OUT_NOMINA, TRIMESTRES, utm_20, crear_dirs
from bhe_parser import cargar_todas_bhe, Boleta


# ─── Modelo fila SERVEL ──────────────────────────────────────────────────────

CABECERA_NOMINA = [
    "Año Informado",
    "Trimestre Informado",
    "Individualización del Contrato",
    "Contratista",
    "Rut",
    "Socios o Accionistas",
    "Objeto de la Contratación",
    "Unidad Monetaria",
    "Monto",
    "Fecha de Inicio del Contrato",
    "Fecha de Término del Contrato",
    "Link al Contrato",
    "Link a Modificaciones",
]


# ─── Lógica principal ────────────────────────────────────────────────────────

def boletas_a_nomina(boletas: list[Boleta]) -> dict[tuple[int,int], list[dict]]:
    """
    Agrupa boletas por (año, trimestre) y construye las filas SERVEL.
    Solo incluye contratistas que superan 20 UTM anuales.

    Returns:
        dict[(anio, trimestre)] → lista de filas para CSV
    """
    # Paso 1: calcular bruto anual por contratista para filtrar por 20 UTM
    bruto_anual: dict[tuple[int,str], int] = defaultdict(int)
    for b in boletas:
        bruto_anual[(b.anio, b.rut_emisor)] += b.honorario_bruto

    # Contratistas que superan el umbral en cada año
    sobre_umbral: set[tuple[int,str]] = {
        (anio, rut)
        for (anio, rut), total in bruto_anual.items()
        if total >= utm_20(anio)
    }

    # Paso 2: agrupar por (anio, trimestre), incluir solo sobre_umbral
    por_periodo: dict[tuple[int,int], list[dict]] = defaultdict(list)

    for b in sorted(boletas, key=lambda x: (x.anio, x.mes, x.rut_emisor, x.fecha)):
        if (b.anio, b.rut_emisor) not in sobre_umbral:
            continue

        label_trim = TRIMESTRES[b.trimestre]["label"]

        # Calcular fecha inicio/fin del mes de la boleta para el contrato
        partes = b.fecha.split("/")
        if len(partes) == 3:
            dia, mes, anio_str = partes
            fecha_inicio = f"01/{mes}/{anio_str}"
            # Último día del mes (aproximado)
            dias_mes = {1:31,2:28,3:31,4:30,5:31,6:30,7:31,8:31,9:30,10:31,11:30,12:31}
            ultimo = dias_mes.get(int(mes), 30)
            fecha_fin = f"{ultimo:02d}/{mes}/{anio_str}"
        else:
            fecha_inicio = b.fecha
            fecha_fin    = b.fecha

        fila = {
            "Año Informado":                  str(b.anio),
            "Trimestre Informado":            label_trim,
            "Individualización del Contrato": f"Honorarios profesionales - Boleta N° {b.nro_boleta}",
            "Contratista":                    b.nombre_emisor,
            "Rut":                            b.rut_emisor,
            "Socios o Accionistas":           "No Aplica",
            "Objeto de la Contratación":      "Prestación de servicios profesionales como honorario",
            "Unidad Monetaria":               "Pesos",
            "Monto":                          f"{b.honorario_bruto:,}".replace(",", "."),
            "Fecha de Inicio del Contrato":   fecha_inicio,
            "Fecha de Término del Contrato":  fecha_fin,
            "Link al Contrato":               "No disponible",
            "Link a Modificaciones":          "No Aplica",
        }
        por_periodo[(b.anio, b.trimestre)].append(fila)

    return dict(por_periodo)


def guardar_nominas(por_periodo: dict[tuple[int,int], list[dict]]) -> None:
    """Escribe un CSV por período (año, trimestre)."""
    for (anio, trimestre), filas in sorted(por_periodo.items()):
        nombre = f"Nomina_{anio}_Q{trimestre}.csv"
        path   = os.path.join(DIR_OUT_NOMINA, nombre)

        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=CABECERA_NOMINA, delimiter=";")
            writer.writeheader()
            writer.writerows(filas)

        total_monto = sum(
            int(r["Monto"].replace(".", "").replace(",", ""))
            for r in filas
        )
        label = TRIMESTRES[trimestre]["label"]
        print(f"  [OK] {nombre} → {len(filas)} contratistas | "
              f"Total: ${total_monto:,.0f}")


def generar_resumen_sobre_umbral(boletas: list[Boleta]) -> None:
    """Imprime un resumen de quién supera 20 UTM por año."""
    from config import utm_20, UTM_POR_ANIO

    bruto_anual: dict[tuple[int,str], dict] = defaultdict(lambda: {"nombre": "", "total": 0, "boletas": 0})
    for b in boletas:
        key = (b.anio, b.rut_emisor)
        bruto_anual[key]["nombre"]  = b.nombre_emisor
        bruto_anual[key]["total"]  += b.honorario_bruto
        bruto_anual[key]["boletas"]+= 1

    print("\n" + "─" * 75)
    print("CONTRATISTAS SOBRE 20 UTM (incluidos en Nómina SERVEL)")
    print("─" * 75)

    anio_actual = None
    total_sobre = 0
    total_bajo  = 0

    for (anio, rut), datos in sorted(bruto_anual.items()):
        umbral = utm_20(anio)
        if datos["total"] >= umbral:
            if anio != anio_actual:
                print(f"\n  {anio} (umbral: ${umbral:,.0f})")
                anio_actual = anio
            print(f"    ✓ {rut:<15} {datos['nombre'][:40]:<40} "
                  f"${datos['total']:>12,.0f}  ({datos['boletas']} BHEs)")
            total_sobre += 1
        else:
            total_bajo += 1

    print(f"\n  Sobre umbral: {total_sobre} contratistas/año")
    print(f"  Bajo umbral:  {total_bajo} (excluidos de nómina SERVEL)")


# ─── Main ────────────────────────────────────────────────────────────────────

def main() -> None:
    crear_dirs()

    print("=" * 65)
    print("GENERADOR NÓMINA SERVEL — Contrataciones sobre 20 UTM")
    print("=" * 65)

    # Intentar cargar desde JSON cacheado si existe
    cache = os.path.join(DIR_OUTPUT, "bhe_todas.json")
    if os.path.exists(cache):
        print(f"[CACHE] Cargando BHE desde {cache}")
        import json
        from bhe_parser import Boleta
        with open(cache, "r", encoding="utf-8") as f:
            raw = json.load(f)
        boletas = [Boleta(**r) for r in raw]
        print(f"  {len(boletas):,} boletas cargadas")
    else:
        print("[PARSE] Leyendo archivos BHE del SII...")
        boletas = cargar_todas_bhe()

    # Mostrar quién está sobre umbral
    generar_resumen_sobre_umbral(boletas)

    # Generar CSVs
    print("\n\nGENERANDO CSVs DE NÓMINA POR PERÍODO:")
    por_periodo = boletas_a_nomina(boletas)
    guardar_nominas(por_periodo)

    total_periodos = len(por_periodo)
    total_filas    = sum(len(v) for v in por_periodo.values())
    print(f"\n[OK] {total_periodos} archivos CSV | {total_filas} filas totales")
    print(f"     Destino: {DIR_OUT_NOMINA}")


if __name__ == "__main__":
    main()
