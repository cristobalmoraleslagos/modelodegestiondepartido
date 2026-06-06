"""
rcv_resumen.py
──────────────
Procesa todos los CSVs del Registro de Compra y Ventas (RCV) y genera:
  1. Resumen mensual y anual de compras
  2. Top proveedores por año
  3. CSV de respaldo para cruce con M12 Gastos SERVEL

El RCV no tiene categorías contables (eso viene del M12 Gastos), pero
permite verificar montos y listar proveedores para la nómina.

Uso:
  python rcv_resumen.py
"""
from __future__ import annotations

import csv
import glob
import io
import os
import sys
from collections import defaultdict

if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    except Exception:
        pass

from config import DIR_RCV, DIR_OUT_RCV, crear_dirs

# Tipos de documento SII
TIPO_DOC = {
    "33": "Factura Electrónica",
    "34": "Factura No Afecta/Exenta",
    "39": "Boleta Electrónica",
    "41": "Boleta No Afecta/Exenta",
    "43": "Liquidación Factura",
    "46": "Factura de Compra",
    "52": "Guía de Despacho",
    "56": "Nota de Débito",
    "61": "Nota de Crédito",
}


# ─── Parsing RCV ─────────────────────────────────────────────────────────────

def leer_rcv(path: str) -> list[dict]:
    """Lee un CSV de RCV del SII."""
    filas = []
    with open(path, "r", encoding="latin-1", newline="") as f:
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            limpia = {k.strip(): (v.strip() if v else "") for k, v in row.items() if k is not None}
            filas.append(limpia)
    return filas


def _monto(s: str) -> float:
    s = s.replace(".", "").replace(",", ".").strip()
    try:
        return float(s)
    except ValueError:
        return 0.0


# ─── Procesador ──────────────────────────────────────────────────────────────

def procesar_todos() -> tuple[dict, dict, list[dict]]:
    """
    Procesa todos los archivos RCV.

    Returns:
        resumen_anual   → dict[anio] = {neto, iva, exento, total, docs}
        top_proveedores → dict[anio] = list de (rut, razon, total) top 20
        todas_filas     → lista de todas las filas de todos los meses
    """
    archivos = sorted(glob.glob(os.path.join(DIR_RCV, "RCV_COMPRA_REGISTRO_*.csv")))
    print(f"Archivos RCV encontrados: {len(archivos)}")

    resumen_anual: dict[str, dict] = {}
    prov_anio: dict[str, dict] = defaultdict(lambda: defaultdict(lambda: {"razon": "", "total": 0.0, "docs": 0}))
    todas_filas: list[dict] = []

    for path in archivos:
        fname = os.path.basename(path)
        # Extraer periodo del nombre: RCV_COMPRA_REGISTRO_71701800-1_YYYYMM.csv
        periodo = fname.replace("RCV_COMPRA_REGISTRO_71701800-1_", "").replace(".csv", "")
        if len(periodo) != 6:
            continue
        anio = periodo[:4]
        mes  = periodo[4:]

        filas = leer_rcv(path)

        neto   = sum(_monto(r.get("Monto Neto", "0")) for r in filas)
        iva    = sum(_monto(r.get("Monto IVA Recuperable", "0")) for r in filas)
        exento = sum(_monto(r.get("Monto Exento", "0")) for r in filas)
        total  = sum(_monto(r.get("Monto Total", "0")) for r in filas)

        if anio not in resumen_anual:
            resumen_anual[anio] = {"neto": 0, "iva": 0, "exento": 0, "total": 0,
                                    "docs": 0, "meses": 0, "detalle_meses": {}}
        resumen_anual[anio]["neto"]   += neto
        resumen_anual[anio]["iva"]    += iva
        resumen_anual[anio]["exento"] += exento
        resumen_anual[anio]["total"]  += total
        resumen_anual[anio]["docs"]   += len(filas)
        resumen_anual[anio]["meses"]  += 1
        resumen_anual[anio]["detalle_meses"][mes] = {
            "docs": len(filas), "neto": neto, "total": total
        }

        # Proveedores
        for r in filas:
            rut   = r.get("RUT Proveedor", "").strip()
            razon = r.get("Razon Social", "").strip()[:50]
            t     = _monto(r.get("Monto Total", "0"))
            if rut:
                prov_anio[anio][rut]["razon"]  = razon
                prov_anio[anio][rut]["total"] += t
                prov_anio[anio][rut]["docs"]  += 1

        # Agregar campos de período a cada fila
        for r in filas:
            r["_anio"] = anio
            r["_mes"]  = mes
        todas_filas.extend(filas)

    # Top proveedores por año
    top_proveedores: dict[str, list] = {}
    for anio, provs in prov_anio.items():
        ordenados = sorted(provs.items(), key=lambda x: x[1]["total"], reverse=True)
        top_proveedores[anio] = [
            {"rut": rut, "razon": d["razon"], "total": d["total"], "docs": d["docs"]}
            for rut, d in ordenados[:20]
        ]

    return resumen_anual, top_proveedores, todas_filas


# ─── Escritura de salidas ─────────────────────────────────────────────────────

def escribir_resumen_anual(resumen: dict) -> None:
    path = os.path.join(DIR_OUT_RCV, "resumen_anual.csv")
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f, delimiter=";")
        writer.writerow(["Año", "Meses", "Documentos", "Neto", "IVA Recuperable", "Exento", "Total"])
        for anio in sorted(resumen):
            d = resumen[anio]
            writer.writerow([
                anio, d["meses"], d["docs"],
                f"{d['neto']:,.0f}", f"{d['iva']:,.0f}",
                f"{d['exento']:,.0f}", f"{d['total']:,.0f}",
            ])
    print(f"  [OK] {path}")


def escribir_top_proveedores(top: dict) -> None:
    path = os.path.join(DIR_OUT_RCV, "top_proveedores.csv")
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f, delimiter=";")
        writer.writerow(["Año", "Ranking", "RUT", "Razón Social", "Total Compras", "N° Docs"])
        for anio in sorted(top):
            for i, prov in enumerate(top[anio], 1):
                writer.writerow([
                    anio, i,
                    prov["rut"], prov["razon"],
                    f"{prov['total']:,.0f}", prov["docs"]
                ])
    print(f"  [OK] {path}")


def escribir_detalle_mensual(resumen: dict) -> None:
    path = os.path.join(DIR_OUT_RCV, "detalle_mensual.csv")
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f, delimiter=";")
        writer.writerow(["Periodo", "Documentos", "Neto", "Total"])
        for anio in sorted(resumen):
            for mes in sorted(resumen[anio]["detalle_meses"]):
                d = resumen[anio]["detalle_meses"][mes]
                writer.writerow([
                    f"{anio}-{mes}", d["docs"],
                    f"{d['neto']:,.0f}", f"{d['total']:,.0f}"
                ])
    print(f"  [OK] {path}")


def imprimir_resumen(resumen: dict, top: dict) -> None:
    print("\n" + "─" * 80)
    print("REGISTRO DE COMPRAS — RESUMEN ANUAL")
    print(f"{'Año':<6} {'Meses':>6} {'Docs':>6} {'Neto ($M)':>12} {'IVA ($M)':>10} "
          f"{'Exento ($M)':>12} {'TOTAL ($M)':>12}")
    print("─" * 80)
    for anio in sorted(resumen):
        d = resumen[anio]
        print(f"{anio:<6} {d['meses']:>6} {d['docs']:>6} "
              f"{d['neto']/1_000_000:>12.1f} {d['iva']/1_000_000:>10.1f} "
              f"{d['exento']/1_000_000:>12.1f} {d['total']/1_000_000:>12.1f}")

    print("\n\nTOP 5 PROVEEDORES POR AÑO")
    for anio in sorted(top):
        print(f"\n  {anio}:")
        for p in top[anio][:5]:
            print(f"    {p['rut']:<15} {p['razon'][:40]:<40} ${p['total']:>15,.0f}")


# ─── Main ────────────────────────────────────────────────────────────────────

def main() -> None:
    crear_dirs()

    print("=" * 60)
    print("PROCESADOR RCV — Registro de Compras y Ventas")
    print("=" * 60)

    resumen, top, _ = procesar_todos()

    print("\nESCRIBIENDO SALIDAS:")
    escribir_resumen_anual(resumen)
    escribir_top_proveedores(top)
    escribir_detalle_mensual(resumen)

    imprimir_resumen(resumen, top)
    print(f"\n[OK] Salidas en: {DIR_OUT_RCV}")


if __name__ == "__main__":
    main()
