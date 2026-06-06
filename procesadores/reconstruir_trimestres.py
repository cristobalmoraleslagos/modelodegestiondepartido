"""
reconstruir_trimestres.py
─────────────────────────
Lee los archivos Q4 (acumulado 12 meses) de finanzas/Gastos/ y genera
los trimestres Q1, Q2, Q3 faltantes para cada año.

Los archivos Q4 del SII contienen datos de los 12 meses en columnas
separadas. Q1=Ene-Mar, Q2=Abr-Jun, Q3=Jul-Sep, Q4=Oct-Dic.

Genera CSVs en el mismo formato SERVEL en:
  procesadores/output/M12_Gastos/YYYY-Q.csv

Uso:
  python reconstruir_trimestres.py
"""
from __future__ import annotations

import csv
import io
import os
import sys

if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    except Exception:
        pass

from config import (
    DIR_GASTOS, DIR_OUT_GASTOS, MESES_COLS, TRIMESTRES, crear_dirs
)


# ─── Helpers ────────────────────────────────────────────────────────────────

def _leer_csv_gastos(path: str) -> list[dict]:
    """Lee un CSV de gastos SERVEL con delimitador ; y encoding latin-1."""
    filas = []
    for enc in ["utf-8-sig", "latin-1", "cp1252"]:
        try:
            with open(path, "r", encoding=enc, newline="") as f:
                reader = csv.DictReader(f, delimiter=";")
                for row in reader:
                    # Limpiar claves con BOM u otros artefactos
                    limpia = {k.strip().lstrip("﻿"): v.strip() for k, v in row.items()}
                    filas.append(limpia)
            break
        except UnicodeDecodeError:
            filas = []
    return filas


def _montos_fila(fila: dict) -> dict[str, int]:
    """Devuelve dict col→monto (int) para los 12 meses."""
    montos = {}
    for col in MESES_COLS:
        raw = fila.get(col, "0").replace(".", "").replace(",", "").strip()
        try:
            montos[col] = int(raw) if raw else 0
        except ValueError:
            montos[col] = 0
    return montos


def _escribir_csv(filas: list[dict], path: str) -> None:
    """Escribe CSV en formato SERVEL (UTF-8 BOM, separador ;)."""
    if not filas:
        print(f"  [SKIP] Sin datos para {os.path.basename(path)}")
        return
    campos = list(filas[0].keys())
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=campos, delimiter=";")
        writer.writeheader()
        for fila in filas:
            # Formatear números con puntos de miles
            fila_fmt = {}
            for k, v in fila.items():
                if k in MESES_COLS and isinstance(v, int):
                    fila_fmt[k] = f"{v:,}".replace(",", ".")
                else:
                    fila_fmt[k] = v
            writer.writerow(fila_fmt)
    print(f"  [OK] {os.path.basename(path)} → {len(filas)} filas")


# ─── Lógica principal ────────────────────────────────────────────────────────

def extraer_trimestre(filas_q4: list[dict], num_trimestre: int,
                      anio: int) -> list[dict]:
    """
    A partir de filas Q4 (acumulado 12 meses), extrae el trimestre indicado.
    num_trimestre: 1, 2, 3 o 4
    """
    info = TRIMESTRES[num_trimestre]
    cols_activas = info["cols"]  # columnas de meses del trimestre
    label        = info["label"]

    resultado = []
    for fila in filas_q4:
        nueva = {}
        # Año y trimestre
        nueva["Año Informado"]       = str(anio)
        nueva["Trimestre Informado"] = label
        nueva["Item de Gastos"]      = fila.get("Item de Gastos", "")
        nueva["Unidad Monetaria"]    = fila.get("Unidad Monetaria", "Pesos")

        montos = _montos_fila(fila)

        # Solo incluir columnas del trimestre activo; el resto = 0
        for col in MESES_COLS:
            if col in cols_activas:
                nueva[col] = montos.get(col, 0)
            else:
                nueva[col] = 0

        resultado.append(nueva)
    return resultado


def reconstruir(anio: int, trimestres_faltantes: list[int],
                filas_q4: list[dict]) -> None:
    """Genera y guarda los trimestres faltantes para un año."""
    for num_t in trimestres_faltantes:
        salida = os.path.join(DIR_OUT_GASTOS, f"{anio}-{num_t}.csv")
        if os.path.exists(salida):
            print(f"  [EXISTS] {os.path.basename(salida)} — ya existe, saltando")
            continue
        filas = extraer_trimestre(filas_q4, num_t, anio)
        _escribir_csv(filas, salida)


def copiar_existente(src: str, dst: str) -> None:
    """Copia un CSV existente al directorio de output."""
    if os.path.exists(dst):
        print(f"  [EXISTS] {os.path.basename(dst)} — ya existe, saltando")
        return
    filas = _leer_csv_gastos(src)
    if not filas:
        print(f"  [WARN]   No se pudo leer {src}")
        return
    # Reescribir con encoding correcto
    campos = list(filas[0].keys())
    with open(dst, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=campos, delimiter=";")
        writer.writeheader()
        writer.writerows(filas)
    print(f"  [COPY] {os.path.basename(dst)} → {len(filas)} filas")


# ─── Main ───────────────────────────────────────────────────────────────────

def main() -> None:
    crear_dirs()

    print("\n" + "="*60)
    print("RECONSTRUCCIÓN DE TRIMESTRES FALTANTES — M12 Gastos")
    print("="*60)

    # Mapa de qué tenemos y qué falta
    # formato: anio → [trimestres que EXISTEN en finanzas/Gastos/]
    plan = {
        2022: {"tiene": [1, 2, 3, 4], "falta": []},
        2023: {"tiene": [1, 4],       "falta": [2, 3]},
        2024: {"tiene": [4],          "falta": [1, 2, 3]},
        2025: {"tiene": [4],          "falta": [1, 2, 3]},
        2026: {"tiene": [1],          "falta": []},
    }

    for anio, info in plan.items():
        print(f"\n── {anio} ──────────────────────────────────────")

        # 1. Copiar los existentes al output
        for t in info["tiene"]:
            src = os.path.join(DIR_GASTOS, f"{anio}-{t}.csv")
            dst = os.path.join(DIR_OUT_GASTOS, f"{anio}-{t}.csv")
            if os.path.exists(src):
                copiar_existente(src, dst)
            else:
                print(f"  [WARN] No encontrado: {anio}-{t}.csv")

        # 2. Reconstruir los faltantes
        if info["falta"]:
            path_q4 = os.path.join(DIR_GASTOS, f"{anio}-4.csv")
            if not os.path.exists(path_q4):
                print(f"  [ERROR] No hay Q4 para {anio} — no se puede reconstruir")
                continue

            filas_q4 = _leer_csv_gastos(path_q4)
            if not filas_q4:
                print(f"  [ERROR] No se pudo leer Q4 de {anio}")
                continue

            print(f"  Q4 leído: {len(filas_q4)} filas (acumulado 12 meses)")
            reconstruir(anio, info["falta"], filas_q4)

    print("\n" + "="*60)
    print(f"COMPLETADO — CSVs en: {DIR_OUT_GASTOS}")
    print("="*60)


if __name__ == "__main__":
    main()
