"""
email_reader.py — Lector IMAP de correos con adjuntos financieros
Conecta al buzón de finanzas del partido, descarga adjuntos relevantes
(XML, PDF, XLSX) y los prepara para el pipeline de parseo.
"""
from __future__ import annotations

import email
import imaplib
import logging
import os
import re
from datetime import datetime, timedelta, timezone
from email.header import decode_header
from pathlib import Path
from typing import Generator

import chardet

from config import (
    IMAP_HOST, IMAP_PORT, IMAP_USER, IMAP_PASSWORD,
    IMAP_FOLDER, IMAP_SINCE_DAYS, ATTACHMENTS_DIR,
)

logger = logging.getLogger(__name__)

# Extensiones de adjuntos que nos interesan
EXTENSIONES_RELEVANTES = {".xml", ".pdf", ".xlsx", ".xls"}


class EmailReader:
    """Gestor de conexión IMAP y lectura de correos."""

    def __init__(self):
        self._conn: imaplib.IMAP4_SSL | None = None

    # ─── Conexión ──────────────────────────────────────────────

    def conectar(self) -> None:
        """Establece conexión SSL con el servidor IMAP."""
        logger.info("Conectando a %s:%d como %s", IMAP_HOST, IMAP_PORT, IMAP_USER)
        self._conn = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT)
        self._conn.login(IMAP_USER, IMAP_PASSWORD)
        self._conn.select(IMAP_FOLDER)
        logger.info("✅ Conectado a IMAP")

    def desconectar(self) -> None:
        """Cierra la sesión IMAP limpiamente."""
        if self._conn:
            try:
                self._conn.logout()
            except Exception:
                pass
            self._conn = None

    def __enter__(self):
        self.conectar()
        return self

    def __exit__(self, *args):
        self.desconectar()

    # ─── Búsqueda de correos ────────────────────────────────────

    def obtener_uids_nuevos(self, desde_dias: int = IMAP_SINCE_DAYS) -> list[str]:
        """
        Devuelve UIDs de correos recibidos en los últimos N días
        que tengan adjuntos relevantes (XML / PDF / XLSX).
        """
        fecha_desde = (datetime.now(timezone.utc) - timedelta(days=desde_dias)).strftime("%d-%b-%Y")
        criterio = f'(SINCE "{fecha_desde}")'

        _, datos = self._conn.uid("search", None, criterio)
        uids = datos[0].decode().split() if datos[0] else []

        logger.info("Encontrados %d correos desde %s días atrás", len(uids), desde_dias)
        return uids

    # ─── Lectura de correos ─────────────────────────────────────

    def leer_email(self, uid: str) -> dict | None:
        """
        Descarga y parsea un email por UID.

        Returns:
            dict con:
              - uid, fecha, remitente, asunto
              - adjuntos: lista de dicts {nombre, contenido, extension}
            None si hay error.
        """
        try:
            _, datos = self._conn.uid("fetch", uid, "(RFC822)")
            raw = datos[0][1]
            msg = email.message_from_bytes(raw)
        except Exception as e:
            logger.error("Error descargando UID %s: %s", uid, e)
            return None

        resultado = {
            "uid":     uid,
            "fecha":   _parse_fecha_email(msg.get("Date")),
            "remitente": _decode_header_str(msg.get("From", "")),
            "asunto":  _decode_header_str(msg.get("Subject", "")),
            "adjuntos": [],
        }

        # Extraer adjuntos
        for part in msg.walk():
            if part.get_content_maintype() == "multipart":
                continue
            if part.get("Content-Disposition") is None:
                continue

            nombre_raw = part.get_filename()
            if not nombre_raw:
                continue

            nombre = _decode_header_str(nombre_raw)
            ext = Path(nombre).suffix.lower()

            if ext not in EXTENSIONES_RELEVANTES:
                continue

            contenido = part.get_payload(decode=True)
            if not contenido:
                continue

            adjunto = {
                "nombre":    nombre,
                "extension": ext,
                "contenido": contenido,
            }
            resultado["adjuntos"].append(adjunto)

            # Guardar copia local de respaldo
            _guardar_adjunto_local(nombre, contenido, resultado["fecha"])

        logger.debug("Email UID %s: '%s' | %d adjunto(s) relevante(s)",
                     uid, resultado["asunto"], len(resultado["adjuntos"]))
        return resultado


# ─────────────────────────────────────────────────────────────────────
# Utilidades
# ─────────────────────────────────────────────────────────────────────

def _decode_header_str(raw: str) -> str:
    """Decodifica encabezados de email que pueden estar en base64 o quoted-printable."""
    try:
        partes = decode_header(raw)
        resultado = []
        for contenido, charset in partes:
            if isinstance(contenido, bytes):
                enc = charset or _detectar_encoding(contenido)
                resultado.append(contenido.decode(enc, errors="replace"))
            else:
                resultado.append(contenido)
        return "".join(resultado)
    except Exception:
        return str(raw)


def _detectar_encoding(data: bytes) -> str:
    """Detecta el encoding de bytes usando chardet."""
    detected = chardet.detect(data)
    return detected.get("encoding") or "utf-8"


def _parse_fecha_email(date_str: str | None) -> datetime | None:
    """Parsea el campo Date del encabezado del email."""
    if not date_str:
        return None
    from email.utils import parsedate_to_datetime
    try:
        return parsedate_to_datetime(date_str)
    except Exception:
        from dateutil import parser
        try:
            return parser.parse(date_str)
        except Exception:
            return None


def _guardar_adjunto_local(nombre: str, contenido: bytes, fecha: datetime | None) -> None:
    """Guarda una copia del adjunto en el directorio local de respaldo."""
    try:
        # Subcarpeta por fecha
        if fecha:
            subcarpeta = ATTACHMENTS_DIR / fecha.strftime("%Y-%m")
        else:
            subcarpeta = ATTACHMENTS_DIR / "sin_fecha"
        subcarpeta.mkdir(parents=True, exist_ok=True)

        # Nombre seguro (sin caracteres especiales)
        nombre_seguro = re.sub(r"[^\w\.\-]", "_", nombre)
        ruta = subcarpeta / nombre_seguro

        # No sobreescribir si ya existe
        if not ruta.exists():
            ruta.write_bytes(contenido)
            logger.debug("Adjunto guardado: %s", ruta)
    except Exception as e:
        logger.warning("No se pudo guardar adjunto '%s': %s", nombre, e)
