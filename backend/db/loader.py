"""
loader.py — Carga de documentos parseados a PostgreSQL
Maneja deduplicación, validación de confianza y auditoría.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from config import CONFIDENCE_MINIMA, EstadoDocumento
from db.models import DocumentoCargado, EmailProcesado, AuditLog

logger = logging.getLogger(__name__)


def cargar_documento(session: Session, datos: dict, email_id: int | None = None) -> DocumentoCargado:
    """
    Intenta cargar un documento parseado en la BD.

    Args:
        session:  Sesión SQLAlchemy activa.
        datos:    Diccionario con campos del documento (output del parser).
        email_id: FK al email del que proviene.

    Returns:
        El objeto DocumentoCargado persistido (estado puede ser cargado, pendiente, duplicado).
    """
    confidence = datos.get("confidence_score", 0.0)

    # Determinar estado según confianza
    if confidence >= CONFIDENCE_MINIMA:
        estado = EstadoDocumento.CARGADO
    else:
        estado = EstadoDocumento.PENDIENTE_REVISION

    doc = DocumentoCargado(
        email_id         = email_id,
        tipo             = datos.get("tipo", "OTRO"),
        rut_emisor       = datos.get("rut_emisor"),
        nombre_emisor    = datos.get("nombre_emisor"),
        rut_receptor     = datos.get("rut_receptor"),
        folio            = datos.get("folio"),
        fecha_documento  = datos.get("fecha_documento"),
        periodo          = _inferir_periodo(datos.get("fecha_documento")),
        monto_bruto      = datos.get("monto_bruto"),
        monto_neto       = datos.get("monto_neto"),
        monto_retencion  = datos.get("monto_retencion"),
        monto_iva        = datos.get("monto_iva"),
        monto_liquido    = datos.get("monto_liquido"),
        concepto         = datos.get("concepto"),
        confidence_score = confidence,
        estado           = estado,
        archivo_nombre   = datos.get("archivo_nombre"),
        archivo_tipo     = datos.get("archivo_tipo"),
        raw_json         = json.dumps(datos, default=str, ensure_ascii=False),
    )

    try:
        session.add(doc)
        session.flush()  # obtener ID sin commit aún

        # Auditoría
        _audit(session, "DOC_CARGADO", "documentos_cargados", doc.id,
               f"tipo={doc.tipo} rut={doc.rut_emisor} folio={doc.folio} "
               f"confianza={confidence:.2f} estado={estado}")

        logger.info(
            "✅ Documento cargado: %s | %s | folio %s | estado=%s | confianza=%.2f",
            doc.tipo, doc.rut_emisor, doc.folio, estado, confidence,
        )

    except IntegrityError:
        session.rollback()
        # Documento duplicado — recuperar el existente
        existing = session.query(DocumentoCargado).filter_by(
            rut_emisor=doc.rut_emisor,
            folio=doc.folio,
            tipo=doc.tipo,
        ).first()

        if existing:
            _audit(session, "DOC_DUPLICADO", "documentos_cargados", existing.id,
                   f"tipo={doc.tipo} rut={doc.rut_emisor} folio={doc.folio}")
            logger.warning("⚠ Documento duplicado ignorado: %s / %s / folio %s",
                           doc.tipo, doc.rut_emisor, doc.folio)
            existing.estado = EstadoDocumento.DUPLICADO
            return existing

        raise  # re-raise si no es por unicidad

    return doc


def cargar_email(session: Session, uid: str, datos_email: dict) -> EmailProcesado:
    """Registra un email como procesado."""
    email = EmailProcesado(
        uid                 = uid,
        fecha_email         = datos_email.get("fecha"),
        remitente           = datos_email.get("remitente"),
        asunto              = datos_email.get("asunto"),
        adjuntos_total      = datos_email.get("adjuntos_total", 0),
        adjuntos_procesados = datos_email.get("adjuntos_procesados", 0),
        estado              = datos_email.get("estado", "procesado"),
        error_mensaje       = datos_email.get("error"),
    )
    session.add(email)
    session.flush()
    _audit(session, "EMAIL_PROCESADO", "emails_procesados", email.id,
           f"de={email.remitente} asunto={email.asunto}")
    return email


def email_ya_procesado(session: Session, uid: str) -> bool:
    """Verificar si el UID de email ya fue procesado."""
    return session.query(EmailProcesado).filter_by(uid=uid).count() > 0


def _inferir_periodo(fecha) -> str | None:
    """Convierte una fecha a string "YYYY-MM" para agrupación mensual."""
    if fecha is None:
        return None
    if isinstance(fecha, str):
        try:
            fecha = datetime.strptime(fecha[:10], "%Y-%m-%d").date()
        except ValueError:
            return None
    return fecha.strftime("%Y-%m")


def _audit(session: Session, accion: str, entidad: str, entidad_id: int, detalle: str):
    """Insertar registro en audit_log."""
    log = AuditLog(
        accion     = accion,
        entidad    = entidad,
        entidad_id = entidad_id,
        usuario    = "pipeline",
        detalle    = detalle,
    )
    session.add(log)
