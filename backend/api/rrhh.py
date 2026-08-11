"""
rrhh.py — Router de la plataforma de RRHH (ver RRHH/HOJA-RUTA-RRHH.md).

MVP Fase 1: gestión de la ficha de funcionarios/as. Un admin incorpora nuevas
personas; jefatura/auditor pueden listar y consultar. Toda acción queda auditada
con IP (spec §6). Reutiliza la capa de seguridad de la intranet (JWT + RBAC).

Endpoints (bajo /api/rrhh):
  POST   /empleados          (admin)               — incorporar funcionario/a
  GET    /empleados          (admin|jefatura|auditor)
  GET    /empleados/{id}     (admin|jefatura|auditor)
  PATCH  /empleados/{id}     (admin)               — editar ficha / estado
"""
from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from db.models import Empleado, Usuario
from api.security import get_db, require_rol, registrar_auditoria

router = APIRouter(prefix="/api/rrhh")

ESTADOS_EMPLEADO = ("activo", "inactivo", "licencia", "desvinculado")


# ── Schemas ──────────────────────────────────────────────────────────────────
class EmpleadoCrear(BaseModel):
    rut:               str = Field(min_length=3, max_length=20)
    nombres:           str = Field(min_length=1)
    apellidos:         str = Field(min_length=1)
    fecha_nacimiento:  Optional[date] = None
    genero:            Optional[str] = None
    email_personal:    Optional[str] = None
    email_corporativo: Optional[str] = None
    telefono:          Optional[str] = None
    direccion:         Optional[str] = None
    contacto_emergencia: Optional[dict] = None
    estado:            str = "activo"
    fecha_ingreso:     Optional[date] = None
    unidad_id:         Optional[int] = None


class EmpleadoPatch(BaseModel):
    nombres:           Optional[str] = None
    apellidos:         Optional[str] = None
    fecha_nacimiento:  Optional[date] = None
    genero:            Optional[str] = None
    email_personal:    Optional[str] = None
    email_corporativo: Optional[str] = None
    telefono:          Optional[str] = None
    direccion:         Optional[str] = None
    contacto_emergencia: Optional[dict] = None
    estado:            Optional[str] = None
    fecha_ingreso:     Optional[date] = None
    fecha_egreso:      Optional[date] = None
    unidad_id:         Optional[int] = None


def _serializar(e: Empleado) -> dict:
    return {
        "id": e.id, "rut": e.rut, "nombres": e.nombres, "apellidos": e.apellidos,
        "estado": e.estado, "email_corporativo": e.email_corporativo,
        "telefono": e.telefono, "unidad_id": e.unidad_id,
        "fecha_ingreso": e.fecha_ingreso.isoformat() if e.fecha_ingreso else None,
        "fecha_egreso": e.fecha_egreso.isoformat() if e.fecha_egreso else None,
    }


# ── Endpoints ────────────────────────────────────────────────────────────────
@router.post("/empleados", status_code=201)
def crear_empleado(
    body: EmpleadoCrear,
    request: Request,
    user: Usuario = Depends(require_rol("admin")),
    db: Session = Depends(get_db),
):
    if body.estado not in ESTADOS_EMPLEADO:
        raise HTTPException(400, f"Estado inválido: {body.estado}")
    rut = body.rut.strip()
    if db.query(Empleado).filter(Empleado.rut == rut).first():
        raise HTTPException(409, "Ya existe un funcionario/a con ese RUT")

    e = Empleado(
        rut=rut, nombres=body.nombres.strip(), apellidos=body.apellidos.strip(),
        fecha_nacimiento=body.fecha_nacimiento, genero=body.genero,
        email_personal=body.email_personal, email_corporativo=body.email_corporativo,
        telefono=body.telefono, direccion=body.direccion,
        contacto_emergencia=body.contacto_emergencia, estado=body.estado,
        fecha_ingreso=body.fecha_ingreso, unidad_id=body.unidad_id,
        actualizado_por=user.username,
    )
    db.add(e); db.commit(); db.refresh(e)
    registrar_auditoria(db, "RRHH_EMPLEADO_CREADO", usuario=user.username,
                        entidad="empleados", entidad_id=e.id,
                        detalle={"rut": e.rut}, ip=request.client.host if request.client else None)
    return _serializar(e)


@router.get("/empleados")
def listar_empleados(
    estado: Optional[str] = Query(None),
    q: Optional[str] = Query(None, description="Busca por RUT o nombre"),
    user: Usuario = Depends(require_rol("admin", "jefatura", "auditor")),
    db: Session = Depends(get_db),
):
    query = db.query(Empleado)
    if estado:
        query = query.filter(Empleado.estado == estado)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            (Empleado.rut.ilike(like)) | (Empleado.nombres.ilike(like)) | (Empleado.apellidos.ilike(like))
        )
    empleados = query.order_by(Empleado.apellidos, Empleado.nombres).limit(2000).all()
    return [_serializar(e) for e in empleados]


@router.get("/empleados/{eid}")
def obtener_empleado(
    eid: int,
    user: Usuario = Depends(require_rol("admin", "jefatura", "auditor")),
    db: Session = Depends(get_db),
):
    e = db.query(Empleado).get(eid)
    if not e:
        raise HTTPException(404, "Funcionario/a no encontrado")
    return _serializar(e)


@router.patch("/empleados/{eid}")
def editar_empleado(
    eid: int,
    body: EmpleadoPatch,
    request: Request,
    user: Usuario = Depends(require_rol("admin")),
    db: Session = Depends(get_db),
):
    e = db.query(Empleado).get(eid)
    if not e:
        raise HTTPException(404, "Funcionario/a no encontrado")
    if body.estado is not None and body.estado not in ESTADOS_EMPLEADO:
        raise HTTPException(400, f"Estado inválido: {body.estado}")

    cambios = body.model_dump(exclude_unset=True)
    for campo, valor in cambios.items():
        setattr(e, campo, valor)
    e.actualizado_por = user.username
    db.commit()
    registrar_auditoria(db, "RRHH_EMPLEADO_EDITADO", usuario=user.username,
                        entidad="empleados", entidad_id=e.id,
                        detalle={"campos": list(cambios.keys())},
                        ip=request.client.host if request.client else None)
    return _serializar(e)
