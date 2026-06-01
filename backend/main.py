"""
main.py — Punto de entrada del pipeline FinParty
Modos de uso:
  python main.py            → Ejecuta el pipeline UNA VEZ ahora mismo
  python main.py --daemon   → Modo demonio: ejecuta diariamente a la hora configurada
  python main.py --test     → Prueba conexión IMAP y BD sin procesar nada
"""
from __future__ import annotations

import argparse
import logging
import sys
from datetime import datetime

import schedule
import time

from config import HORA_EJECUCION, LOG_LEVEL
from pipeline import ejecutar_pipeline

# ─── Logging ──────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("logs/pipeline.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(
        description="FinParty — Pipeline de ingesta financiera"
    )
    parser.add_argument(
        "--daemon", action="store_true",
        help=f"Modo demonio: ejecutar diariamente a las {HORA_EJECUCION}",
    )
    parser.add_argument(
        "--test", action="store_true",
        help="Probar conexiones (IMAP + BD) sin procesar emails",
    )
    args = parser.parse_args()

    if args.test:
        ejecutar_test()
        return

    if args.daemon:
        ejecutar_modo_daemon()
    else:
        # Ejecución única
        logger.info("Ejecución manual del pipeline")
        resumen = ejecutar_pipeline()
        sys.exit(0 if not resumen["errores"] else 1)


def ejecutar_modo_daemon():
    """Programa ejecución diaria y entra en bucle infinito."""
    logger.info("🕐 Modo demonio activo — pipeline programado a las %s", HORA_EJECUCION)

    schedule.every().day.at(HORA_EJECUCION).do(ejecutar_pipeline)

    # Mostrar próxima ejecución
    proxima = schedule.next_run()
    logger.info("   Próxima ejecución: %s", proxima)

    while True:
        schedule.run_pending()
        time.sleep(30)  # revisar cada 30 segundos


def ejecutar_test():
    """Verifica conectividad sin procesar datos."""
    import sys
    errores = []

    print("\n🔍 FinParty — Verificación de Conexiones\n" + "─" * 45)

    # ─── Base de datos ─────────────────────────────────────────
    print("📦 PostgreSQL...", end=" ", flush=True)
    try:
        from db.database import engine, create_tables
        with engine.connect() as conn:
            from sqlalchemy import text
            conn.execute(text("SELECT 1"))
        create_tables()
        print("✅ OK")
    except Exception as e:
        print(f"❌ ERROR: {e}")
        errores.append(f"PostgreSQL: {e}")

    # ─── IMAP ──────────────────────────────────────────────────
    print("📧 IMAP...", end=" ", flush=True)
    try:
        from email_reader import EmailReader
        with EmailReader() as reader:
            uids = reader.obtener_uids_nuevos(desde_dias=1)
            print(f"✅ OK ({len(uids)} email(s) en último día)")
    except Exception as e:
        print(f"❌ ERROR: {e}")
        errores.append(f"IMAP: {e}")

    # ─── UF ────────────────────────────────────────────────────
    print("💰 mindicador.cl (UF)...", end=" ", flush=True)
    try:
        import requests
        from config import MINDICADOR_URL
        resp = requests.get(MINDICADOR_URL, timeout=8)
        resp.raise_for_status()
        data = resp.json()
        uf_val = data["serie"][0]["valor"]
        print(f"✅ OK (UF hoy: ${uf_val:,.2f})")
    except Exception as e:
        print(f"❌ ERROR: {e}")
        errores.append(f"UF: {e}")

    print("─" * 45)
    if errores:
        print(f"\n⚠  {len(errores)} error(es) detectado(s):")
        for e in errores:
            print(f"   • {e}")
        sys.exit(1)
    else:
        print("\n✅ Todas las conexiones OK. Pipeline listo para ejecutar.")
        sys.exit(0)


if __name__ == "__main__":
    main()
