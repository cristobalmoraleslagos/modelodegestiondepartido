"""
import_gastos.py — Importa los CSVs SERVEL (Módulo 12 Gastos) a PostgreSQL
Detecta la codificación latin-1, normaliza categorías y hace upsert.

Uso:
    python import_gastos.py                        # importa desde ./data/gastos/
    python import_gastos.py --dir /ruta/a/csvs
    python import_gastos.py --reset                # borra tabla y reimporta todo
"""
from __future__ import annotations

import argparse
import csv
import glob
import logging
import os
import sys
from pathlib import Path

# Agregar directorio raíz al path para importar config y db
sys.path.insert(0, str(Path(__file__).parent))

from db.database import create_tables, SessionLocal
from db.models import GastoMensual

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ─── Meses → número ───────────────────────────────────────────────────────────
MESES = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4,
    "mayo": 5, "junio": 6, "julio": 7, "agosto": 8,
    "septiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12,
}
CABECERAS_MES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                 "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

# ─── Normalización de categorías ──────────────────────────────────────────────
# Mapea los distintos textos del CSV a una categoría canónica
_RAW_MAP: list[tuple[list[str], str]] = [
    (["personal"], "personal"),
    (["adquisici", "bienes o servicios", "gastos corrientes", "bienes y servicios"], "bienes_servicios"),
    (["otros gastos de administr", "otros gastos admin"], "otros_admin"),
    (["fomento a la participaci", "fomento a participaci", "10% mujer", "actividades 10%"], "genero"),
    (["j", "venes", "juvenil", "fomento a la participaci"], "juvenil"),  # aplicar después de genero
    (["educaci", "c", "vica", "educacion civica"], "educacion_civica"),
    (["prestamo", "pr", "stamo", "cr", "dito", "credito", "financiero"], "prestamos"),
    (["activo fijo"], "activo_fijo"),
    (["campa", "electoral", "aporte campa", "gasto electoral", "publicidad electoral",
      "honorarios campa", "material gr", "menores campa"], "campana"),
    (["transferencia"], "transferencias"),
    (["inversi"], "inversiones"),
    (["cheque", "devoluci", "reintegro", "anticipo", "abono mutuo",
      "provisi", "notarial", "eventos parti", "preparaci", "formaci",
      "investigaci"], "otros"),
]

def _normalizar(raw: str) -> str:
    """Mapea un ítem de CSV a su categoría canónica."""
    texto = raw.lower()

    # Orden importa: juvenil debe evaluarse ANTES que genero si ambas keywords coinciden
    # Pero en la práctica "participación femenina" y "participación jóvenes" son distintas
    if any(k in texto for k in ["joven", "juvenil", "jóvenes"]):
        return "juvenil"
    if any(k in texto for k in ["femenin", "mujer", "10% mujer", "participación f"]):
        return "genero"
    if "personal" in texto:
        return "personal"
    if any(k in texto for k in ["adquisici", "bienes", "servicios corrientes"]):
        return "bienes_servicios"
    if any(k in texto for k in ["educaci", "cívica", "civica"]):
        return "educacion_civica"
    if any(k in texto for k in ["otro", "administr"]):
        return "otros_admin"
    if any(k in texto for k in ["préstamo", "prestamo", "crédito", "credito", "financiero"]):
        return "prestamos"
    if "activo fijo" in texto:
        return "activo_fijo"
    if any(k in texto for k in ["campaña", "campana", "electoral", "publicidad",
                                  "honorarios camp", "material gráf", "menores camp"]):
        return "campana"
    if "transferencia" in texto:
        return "transferencias"
    if "inversi" in texto:
        return "inversiones"
    if any(k in texto for k in ["preparaci", "formación", "militantes", "candidatos"]):
        return "formacion"
    return "otros"


# ─── Parseo de monto ───────────────────────────────────────────────────────────
def _monto(raw: str) -> int:
    """Convierte '25.947.995' → 25947995. Retorna 0 si vacío o inválido."""
    limpio = raw.strip().replace(".", "").replace(",", "").replace("$", "")
    try:
        return int(limpio) if limpio else 0
    except ValueError:
        return 0


# ─── Procesamiento de un CSV ───────────────────────────────────────────────────
def procesar_csv(ruta: Path) -> list[dict]:
    """
    Lee un CSV SERVEL (encoding latin-1, separador ;) y retorna lista de registros.
    Cada registro: {año, mes, categoria, monto, fuente}
    """
    registros = []
    fuente = ruta.name  # ej: "2026-1.csv"

    try:
        with open(ruta, encoding="latin-1", newline="") as f:
            reader = csv.reader(f, delimiter=";")
            headers = next(reader)  # primera fila

            # Verificar que el CSV tenga el formato esperado
            if "Item de Gastos" not in headers[2] and "tem de" not in "".join(headers[:4]).lower():
                log.warning("  ⚠ Formato inesperado en %s — saltando", ruta.name)
                return []

            for row in reader:
                if len(row) < 5 or not row[0].strip():
                    continue

                try:
                    año = int(row[0].strip())
                except ValueError:
                    continue

                item_raw = row[2].strip()
                if not item_raw:
                    continue

                categoria = _normalizar(item_raw)

                for i, mes_nombre in enumerate(CABECERAS_MES):
                    col_idx = i + 4  # columnas 4–15 son enero–diciembre
                    if col_idx >= len(row):
                        break
                    monto = _monto(row[col_idx])
                    if monto == 0:
                        continue  # no insertar ceros — ahorra espacio y claridad

                    registros.append({
                        "año": año,
                        "mes": i + 1,
                        "categoria": categoria,
                        "monto": monto,
                        "fuente": fuente,
                        "item_original": item_raw,
                    })

    except Exception as e:
        log.error("Error leyendo %s: %s", ruta.name, e)

    return registros


# ─── Carga a PostgreSQL con upsert (acumulación por categoría) ────────────────
def cargar_registros(session, registros: list[dict], fuente: str) -> tuple[int, int]:
    """
    Carga registros en la tabla gastos_mensuales.
    Para el mismo año/mes/categoria, SUMA los montos (varios ítems → 1 categoría).

    Returns: (nuevos, actualizados)
    """
    # Agregar por año/mes/categoria antes de insertar
    agrupado: dict[tuple, int] = {}
    for r in registros:
        clave = (r["año"], r["mes"], r["categoria"])
        agrupado[clave] = agrupado.get(clave, 0) + r["monto"]

    nuevos = actualizados = 0
    for (año, mes, categoria), monto in agrupado.items():
        existing = (
            session.query(GastoMensual)
            .filter_by(año=año, mes=mes, categoria=categoria)
            .first()
        )
        if existing:
            existing.monto = monto  # sobrescribir con dato más reciente
            existing.fuente = fuente
            actualizados += 1
        else:
            session.add(GastoMensual(
                año=año, mes=mes, categoria=categoria,
                monto=monto, fuente=fuente,
            ))
            nuevos += 1

    return nuevos, actualizados


# ─── Punto de entrada ─────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Importar CSVs SERVEL a PostgreSQL")
    parser.add_argument("--dir", default=None,
                        help="Directorio con los CSVs (default: detecta automáticamente)")
    parser.add_argument("--reset", action="store_true",
                        help="Borrar tabla antes de importar (reimportación completa)")
    args = parser.parse_args()

    # Detectar directorio de CSVs
    if args.dir:
        csv_dir = Path(args.dir)
    else:
        # Buscar en ubicaciones conocidas
        candidatos = [
            Path(__file__).parent.parent / "finanzas" / "Gastos",
            Path(__file__).parent / "data" / "gastos",
            Path(__file__).parent / "gastos",
        ]
        csv_dir = next((p for p in candidatos if p.exists()), None)
        if not csv_dir:
            log.error("No se encontró directorio con CSVs. Usar --dir para especificarlo.")
            log.error("Ubicaciones buscadas: %s", [str(p) for p in candidatos])
            sys.exit(1)

    archivos = sorted(csv_dir.glob("*.csv"))
    if not archivos:
        log.error("No se encontraron archivos .csv en %s", csv_dir)
        sys.exit(1)

    print(f"\n{'═'*55}")
    print(f"  Importador CSVs SERVEL → PostgreSQL")
    print(f"  Directorio: {csv_dir}")
    print(f"  Archivos encontrados: {len(archivos)}")
    print(f"{'═'*55}\n")

    # Crear tablas si no existen
    create_tables()

    with SessionLocal() as session:
        if args.reset:
            log.info("🗑  Limpiando tabla gastos_mensuales...")
            session.query(GastoMensual).delete()
            session.commit()

        total_nuevos = total_act = 0

        for archivo in archivos:
            log.info("📄 Procesando: %s", archivo.name)
            registros = procesar_csv(archivo)

            if not registros:
                log.warning("   Sin registros válidos en %s", archivo.name)
                continue

            # Mostrar distribución de categorías encontradas
            cats = {}
            for r in registros:
                cats[r["categoria"]] = cats.get(r["categoria"], 0) + 1
            log.info("   %d filas → categorías: %s",
                     len(registros),
                     ", ".join(f"{k}({v})" for k, v in sorted(cats.items())))

            nuevos, act = cargar_registros(session, registros, archivo.name)
            session.commit()
            total_nuevos += nuevos
            total_act += act
            log.info("   ✅ %d nuevos, %d actualizados", nuevos, act)

    print(f"\n{'─'*55}")
    print(f"  RESUMEN IMPORTACIÓN")
    print(f"  Archivos procesados: {len(archivos)}")
    print(f"  Registros nuevos:    {total_nuevos}")
    print(f"  Registros actualizados: {total_act}")
    print(f"{'─'*55}\n")


if __name__ == "__main__":
    main()
