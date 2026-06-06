"""
bhe_parser.py
─────────────
Parsea todos los archivos BHE (HTML disfrazados de .xls) del SII y retorna
una lista normalizada de boletas de honorarios electrónicas.

Detecta automáticamente el mes desde las fechas dentro del archivo.
Filtra solo boletas VIGENTES (excluye NULAS y ANULADAS).

Uso como módulo:
    from bhe_parser import cargar_todas_bhe
    boletas = cargar_todas_bhe()

Uso directo:
    python bhe_parser.py   → imprime resumen y guarda JSON
"""
from __future__ import annotations

import io
import json
import os
import re
import sys
from collections import defaultdict
from dataclasses import dataclass, asdict
from typing import Optional

if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    except Exception:
        pass

from config import DIR_BHE, DIR_OUTPUT, TRIMESTRES, crear_dirs


# ─── Modelo ─────────────────────────────────────────────────────────────────

@dataclass
class Boleta:
    anio:          int
    mes:           int          # 1-12
    trimestre:     int          # 1-4
    nro_boleta:    str
    fecha:         str          # DD/MM/YYYY
    estado:        str          # VIGENTE | NULA | ANULADA | OBSERVADO RECEPTOR
    rut_emisor:    str
    nombre_emisor: str
    es_soc_prof:   bool
    honorario_bruto: int
    retencion:     int
    liquido_pagado: int


# ─── Helpers de parsing HTML ─────────────────────────────────────────────────

def _leer_html(path: str) -> str:
    for enc in ["utf-8", "latin-1", "cp1252"]:
        try:
            with open(path, "r", encoding=enc, errors="strict") as f:
                return f.read()
        except UnicodeDecodeError:
            pass
    with open(path, "r", encoding="latin-1", errors="replace") as f:
        return f.read()


def _extraer_filas(html: str) -> list[list[str]]:
    rows = re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.DOTALL | re.IGNORECASE)
    resultado = []
    for row in rows:
        cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row, re.DOTALL | re.IGNORECASE)
        clean = [re.sub(r"<[^>]+>", "", c).strip() for c in cells]
        if any(clean):
            resultado.append(clean)
    return resultado


def _detectar_mes(filas: list[list[str]]) -> Optional[int]:
    """Infiere el mes del archivo a partir de las fechas en los datos."""
    for fila in filas:
        for celda in fila:
            m = re.match(r"(\d{2})/(\d{2})/(\d{4})", celda)
            if m:
                return int(m.group(2))
    return None


def _limpiar_monto(s: str) -> int:
    s = s.replace(".", "").replace(",", "").strip()
    try:
        return int(s)
    except ValueError:
        return 0


# ─── Parser de archivo mensual ───────────────────────────────────────────────

def parsear_mensual(path: str, anio: int) -> list[Boleta]:
    """Parsea un archivo BHE mensual y retorna lista de boletas VIGENTES."""
    html  = _leer_html(path)
    filas = _extraer_filas(html)

    mes = _detectar_mes(filas)
    if mes is None:
        return []

    # Determinar trimestre
    trimestre = next(
        t for t, info in TRIMESTRES.items() if mes in info["meses"]
    )

    boletas: list[Boleta] = []
    ESTADOS_VALIDOS = {"VIGENTE", "OBSERVADO RECEPTOR"}

    for fila in filas:
        # Filas de datos: [nro, fecha, estado, fecha_anulacion?, rut, nombre, soc_prof, bruto, retencion, pagado]
        if len(fila) < 9:
            continue
        if not re.match(r"\d{2}/\d{2}/\d{4}", fila[1] if len(fila) > 1 else ""):
            continue

        try:
            nro    = fila[0].strip()
            fecha  = fila[1].strip()
            estado = fila[2].strip().upper()

            # Ajustar índice si hay columna fecha_anulacion
            if len(fila) >= 10 and re.match(r"\d{2}/\d{2}/\d{4}", fila[3]):
                rut_idx    = 4
            else:
                rut_idx    = 4 if len(fila) == 10 else 4

            rut        = fila[4].strip()
            nombre     = fila[5].strip()[:60]
            soc_prof   = fila[6].strip().upper() == "SI"
            bruto      = _limpiar_monto(fila[7])
            retencion  = _limpiar_monto(fila[8])
            pagado     = _limpiar_monto(fila[9]) if len(fila) > 9 else bruto - retencion

        except (IndexError, ValueError):
            continue

        if estado not in ESTADOS_VALIDOS:
            continue
        if bruto == 0:
            continue

        boletas.append(Boleta(
            anio=anio,
            mes=mes,
            trimestre=trimestre,
            nro_boleta=nro,
            fecha=fecha,
            estado=estado,
            rut_emisor=rut,
            nombre_emisor=nombre,
            es_soc_prof=soc_prof,
            honorario_bruto=bruto,
            retencion=retencion,
            liquido_pagado=pagado,
        ))

    return boletas


# ─── Carga completa ──────────────────────────────────────────────────────────

def _archivos_bhe_anio(anio: int) -> list[str]:
    """Lista los archivos mensuales BHE para un año dado."""
    if anio == 2022:
        base = os.path.join(DIR_BHE, "2022", "ENERO")
    else:
        base = os.path.join(DIR_BHE, str(anio))

    if not os.path.isdir(base):
        return []

    archivos = [
        os.path.join(base, f)
        for f in os.listdir(base)
        if f.startswith("file_informeMensualREC") and f.endswith(".xls")
    ]
    return sorted(archivos)


def cargar_todas_bhe(anios: list[int] | None = None) -> list[Boleta]:
    """
    Carga todas las boletas de todos los años disponibles.
    Elimina duplicados de mes (mismo mes procesado dos veces).
    """
    if anios is None:
        anios = [2022, 2023, 2024, 2025]

    todas: list[Boleta] = []
    meses_procesados: set[tuple[int, int]] = set()  # (anio, mes)

    for anio in anios:
        archivos = _archivos_bhe_anio(anio)
        print(f"\n{anio}: {len(archivos)} archivos mensuales BHE")

        for path in archivos:
            boletas = parsear_mensual(path, anio)
            if not boletas:
                continue

            mes = boletas[0].mes
            clave = (anio, mes)

            if clave in meses_procesados:
                # Duplicado (ej. SEP 2025 aparece dos veces)
                print(f"  [DUP]  {anio}-{mes:02d} ya procesado — {os.path.basename(path)}")
                continue

            meses_procesados.add(clave)
            todas.extend(boletas)
            print(f"  [OK]   {anio}-{mes:02d} → {len(boletas)} boletas vigentes | "
                  f"Bruto: ${sum(b.honorario_bruto for b in boletas):,.0f}")

    return todas


# ─── Resumen ─────────────────────────────────────────────────────────────────

def resumen_por_anio(boletas: list[Boleta]) -> dict:
    """Agrupa totales por año."""
    totales: dict[int, dict] = {}
    for b in boletas:
        if b.anio not in totales:
            totales[b.anio] = {"boletas": 0, "bruto": 0, "retencion": 0, "pagado": 0}
        totales[b.anio]["boletas"]   += 1
        totales[b.anio]["bruto"]     += b.honorario_bruto
        totales[b.anio]["retencion"] += b.retencion
        totales[b.anio]["pagado"]    += b.liquido_pagado
    return totales


def resumen_por_persona(boletas: list[Boleta]) -> dict:
    """Agrupa totales por persona (RUT) por año."""
    totales: dict[tuple, dict] = defaultdict(lambda: {"nombre": "", "boletas": 0,
                                                        "bruto": 0, "retencion": 0})
    for b in boletas:
        key = (b.anio, b.rut_emisor)
        totales[key]["nombre"]    = b.nombre_emisor
        totales[key]["boletas"]  += 1
        totales[key]["bruto"]    += b.honorario_bruto
        totales[key]["retencion"]+= b.retencion
    return dict(totales)


# ─── Main ────────────────────────────────────────────────────────────────────

def main() -> None:
    crear_dirs()
    print("=" * 60)
    print("PARSER BHE — Boletas de Honorarios Electrónicas")
    print("=" * 60)

    boletas = cargar_todas_bhe()

    print("\n" + "─" * 60)
    print("RESUMEN ANUAL")
    print(f"{'Año':<6} {'Boletas':>8} {'Bruto':>18} {'Retención':>14} {'Líquido':>18}")
    print("─" * 60)

    tot = resumen_por_anio(boletas)
    for anio in sorted(tot):
        d = tot[anio]
        print(f"{anio:<6} {d['boletas']:>8} {d['bruto']:>18,} {d['retencion']:>14,} {d['pagado']:>18,}")

    # Guardar JSON para uso por otros procesadores
    out_json = os.path.join(DIR_OUTPUT, "bhe_todas.json")
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump([asdict(b) for b in boletas], f, ensure_ascii=False, indent=2)
    print(f"\n[OK] JSON guardado: {out_json}")
    print(f"     Total boletas vigentes: {len(boletas):,}")


if __name__ == "__main__":
    main()
