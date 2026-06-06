"""
estado_servel.py
────────────────
Genera un informe de estado completo de la rendición SERVEL:
  - Qué trimestres tienen M12 Gastos
  - Qué trimestres tienen Nómina >20 UTM generada
  - Estado F29 por período
  - Cobertura BHE y RCV
  - Alertas de cumplimiento

Uso:
  python estado_servel.py
"""
from __future__ import annotations

import csv
import glob
import io
import os
import sys

if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    except Exception:
        pass

from config import (
    DIR_OUT_GASTOS, DIR_OUT_NOMINA, DIR_OUT_RCV, DIR_F29,
    DIR_BHE, DIR_RCV, TRIMESTRES, crear_dirs
)


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _existe_archivo(directorio: str, patron: str) -> bool:
    return bool(glob.glob(os.path.join(directorio, patron)))


def _leer_f29() -> dict[str, str]:
    """Retorna dict periodo→estado desde F29 Excel consolidado."""
    try:
        import openpyxl
        path = os.path.join(DIR_F29, "Resultados Formularios de Impuesto 2022-2025 Consolidado.xlsx")
        wb = openpyxl.load_workbook(path, data_only=True)
        sh = wb.active
        estados = {}
        for r in sh.iter_rows(min_row=2, values_only=True):
            if r[0] is None:
                continue
            periodo = str(r[0])[:7]   # "YYYY-MM-01" → "YYYY-MM"
            if len(periodo) == 7 and "-" in periodo:
                periodo = periodo[:7]
                estados[periodo] = str(r[4]) if r[4] else "?"
        return estados
    except Exception as e:
        print(f"  [WARN] No se pudo leer F29: {e}")
        return {}


def _bhe_meses_disponibles() -> set[tuple[int, int]]:
    """Retorna set (anio, mes) de BHE disponibles."""
    disponibles: set[tuple[int,int]] = set()

    for anio in [2022, 2023, 2024, 2025]:
        base = os.path.join(DIR_BHE, str(anio), "ENERO") if anio == 2022 \
               else os.path.join(DIR_BHE, str(anio))
        if not os.path.isdir(base):
            continue
        archivos = [f for f in os.listdir(base)
                    if f.startswith("file_informeMensualREC") and f.endswith(".xls")]
        # Aproximar: si hay N archivos mensuales, asumimos meses 1..N (sin duplicados)
        n = min(len([f for f in archivos if "Anual" not in f and "anual" not in f]), 12)
        for mes in range(1, n + 1):
            disponibles.add((anio, mes))
    return disponibles


def _rcv_periodos() -> set[str]:
    """Retorna set de periodos YYYYMM con RCV disponible."""
    archivos = glob.glob(os.path.join(DIR_RCV, "RCV_COMPRA_REGISTRO_*.csv"))
    periodos = set()
    for f in archivos:
        nombre = os.path.basename(f)
        p = nombre.replace("RCV_COMPRA_REGISTRO_71701800-1_", "").replace(".csv", "")
        if len(p) == 6 and p.isdigit():
            periodos.add(p)
    return periodos


# ─── Generador de informe ────────────────────────────────────────────────────

def generar_informe() -> None:
    crear_dirs()

    f29 = _leer_f29()
    bhe_disp = _bhe_meses_disponibles()
    rcv_disp = _rcv_periodos()

    ANIOS = [2022, 2023, 2024, 2025, 2026]
    TRIM_LABEL = {1: "Q1 Ene-Mar", 2: "Q2 Abr-Jun", 3: "Q3 Jul-Sep", 4: "Q4 Oct-Dic"}
    TRIM_MESES = {1: [1,2,3], 2: [4,5,6], 3: [7,8,9], 4: [10,11,12]}

    print("\n" + "═" * 90)
    print("ESTADO DE RENDICIÓN SERVEL — PCCh PP007")
    print("═" * 90)
    print(f"{'Período':<12} {'M12 Gastos':^12} {'Nómina':^10} {'BHE':^10} {'RCV':^10} "
          f"{'F29 Ene':^10} {'F29 Feb':^10} {'F29 Mar':^10} {'Alertas'}")
    print("─" * 90)

    alertas_globales = []
    filas_csv = []

    for anio in ANIOS:
        for t in [1, 2, 3, 4]:
            meses_t = TRIM_MESES[t]
            periodo_label = f"{anio} {TRIM_LABEL[t]}"

            # M12 Gastos
            m12_existe = _existe_archivo(DIR_OUT_GASTOS, f"{anio}-{t}.csv")
            m12_str    = "✅" if m12_existe else "❌ FALTA"

            # Nómina
            nom_existe = _existe_archivo(DIR_OUT_NOMINA, f"Nomina_{anio}_Q{t}.csv")
            nom_str    = "✅" if nom_existe else "⏳"

            # BHE cobertura (los 3 meses del trimestre)
            bhe_ok = sum(1 for m in meses_t if (anio, m) in bhe_disp)
            bhe_str = f"✅ {bhe_ok}/3" if bhe_ok == 3 else (
                       f"⚠️ {bhe_ok}/3" if bhe_ok > 0 else "❌")

            # RCV cobertura
            rcv_ok = sum(1 for m in meses_t if f"{anio}{m:02d}" in rcv_disp)
            rcv_str = f"✅ {rcv_ok}/3" if rcv_ok == 3 else (
                       f"⚠️ {rcv_ok}/3" if rcv_ok > 0 else "❌")

            # F29 por mes del trimestre
            f29_strs = []
            for m in meses_t:
                clave = f"{anio}-{m:02d}"
                estado = f29.get(clave, "—")
                if estado == "Vigente":
                    f29_strs.append("✅")
                elif estado == "—":
                    f29_strs.append("❌")
                else:
                    f29_strs.append(f"⚠️")

            # Alertas
            alertas = []
            if not m12_existe and anio < 2026:
                alertas.append("M12 falta")
            if f29_strs.count("❌") > 0 and anio <= 2025:
                meses_falt = [f"{anio}-{meses_t[i]:02d}"
                              for i, s in enumerate(f29_strs) if s == "❌"]
                alertas.append(f"F29 pendiente: {', '.join(meses_falt)}")
            if bhe_ok < 3 and anio < 2026:
                alertas.append("BHE incompleto")

            alerta_str = " | ".join(alertas) if alertas else ""
            if alertas:
                alertas_globales.append(f"{periodo_label}: {alerta_str}")

            f29_col = "  ".join(f29_strs)
            print(f"{periodo_label:<12} {m12_str:^12} {nom_str:^10} {bhe_str:^10} "
                  f"{rcv_str:^10} {f29_col}  {alerta_str}")

            filas_csv.append({
                "Período":     periodo_label,
                "M12 Gastos":  "SI" if m12_existe else "NO",
                "Nómina":      "SI" if nom_existe else "NO",
                "BHE":         f"{bhe_ok}/3",
                "RCV":         f"{rcv_ok}/3",
                "F29 mes1":    f29.get(f"{anio}-{meses_t[0]:02d}", ""),
                "F29 mes2":    f29.get(f"{anio}-{meses_t[1]:02d}", ""),
                "F29 mes3":    f29.get(f"{anio}-{meses_t[2]:02d}", ""),
                "Alertas":     alerta_str,
            })

    # Alertas críticas
    if alertas_globales:
        print("\n" + "─" * 90)
        print("🔴 ALERTAS PENDIENTES:")
        for a in alertas_globales:
            print(f"   • {a}")

    # Alerta especial F29 2025
    f29_2025_faltantes = [
        f"2025-{m:02d}" for m in range(6, 13)
        if f29.get(f"2025-{m:02d}", "—") not in ("Vigente",)
    ]
    if f29_2025_faltantes:
        total_ret_est = len(f29_2025_faltantes) * 3_200_000  # estimado
        print(f"\n   🔴 URGENTE F29 2025: períodos sin declarar: {', '.join(f29_2025_faltantes)}")
        print(f"      Retenciones estimadas sin declarar: ~${total_ret_est:,.0f}")
        print(f"      Acción: Presentar F29 con intereses en SII antes de auditoría SERVEL")

    print("\n" + "═" * 90)

    # Guardar CSV de estado
    path_estado = os.path.join(DIR_OUT_RCV, "..", "estado_rendicion_servel.csv")
    path_estado = os.path.normpath(path_estado)
    with open(path_estado, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=filas_csv[0].keys(), delimiter=";")
        writer.writeheader()
        writer.writerows(filas_csv)
    print(f"[OK] Estado exportado: {path_estado}")


# ─── Main ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    generar_informe()
