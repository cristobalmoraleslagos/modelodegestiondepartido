"""
intranet.py — Router de la intranet de rendición FinParty.

Endpoints (todos bajo /api):
  Auth:       POST /auth/login, GET /auth/me
  Usuarios:   GET/POST /usuarios, PATCH /usuarios/{id}   (solo admin)
  BHE:        POST /bhe/upload, GET /bhe, PATCH /bhe/{id}/anular
  Contratos:  POST /contratos/upload, GET /contratos, GET /contratos/{id}/download
  Informes:   GET /informes/honorarios
  Rendición:  POST /rendicion/generar

Seguridad: cada endpoint sensible exige token (get_current_user) y, cuando
corresponde, un rol (require_rol). Toda acción queda en audit_log.
"""
from __future__ import annotations

import csv
import hashlib
import json
import re
from datetime import date, datetime
from pathlib import Path
from typing import Optional

from fastapi import (
    APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status,
)
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import config
from db.models import Usuario, Contrato, DocumentoCargado, PersonalNomina
from api.security import (
    get_db, get_current_user, usuario_vigente, require_rol, registrar_auditoria,
    hash_password, verify_password, crear_token,
    esta_bloqueado, registrar_intento_fallido, registrar_login_exitoso,
)

router = APIRouter(prefix="/api")


# ══════════════════════════════════════════════════════════════════════════════
#  AUTH
# ══════════════════════════════════════════════════════════════════════════════
class LoginBody(BaseModel):
    username: str
    password: str


@router.post("/auth/login")
def login(body: LoginBody, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.username == body.username.lower().strip()).first()
    # Respuesta uniforme para no revelar si el usuario existe.
    err = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")

    if not user:
        raise err
    if not user.activo:
        raise HTTPException(status_code=403, detail="Usuario desactivado")
    if esta_bloqueado(user):
        raise HTTPException(status_code=423, detail="Cuenta bloqueada temporalmente por intentos fallidos")
    if not verify_password(body.password, user.password_hash):
        registrar_intento_fallido(db, user)
        registrar_auditoria(db, "LOGIN_FALLIDO", usuario=user.username, entidad="usuarios", entidad_id=user.id)
        raise err

    registrar_login_exitoso(db, user)
    registrar_auditoria(db, "LOGIN_OK", usuario=user.username, entidad="usuarios", entidad_id=user.id)
    token = crear_token(user)
    return {
        "access_token": token,
        "token_type": "bearer",
        "usuario": {"nombre": user.nombre, "rol": user.rol, "username": user.username,
                    "debe_cambiar_password": bool(user.debe_cambiar_password)},
    }


@router.get("/auth/me")
def me(user: Usuario = Depends(get_current_user)):
    return {"nombre": user.nombre, "rol": user.rol, "username": user.username,
            "rut": user.rut, "permanente": user.permanente,
            "debe_cambiar_password": bool(user.debe_cambiar_password)}


# ─── Cambio de contraseña (self-service) ────────────────────────────────────────
class CambiarPasswordBody(BaseModel):
    password_actual: str
    password_nueva: str = Field(min_length=8)


@router.post("/auth/cambiar-password")
def cambiar_password(
    body: CambiarPasswordBody,
    user: Usuario = Depends(get_current_user),  # base: permitido aun con cambio pendiente
    db: Session = Depends(get_db),
):
    if not verify_password(body.password_actual, user.password_hash):
        registrar_auditoria(db, "PASSWORD_CAMBIO_FALLIDO", usuario=user.username,
                            entidad="usuarios", entidad_id=user.id)
        raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta")
    if verify_password(body.password_nueva, user.password_hash):
        raise HTTPException(status_code=400, detail="La nueva contraseña debe ser distinta de la actual")
    user.password_hash = hash_password(body.password_nueva)
    user.debe_cambiar_password = False
    user.intentos_fallidos = 0
    user.bloqueado_hasta = None
    db.commit()
    registrar_auditoria(db, "PASSWORD_CAMBIADA", usuario=user.username,
                        entidad="usuarios", entidad_id=user.id)
    return {"ok": True}


# ══════════════════════════════════════════════════════════════════════════════
#  USUARIOS (solo admin)
# ══════════════════════════════════════════════════════════════════════════════
class UsuarioCrear(BaseModel):
    username: EmailStr
    password: str = Field(min_length=8)
    nombre: str
    rol: str = "funcionario"
    rut: Optional[str] = None
    permanente: bool = True


class UsuarioPatch(BaseModel):
    activo: Optional[bool] = None
    password: Optional[str] = Field(default=None, min_length=8)
    rol: Optional[str] = None


@router.get("/usuarios")
def listar_usuarios(user: Usuario = Depends(require_rol("admin")), db: Session = Depends(get_db)):
    us = db.query(Usuario).order_by(Usuario.nombre).all()
    return [{"id": u.id, "username": u.username, "nombre": u.nombre, "rol": u.rol,
             "rut": u.rut, "activo": u.activo, "permanente": u.permanente,
             "ultimo_acceso": u.ultimo_acceso.isoformat() if u.ultimo_acceso else None} for u in us]


@router.post("/usuarios", status_code=201)
def crear_usuario(body: UsuarioCrear, user: Usuario = Depends(require_rol("admin")), db: Session = Depends(get_db)):
    if body.rol not in ("admin", "funcionario", "auditor"):
        raise HTTPException(400, "Rol inválido")
    if db.query(Usuario).filter(Usuario.username == body.username.lower()).first():
        raise HTTPException(409, "El usuario ya existe")
    nuevo = Usuario(
        username=str(body.username).lower(),
        password_hash=hash_password(body.password),
        nombre=body.nombre, rol=body.rol, rut=body.rut,
        permanente=body.permanente, creado_por=user.username,
        debe_cambiar_password=True,  # clave temporal: el usuario debe cambiarla al ingresar
    )
    db.add(nuevo); db.commit(); db.refresh(nuevo)
    registrar_auditoria(db, "USUARIO_CREADO", usuario=user.username, entidad="usuarios",
                        entidad_id=nuevo.id, detalle={"rol": nuevo.rol, "username": nuevo.username})
    return {"id": nuevo.id, "username": nuevo.username, "nombre": nuevo.nombre, "rol": nuevo.rol}


@router.patch("/usuarios/{uid}")
def editar_usuario(uid: int, body: UsuarioPatch, user: Usuario = Depends(require_rol("admin")), db: Session = Depends(get_db)):
    u = db.query(Usuario).get(uid)
    if not u:
        raise HTTPException(404, "Usuario no encontrado")
    cambios = {}
    if body.activo is not None:
        u.activo = body.activo; cambios["activo"] = body.activo
    if body.rol is not None:
        if body.rol not in ("admin", "funcionario", "auditor"):
            raise HTTPException(400, "Rol inválido")
        u.rol = body.rol; cambios["rol"] = body.rol
    if body.password is not None:
        u.password_hash = hash_password(body.password)
        u.intentos_fallidos = 0; u.bloqueado_hasta = None
        u.debe_cambiar_password = True  # reset por admin: el usuario debe cambiarla al ingresar
        cambios["password"] = "reseteada"
    db.commit()
    registrar_auditoria(db, "USUARIO_EDITADO", usuario=user.username, entidad="usuarios",
                        entidad_id=u.id, detalle=cambios)
    return {"id": u.id, "cambios": cambios}


# ══════════════════════════════════════════════════════════════════════════════
#  BHE — carga, listado, anulación
# ══════════════════════════════════════════════════════════════════════════════
_DATE = re.compile(r"\d{2}/\d{2}/\d{4}")


def _limpiar_monto(s: str) -> int:
    s = (s or "").replace(".", "").replace(",", "").strip()
    try:
        return int(s)
    except ValueError:
        return 0


def _extraer_filas(html: str) -> list[list[str]]:
    out = []
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.DOTALL | re.IGNORECASE):
        cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row, re.DOTALL | re.IGNORECASE)
        clean = [re.sub(r"<[^>]+>", "", c).strip() for c in cells]
        if any(clean):
            out.append(clean)
    return out


def _fecha_iso(ddmmyyyy: str) -> Optional[date]:
    try:
        d, m, y = ddmmyyyy.strip()[:10].split("/")
        return date(int(y), int(m), int(d))
    except Exception:
        return None


def _parsear_bhe(raw: bytes, anio: int) -> list[dict]:
    """Parsea un BHE mensual del SII (HTML-table .xls). CONSERVA las anuladas."""
    html = None
    for enc in ("utf-8", "latin-1", "cp1252"):
        try:
            html = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    if html is None:
        html = raw.decode("latin-1", errors="replace")

    filas = _extraer_filas(html)
    boletas: list[dict] = []
    for fila in filas:
        # [nro, fecha, estado, fecha_anulacion?, rut, nombre, soc_prof, bruto, retencion, pagado]
        if len(fila) < 9 or not _DATE.match(fila[1] if len(fila) > 1 else ""):
            continue
        estado = fila[2].strip().upper()
        f_anul = fila[3].strip() if len(fila) >= 10 and _DATE.match(fila[3]) else ""
        try:
            nro = fila[0].strip()
            fecha = _fecha_iso(fila[1])
            rut = fila[4].strip()
            nombre = fila[5].strip()[:120]
            bruto = _limpiar_monto(fila[7])
            retencion = _limpiar_monto(fila[8])
            pagado = _limpiar_monto(fila[9]) if len(fila) > 9 else bruto - retencion
        except (IndexError, ValueError):
            continue
        if bruto == 0 and not f_anul:
            continue
        mes = fecha.month if fecha else 0
        anulada = estado in ("ANULADA", "NULA") or bool(f_anul)
        boletas.append({
            "nro": nro, "fecha": fecha, "periodo": f"{anio}-{mes:02d}",
            "rut": rut, "nombre": nombre, "bruto": bruto, "retencion": retencion,
            "liquido": pagado, "estado": estado, "anulada": anulada,
            "fecha_anulacion": _fecha_iso(f_anul) if f_anul else None,
        })
    return boletas


@router.post("/bhe/upload")
async def subir_bhe(
    anio: int = Form(..., ge=2017, le=2035),
    archivo: UploadFile = File(...),
    user: Usuario = Depends(require_rol("admin", "funcionario")),
    db: Session = Depends(get_db),
):
    raw = await archivo.read()
    if len(raw) > config.MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(413, f"Archivo supera {config.MAX_UPLOAD_MB} MB")
    nombre = re.sub(r"[^\w.\- ]", "_", archivo.filename or "bhe.xls")

    boletas = _parsear_bhe(raw, anio)
    if not boletas:
        raise HTTPException(422, "No se reconocieron boletas en el archivo (¿formato BHE del SII?)")

    insertadas = duplicadas = anuladas = 0
    for b in boletas:
        doc = DocumentoCargado(
            tipo="BHE", rut_emisor=b["rut"], nombre_emisor=b["nombre"],
            rut_receptor=config.RUT_PARTIDO, folio=b["nro"], fecha_documento=b["fecha"],
            periodo=b["periodo"], monto_bruto=b["bruto"], monto_retencion=b["retencion"],
            monto_liquido=b["liquido"], estado="cargado", archivo_nombre=nombre,
            archivo_tipo="xls", anulada=b["anulada"], fecha_anulacion=b["fecha_anulacion"],
            motivo_anulacion="Anulada en origen (SII)" if b["anulada"] else None,
        )
        db.add(doc)
        try:
            db.commit()
            insertadas += 1
            if b["anulada"]:
                anuladas += 1
        except IntegrityError:
            db.rollback()
            duplicadas += 1

    registrar_auditoria(db, "BHE_CARGADAS", usuario=user.username, entidad="documentos_cargados",
                        detalle={"archivo": nombre, "anio": anio, "insertadas": insertadas,
                                 "duplicadas": duplicadas, "anuladas": anuladas})
    return {"insertadas": insertadas, "duplicadas": duplicadas, "anuladas": anuladas,
            "total_detectadas": len(boletas)}


@router.get("/bhe")
def listar_bhe(
    periodo: Optional[str] = Query(None, description="YYYY-MM"),
    user: Usuario = Depends(usuario_vigente),
    db: Session = Depends(get_db),
):
    q = db.query(DocumentoCargado).filter(DocumentoCargado.tipo == "BHE")
    if periodo:
        q = q.filter(DocumentoCargado.periodo == periodo)
    docs = q.order_by(DocumentoCargado.fecha_documento.desc()).limit(2000).all()
    return [{"id": d.id, "folio": d.folio, "rut_emisor": d.rut_emisor, "nombre_emisor": d.nombre_emisor,
             "fecha": str(d.fecha_documento) if d.fecha_documento else None, "periodo": d.periodo,
             "bruto": d.monto_bruto, "retencion": d.monto_retencion, "liquido": d.monto_liquido,
             "anulada": d.anulada, "motivo_anulacion": d.motivo_anulacion} for d in docs]


class AnularBody(BaseModel):
    motivo: str = Field(min_length=3)


@router.patch("/bhe/{doc_id}/anular")
def anular_bhe(doc_id: int, body: AnularBody,
               user: Usuario = Depends(require_rol("admin", "funcionario")),
               db: Session = Depends(get_db)):
    d = db.query(DocumentoCargado).get(doc_id)
    if not d or d.tipo != "BHE":
        raise HTTPException(404, "Boleta no encontrada")
    d.anulada = True
    d.fecha_anulacion = date.today()
    d.motivo_anulacion = body.motivo
    db.commit()
    registrar_auditoria(db, "BHE_ANULADA", usuario=user.username, entidad="documentos_cargados",
                        entidad_id=d.id, detalle={"folio": d.folio, "motivo": body.motivo})
    return {"id": d.id, "anulada": True}


# ══════════════════════════════════════════════════════════════════════════════
#  CONTRATOS
# ══════════════════════════════════════════════════════════════════════════════
_MIME_OK = {"application/pdf"}


@router.post("/contratos/upload", status_code=201)
async def subir_contrato(
    funcionario_rut: str = Form(...),
    funcionario_nombre: str = Form(...),
    tipo_contrato: str = Form("honorarios"),
    fecha_inicio: Optional[str] = Form(None),
    fecha_termino: Optional[str] = Form(None),
    archivo: UploadFile = File(...),
    user: Usuario = Depends(require_rol("admin", "funcionario")),
    db: Session = Depends(get_db),
):
    if archivo.content_type not in _MIME_OK:
        raise HTTPException(415, "Solo se aceptan contratos en PDF")
    raw = await archivo.read()
    if len(raw) > config.MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(413, f"Archivo supera {config.MAX_UPLOAD_MB} MB")

    sha = hashlib.sha256(raw).hexdigest()
    destino_dir = config.ATTACHMENTS_DIR / "contratos"
    destino_dir.mkdir(parents=True, exist_ok=True)
    nombre_seguro = re.sub(r"[^\w.\-]", "_", archivo.filename or "contrato.pdf")
    fname = f"{sha[:16]}_{nombre_seguro}"
    (destino_dir / fname).write_bytes(raw)

    c = Contrato(
        funcionario_rut=funcionario_rut.strip(), funcionario_nombre=funcionario_nombre.strip(),
        tipo_contrato=tipo_contrato, fecha_inicio=_fecha_iso(fecha_inicio) if fecha_inicio else None,
        fecha_termino=_fecha_iso(fecha_termino) if fecha_termino else None,
        archivo_path=str((destino_dir / fname).resolve()), archivo_nombre=nombre_seguro,
        archivo_hash=sha, mime=archivo.content_type, subido_por=user.username,
    )
    db.add(c); db.commit(); db.refresh(c)
    registrar_auditoria(db, "CONTRATO_CARGADO", usuario=user.username, entidad="contratos",
                        entidad_id=c.id, detalle={"rut": funcionario_rut, "hash": sha})
    return {"id": c.id, "archivo_hash": sha}


@router.get("/contratos")
def listar_contratos(user: Usuario = Depends(usuario_vigente), db: Session = Depends(get_db)):
    cs = db.query(Contrato).order_by(Contrato.fecha_carga.desc()).all()
    return [{"id": c.id, "funcionario_rut": c.funcionario_rut, "funcionario_nombre": c.funcionario_nombre,
             "tipo_contrato": c.tipo_contrato, "fecha_inicio": str(c.fecha_inicio) if c.fecha_inicio else None,
             "fecha_termino": str(c.fecha_termino) if c.fecha_termino else None,
             "archivo_nombre": c.archivo_nombre, "vigente": c.vigente} for c in cs]


@router.get("/contratos/{cid}/download")
def descargar_contrato(cid: int, user: Usuario = Depends(usuario_vigente), db: Session = Depends(get_db)):
    c = db.query(Contrato).get(cid)
    if not c or not Path(c.archivo_path).exists():
        raise HTTPException(404, "Contrato no encontrado")
    registrar_auditoria(db, "CONTRATO_DESCARGADO", usuario=user.username, entidad="contratos", entidad_id=c.id)
    return FileResponse(c.archivo_path, media_type=c.mime or "application/pdf", filename=c.archivo_nombre)


# ══════════════════════════════════════════════════════════════════════════════
#  INFORMES + RENDICIÓN
# ══════════════════════════════════════════════════════════════════════════════
@router.get("/informes/honorarios")
def informe_honorarios(periodo: Optional[str] = Query(None, description="YYYY-MM"),
                       user: Usuario = Depends(usuario_vigente), db: Session = Depends(get_db)):
    q = db.query(DocumentoCargado).filter(DocumentoCargado.tipo == "BHE")
    if periodo:
        q = q.filter(DocumentoCargado.periodo == periodo)
    docs = q.all()
    vig = [d for d in docs if not d.anulada]
    return {
        "periodo": periodo, "boletas_total": len(docs), "boletas_vigentes": len(vig),
        "boletas_anuladas": len(docs) - len(vig),
        "honorario_bruto": sum(d.monto_bruto or 0 for d in vig),
        "retencion": sum(d.monto_retencion or 0 for d in vig),
        "liquido": sum(d.monto_liquido or 0 for d in vig),
        "emisores": len({d.rut_emisor for d in vig}),
    }


@router.post("/rendicion/generar")
def generar_rendicion(periodo: str = Query(..., description="YYYY-MM"),
                      user: Usuario = Depends(require_rol("admin", "funcionario")),
                      db: Session = Depends(get_db)):
    docs = db.query(DocumentoCargado).filter(
        DocumentoCargado.tipo == "BHE", DocumentoCargado.periodo == periodo,
        DocumentoCargado.anulada == False,  # noqa: E712 — solo vigentes a la rendición
    ).all()
    if not docs:
        raise HTTPException(404, f"No hay BHE vigentes para el período {periodo}")

    carpeta = config.RENDICION_DIR / periodo
    carpeta.mkdir(parents=True, exist_ok=True)

    # M14 — Nómina de honorarios (agrupada por emisor)
    por_rut: dict[str, dict] = {}
    for d in docs:
        r = por_rut.setdefault(d.rut_emisor, {"nombre": d.nombre_emisor, "bruto": 0, "retencion": 0, "liquido": 0, "boletas": 0})
        r["bruto"] += d.monto_bruto or 0
        r["retencion"] += d.monto_retencion or 0
        r["liquido"] += d.monto_liquido or 0
        r["boletas"] += 1

    m14 = carpeta / "M14_Nomina_Honorarios.csv"
    with open(m14, "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.writer(fh, delimiter=";")
        w.writerow(["RUT", "Nombre", "N Boletas", "Honorario Bruto", "Retencion", "Liquido Pagado"])
        for rut, v in sorted(por_rut.items(), key=lambda x: -x[1]["bruto"]):
            w.writerow([rut, v["nombre"], v["boletas"], v["bruto"], v["retencion"], v["liquido"]])

    manifiesto = {
        "periodo": periodo, "generado_por": user.username, "generado_en": datetime.now().isoformat(),
        "boletas_vigentes": len(docs), "emisores": len(por_rut),
        "honorario_bruto": sum(d.monto_bruto or 0 for d in docs),
        "retencion": sum(d.monto_retencion or 0 for d in docs),
        "archivos": ["M14_Nomina_Honorarios.csv"],
    }
    (carpeta / "manifiesto.json").write_text(json.dumps(manifiesto, ensure_ascii=False, indent=2), encoding="utf-8")

    registrar_auditoria(db, "RENDICION_GENERADA", usuario=user.username, entidad="rendicion",
                        detalle=manifiesto)
    return {"carpeta": str(carpeta), "manifiesto": manifiesto}
