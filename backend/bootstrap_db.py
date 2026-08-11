"""
bootstrap_db.py — Inicializa la base de datos de la intranet en UN solo comando.

Idempotente. Ejecuta, en orden:
  1. Extensiones (uuid-ossp, pg_trgm) + esquema 'finparty'.
  2. search_path PERSISTENTE del rol -> finparty (coherencia con las migraciones
     finparty.* de api/main.py; sin esto las tablas caen en 'public' y los ALTER
     fallan en silencio).
  3. Creacion de tablas (SQLAlchemy, en el esquema finparty).
  4. Migraciones idempotentes de columnas (anulada, debe_cambiar_password, ...).
  5. Seed del usuario admin (si ADMIN_USER / ADMIN_PASS estan definidos).

Pensado para la INICIALIZACION de una BD nueva (ver hoja de ruta, Fase 2).

Uso:
  cd backend
  docker compose up -d postgres        # si la BD aun no esta levantada
  ADMIN_USER=admin@pcch.cl ADMIN_PASS='ClaveFuerte!' python bootstrap_db.py
"""
from __future__ import annotations

import sys

from sqlalchemy import text

import config
from db.database import engine, SessionLocal, Base
from db.models import Usuario
from api.security import hash_password


DDL = [
    'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"',
    'CREATE EXTENSION IF NOT EXISTS "pg_trgm"',
    "CREATE SCHEMA IF NOT EXISTS finparty",
]

# Mismas migraciones que aplica api/main.py al arrancar (deben coincidir).
MIGRACIONES = [
    "ALTER TABLE finparty.documentos_cargados ADD COLUMN IF NOT EXISTS anulada boolean DEFAULT false",
    "ALTER TABLE finparty.documentos_cargados ADD COLUMN IF NOT EXISTS fecha_anulacion date",
    "ALTER TABLE finparty.documentos_cargados ADD COLUMN IF NOT EXISTS motivo_anulacion text",
    "ALTER TABLE finparty.usuarios ADD COLUMN IF NOT EXISTS debe_cambiar_password boolean DEFAULT false",
    # RRHH (spec §3.2 / §3.9): columnas nuevas en tablas ya existentes.
    "ALTER TABLE finparty.contratos ADD COLUMN IF NOT EXISTS unidad_id bigint",
    "ALTER TABLE finparty.contratos ADD COLUMN IF NOT EXISTS jefatura_directa_id bigint",
    "ALTER TABLE finparty.contratos ADD COLUMN IF NOT EXISTS jornada varchar(32)",
    "ALTER TABLE finparty.contratos ADD COLUMN IF NOT EXISTS sueldo_base_cifrado text",
    "ALTER TABLE finparty.contratos ADD COLUMN IF NOT EXISTS centro_costo varchar(64)",
    "ALTER TABLE finparty.audit_log ADD COLUMN IF NOT EXISTS ip varchar(64)",
]


def paso(msg: str) -> None: print(f"[..] {msg}")
def ok(msg: str) -> None:   print(f"[OK] {msg}")
def err(msg: str) -> None:  print(f"[ERROR] {msg}")


def main() -> int:
    # ── 1-4. Esquema + search_path + tablas + migraciones (una transaccion) ──
    try:
        with engine.begin() as conn:
            paso("Extensiones y esquema 'finparty'")
            for sql in DDL:
                conn.execute(text(sql))

            # search_path persistente del rol: hace que TODA conexion futura
            # (incluida la API) use 'finparty' por defecto -> coherente con los
            # ALTER finparty.* y con las tablas creadas abajo.
            conn.execute(text(f'ALTER ROLE "{config.DB_USER}" SET search_path = finparty, public'))
            conn.execute(text("SET search_path TO finparty, public"))
            ok("Extensiones, esquema y search_path listos")

            paso("Creando tablas")
            Base.metadata.create_all(bind=conn)  # usa el search_path de esta conexion
            ok("Tablas creadas")

            paso("Migraciones de columnas")
            for sql in MIGRACIONES:
                conn.execute(text(sql))
            ok("Migraciones aplicadas")
    except Exception as e:
        err(f"No se pudo inicializar la BD: {e}")
        err("Verifica que PostgreSQL este levantado y las credenciales DB_* del .env.")
        return 1

    # ── 5. Seed admin (opcional) ──
    if not config.ADMIN_USER or not config.ADMIN_PASS:
        print("[..] Seed admin omitido: define ADMIN_USER y ADMIN_PASS para crear el admin.")
        ok("Bootstrap completado (sin seed de admin).")
        return 0
    if len(config.ADMIN_PASS) < 8:
        err("ADMIN_PASS debe tener al menos 8 caracteres. Bootstrap finalizado sin seed.")
        return 1

    with SessionLocal() as db:
        username = config.ADMIN_USER.lower().strip()
        if db.query(Usuario).filter(Usuario.username == username).first():
            ok(f"Admin '{username}' ya existe (no se modifica).")
        else:
            db.add(Usuario(
                username=username,
                password_hash=hash_password(config.ADMIN_PASS),
                nombre=config.ADMIN_NOMBRE,
                rol="admin",
                permanente=True,
                creado_por="bootstrap_db",
                debe_cambiar_password=False,  # el operador definio esta clave
            ))
            db.commit()
            ok(f"Admin '{username}' creado.")

    ok("Bootstrap completado.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
