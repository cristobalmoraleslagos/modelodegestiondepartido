"""
seed_admin.py — Crea (idempotente) el primer usuario administrador.

Uso:
  ADMIN_USER=admin@pcch.cl ADMIN_PASS='UnaClaveFuerte!' python seed_admin.py

La contraseña se guarda SOLO como hash bcrypt. Nunca se almacena en claro.
Si el usuario ya existe, no hace nada (no sobreescribe la contraseña).
"""
from __future__ import annotations

import sys

import config
from db.database import SessionLocal, create_tables
from db.models import Usuario
from api.security import hash_password


def main() -> int:
    if not config.ADMIN_USER or not config.ADMIN_PASS:
        print("ERROR: define ADMIN_USER y ADMIN_PASS por entorno antes de correr el seed.")
        return 1
    if len(config.ADMIN_PASS) < 8:
        print("ERROR: ADMIN_PASS debe tener al menos 8 caracteres.")
        return 1

    create_tables()
    with SessionLocal() as db:
        username = config.ADMIN_USER.lower().strip()
        existente = db.query(Usuario).filter(Usuario.username == username).first()
        if existente:
            print(f"OK: el usuario admin '{username}' ya existe (no se modifica).")
            return 0
        admin = Usuario(
            username=username,
            password_hash=hash_password(config.ADMIN_PASS),
            nombre=config.ADMIN_NOMBRE,
            rol="admin",
            permanente=True,
            creado_por="seed_admin",
            debe_cambiar_password=False,  # el operador definió esta clave; no se fuerza cambio
            aprobado=True,                # el admin inicial no requiere aprobación
        )
        db.add(admin)
        db.commit()
        print(f"OK: usuario admin '{username}' creado.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
