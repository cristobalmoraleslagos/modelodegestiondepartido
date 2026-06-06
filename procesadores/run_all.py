"""
run_all.py — Orquestador principal de procesadores FinParty SERVEL
──────────────────────────────────────────────────────────────────
Ejecuta en orden:
  1. Reconstruir trimestres M12 Gastos (Q1/Q2/Q3 desde Q4 acumulado)
  2. Parsear BHE y guardar JSON
  3. Generar Nómina SERVEL >20 UTM desde BHE
  4. Resumir RCV (compras)
  5. Generar informe de estado de rendición SERVEL

Uso:
  python run_all.py
  python run_all.py --solo-estado    (solo el informe, sin reprocesar)
"""
from __future__ import annotations

import io
import sys
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")


def separador(titulo: str) -> None:
    print("\n" + "█" * 65)
    print(f"  {titulo}")
    print("█" * 65)


def main() -> None:
    solo_estado = "--solo-estado" in sys.argv

    inicio = time.time()

    print("\n" + "═" * 65)
    print("  FinParty SERVEL — Procesador completo")
    print("  PCCh PP007 · RUT 71.701.800-1")
    print("═" * 65)

    # ── 1. Trimestres ────────────────────────────────────────────────
    if not solo_estado:
        separador("PASO 1 · Reconstruir trimestres M12 Gastos")
        from reconstruir_trimestres import main as paso1
        paso1()

    # ── 2. BHE Parser ────────────────────────────────────────────────
    if not solo_estado:
        separador("PASO 2 · Parsear BHE (Boletas Honorarios Electrónicas)")
        from bhe_parser import main as paso2
        paso2()

    # ── 3. Nómina SERVEL ─────────────────────────────────────────────
    if not solo_estado:
        separador("PASO 3 · Generar Nómina contrataciones >20 UTM")
        from generar_nomina_servel import main as paso3
        paso3()

    # ── 4. RCV Resumen ───────────────────────────────────────────────
    if not solo_estado:
        separador("PASO 4 · Resumir Registro de Compras y Ventas")
        from rcv_resumen import main as paso4
        paso4()

    # ── 5. Estado SERVEL ─────────────────────────────────────────────
    separador("PASO 5 · Informe de estado SERVEL")
    from estado_servel import generar_informe
    generar_informe()

    # ── Resumen final ─────────────────────────────────────────────────
    duracion = time.time() - inicio
    print(f"\n✅ Completado en {duracion:.1f} segundos")
    print("\nARCHIVOS GENERADOS EN: procesadores/output/")
    print("  ├── M12_Gastos/            → CSVs trimestrales (SERVEL M12)")
    print("  ├── Nomina_Contrataciones/ → CSVs nómina >20 UTM por trimestre")
    print("  ├── RCV_Resumen/           → Resúmenes de compras anuales")
    print("  ├── bhe_todas.json         → Todas las BHEs parseadas")
    print("  └── estado_rendicion_servel.csv → Estado completo por período")
    print()


if __name__ == "__main__":
    main()
