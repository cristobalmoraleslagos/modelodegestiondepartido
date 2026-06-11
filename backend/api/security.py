"""
security.py — Capa de seguridad de la intranet FinParty.

Provee:
  - Hash y verificación de contraseñas (bcrypt vía passlib).
  - Emisión y validación de tokens JWT (HS256).
  - Dependencias FastAPI para autenticación y RBAC.
  - Registro de auditoría inmutable (tabla audit_log).
  - Bloqueo de cuenta por intentos fallidos.

Principios de ciberseguridad aplicados:
  - Contraseñas NUNCA en claro: solo hash bcrypt. No se loguean.
  - Secreto JWT por variable de entorno (config.JWT_SECRET).
  - RBAC verificado en el servidor (no confiar en el frontend).
  - Toda acción sensible queda en audit_log con usuario y timestamp.
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

import config
from db.database import SessionLocal
from db.models import Usuario, AuditLog

# El tokenUrl es informativo (Swagger); el login real es POST /api/auth/login.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


# ─── Contraseñas ──────────────────────────────────────────────────────────────
# Se usa la librería bcrypt directamente (passlib 1.7.4 es incompatible con
# bcrypt >= 4.1). bcrypt sólo considera los primeros 72 bytes: se truncan
# explícitamente para evitar el ValueError de longitud.
def _prep(plano: str) -> bytes:
    return plano.encode("utf-8")[:72]


def hash_password(plano: str) -> str:
    return bcrypt.hashpw(_prep(plano), bcrypt.gensalt()).decode("utf-8")


def verify_password(plano: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_prep(plano), hashed.encode("utf-8"))
    except Exception:
        return False


# ─── JWT ──────────────────────────────────────────────────────────────────────
def crear_token(usuario: Usuario) -> str:
    ahora = datetime.now(timezone.utc)
    payload = {
        "sub": usuario.username,
        "uid": usuario.id,
        "rol": usuario.rol,
        "nombre": usuario.nombre,
        "iat": ahora,
        "exp": ahora + timedelta(minutes=config.JWT_EXPIRE_MIN),
    }
    return jwt.encode(payload, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)


def decodificar_token(token: str) -> dict:
    return jwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])


# ─── Sesión de BD por request ───────────────────────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─── Dependencia de autenticación ──────────────────────────────────────────────
def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    cred_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No autenticado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise cred_error
    try:
        payload = decodificar_token(token)
        username = payload.get("sub")
        if not username:
            raise cred_error
    except JWTError:
        raise cred_error

    user = db.query(Usuario).filter(Usuario.username == username).first()
    if not user or not user.activo:
        raise cred_error
    return user


# ─── Factory RBAC ───────────────────────────────────────────────────────────────
def require_rol(*roles: str):
    """Dependencia que exige uno de los roles indicados."""
    def _checker(user: Usuario = Depends(get_current_user)) -> Usuario:
        if user.rol not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requiere rol: {', '.join(roles)}",
            )
        return user
    return _checker


# ─── Auditoría ──────────────────────────────────────────────────────────────────
def registrar_auditoria(
    db: Session,
    accion: str,
    usuario: Optional[str] = None,
    entidad: Optional[str] = None,
    entidad_id: Optional[int] = None,
    detalle: Optional[dict] = None,
) -> None:
    """Inserta un registro inmutable en audit_log. No interrumpe el flujo si falla."""
    try:
        db.add(AuditLog(
            accion=accion,
            entidad=entidad,
            entidad_id=entidad_id,
            usuario=usuario,
            detalle=json.dumps(detalle, ensure_ascii=False) if detalle else None,
        ))
        db.commit()
    except Exception:
        db.rollback()


# ─── Bloqueo por intentos fallidos ──────────────────────────────────────────────
def esta_bloqueado(user: Usuario) -> bool:
    if user.bloqueado_hasta is None:
        return False
    return datetime.now(timezone.utc) < user.bloqueado_hasta


def registrar_intento_fallido(db: Session, user: Usuario) -> None:
    user.intentos_fallidos = (user.intentos_fallidos or 0) + 1
    if user.intentos_fallidos >= config.LOGIN_MAX_INTENTOS:
        user.bloqueado_hasta = datetime.now(timezone.utc) + timedelta(minutes=config.LOGIN_BLOQUEO_MIN)
        user.intentos_fallidos = 0
    db.commit()


def registrar_login_exitoso(db: Session, user: Usuario) -> None:
    user.intentos_fallidos = 0
    user.bloqueado_hasta = None
    user.ultimo_acceso = datetime.now(timezone.utc)
    db.commit()
