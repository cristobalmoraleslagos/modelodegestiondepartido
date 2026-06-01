"""
pdf_extractor.py — Extracción de datos financieros desde PDFs
Soporta:
  - BHE en formato PDF (generadas por SII o prestadores)
  - Facturas PDF (cuando no hay XML adjunto)
  - Cartolas bancarias PDF (BancoEstado, Banco de Chile, Santander)
  - Comprobantes de pago F29 TGR
  - Comprobantes PREVIRED

Confianza esperada:
  - BHE / Factura con texto extraíble: 0.80–0.90
  - Cartola bancaria: 0.75–0.85
  - PDF escaneado (imagen): 0.20–0.40 (requiere OCR externo)
"""
from __future__ import annotations

import logging
import re
from datetime import date, datetime
from typing import Optional

import pdfplumber
from io import BytesIO

from config import TipoDocumento, RUT_PARTIDO

logger = logging.getLogger(__name__)

# Expresiones regulares para documentos chilenos
RE_RUT    = re.compile(r"\b(\d{1,2}\.?\d{3}\.?\d{3}-[\dkK])\b")
RE_MONTO  = re.compile(r"\$\s*([\d.,]+)")
RE_FECHA  = re.compile(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})\b")
RE_FOLIO  = re.compile(r"(?:folio|n°|nro\.?|número)[:\s#]*(\d+)", re.IGNORECASE)


def parsear_pdf(contenido: bytes, nombre_archivo: str = "") -> dict:
    """
    Extrae datos financieros de un PDF.

    Returns:
        dict normalizado con confidence_score.
    """
    resultado = _resultado_vacio(nombre_archivo)

    try:
        with pdfplumber.open(BytesIO(contenido)) as pdf:
            # Extraer texto de todas las páginas
            texto_completo = "\n".join(
                page.extract_text() or "" for page in pdf.pages
            )
    except Exception as e:
        logger.warning("Error leyendo PDF %s: %s", nombre_archivo, e)
        resultado["confidence_score"] = 0.0
        resultado["error"] = str(e)
        return resultado

    if not texto_completo.strip():
        logger.warning("PDF sin texto extraíble (¿escaneado?): %s", nombre_archivo)
        resultado["confidence_score"] = 0.1
        resultado["nota"] = "PDF escaneado — requiere OCR manual"
        return resultado

    texto = texto_completo

    # Clasificar tipo de documento
    resultado["tipo"] = _clasificar_tipo(texto)

    campos_encontrados = 0
    campos_totales = 5

    # ─── RUTs ─────────────────────────────────────────────────
    ruts = RE_RUT.findall(texto)
    ruts_norm = [_normalizar_rut(r) for r in ruts]

    # El RUT del partido suele ser el receptor
    rut_partido_norm = _normalizar_rut(RUT_PARTIDO)
    emisores = [r for r in ruts_norm if r != rut_partido_norm]

    if emisores:
        resultado["rut_emisor"] = emisores[0]
        campos_encontrados += 1
    if rut_partido_norm in ruts_norm:
        resultado["rut_receptor"] = rut_partido_norm
        campos_encontrados += 1

    # ─── Nombre emisor ────────────────────────────────────────
    nombre = _extraer_nombre_emisor(texto)
    if nombre:
        resultado["nombre_emisor"] = nombre

    # ─── Folio ────────────────────────────────────────────────
    folio_match = RE_FOLIO.search(texto)
    if folio_match:
        resultado["folio"] = folio_match.group(1)
        campos_encontrados += 1

    # ─── Fecha ────────────────────────────────────────────────
    fechas = RE_FECHA.findall(texto)
    if fechas:
        fecha = _parse_fecha(fechas[0])
        if fecha:
            resultado["fecha_documento"] = fecha
            campos_encontrados += 1

    # ─── Montos ───────────────────────────────────────────────
    montos = [_parse_monto_str(m) for m in RE_MONTO.findall(texto)]
    montos = [m for m in montos if m and m > 0]

    if montos:
        # Tomar el monto mayor como total/bruto
        resultado["monto_bruto"] = max(montos)
        campos_encontrados += 1

        if resultado["tipo"] == TipoDocumento.BHE:
            resultado["monto_retencion"] = round(resultado["monto_bruto"] * 0.1075)
            resultado["monto_liquido"] = resultado["monto_bruto"] - resultado["monto_retencion"]
        elif resultado["tipo"] == TipoDocumento.FACTURA:
            # IVA 19%: neto = bruto / 1.19
            resultado["monto_neto"] = round(resultado["monto_bruto"] / 1.19)
            resultado["monto_iva"] = resultado["monto_bruto"] - resultado["monto_neto"]
            resultado["monto_liquido"] = resultado["monto_bruto"]

    # ─── Concepto ─────────────────────────────────────────────
    resultado["concepto"] = _extraer_concepto(texto, resultado["tipo"])

    # Calcular confianza
    resultado["confidence_score"] = round((campos_encontrados / campos_totales) * 0.90, 2)
    # PDF nunca llega al 1.0 (preferir XML cuando esté disponible)

    logger.debug("PDF parseado: %s | tipo=%s | rut=%s | bruto=%s | confianza=%.2f",
                 nombre_archivo, resultado["tipo"], resultado["rut_emisor"],
                 resultado["monto_bruto"], resultado["confidence_score"])

    return resultado


# ─────────────────────────────────────────────────────────────────────
# Helpers de clasificación
# ─────────────────────────────────────────────────────────────────────

def _clasificar_tipo(texto: str) -> str:
    t = texto.lower()
    if any(k in t for k in ["boleta de honorarios", "honorario electrónica", "bhe"]):
        return TipoDocumento.BHE
    if any(k in t for k in ["factura electrónica", "factura no afecta", "tipo 33", "tipo 34"]):
        return TipoDocumento.FACTURA
    if any(k in t for k in ["boleta electrónica", "tipo 39", "tipo 41"]):
        return TipoDocumento.BOLETA
    if any(k in t for k in ["cartola", "estado de cuenta", "extracto de cuenta", "movimientos"]):
        return TipoDocumento.CARTOLA
    if any(k in t for k in ["previred", "cotizaciones previsionales", "isapre", "afp"]):
        return TipoDocumento.PREVIRED
    if any(k in t for k in ["formulario 29", "f29", "tesorería general", "tgr"]):
        return TipoDocumento.TGR_F29
    return TipoDocumento.OTRO


def _extraer_nombre_emisor(texto: str) -> Optional[str]:
    """Busca el nombre del emisor en las primeras líneas del PDF."""
    for line in texto.split("\n")[:20]:
        line = line.strip()
        # Línea que parece nombre de empresa (>5 chars, no es un número ni RUT)
        if (len(line) > 5 and not RE_RUT.match(line)
                and not line.startswith("$") and not line.isdigit()):
            return line[:200]
    return None


def _extraer_concepto(texto: str, tipo: str) -> str:
    """Extrae descripción/concepto del documento."""
    if tipo == TipoDocumento.BHE:
        # Buscar línea después de "descripción" o "concepto"
        match = re.search(r"(?:descripci[oó]n|concepto|servicio)[:\s]+(.+)", texto, re.IGNORECASE)
        if match:
            return match.group(1).strip()[:300]
        return "Honorarios profesionales"
    if tipo == TipoDocumento.CARTOLA:
        return "Cartola bancaria"
    if tipo == TipoDocumento.TGR_F29:
        return "Pago F29 TGR"
    if tipo == TipoDocumento.PREVIRED:
        return "Cotizaciones previsionales PREVIRED"
    return "Sin descripción"


# ─────────────────────────────────────────────────────────────────────
# Utilidades
# ─────────────────────────────────────────────────────────────────────

def _resultado_vacio(nombre_archivo: str) -> dict:
    return {
        "tipo": TipoDocumento.OTRO,
        "rut_emisor": None,
        "nombre_emisor": None,
        "rut_receptor": _normalizar_rut(RUT_PARTIDO),
        "folio": None,
        "fecha_documento": None,
        "monto_bruto": None,
        "monto_neto": None,
        "monto_retencion": None,
        "monto_iva": None,
        "monto_liquido": None,
        "concepto": None,
        "confidence_score": 0.0,
        "archivo_nombre": nombre_archivo,
        "archivo_tipo": "pdf",
    }


def _normalizar_rut(rut: str) -> str:
    rut = rut.strip().upper().replace(".", "").replace(" ", "")
    if "-" not in rut and len(rut) > 1:
        rut = rut[:-1] + "-" + rut[-1]
    return rut


def _parse_fecha(raw: str) -> Optional[date]:
    from dateutil import parser as dparser
    try:
        return dparser.parse(raw.strip()).date()
    except Exception:
        return None


def _parse_monto_str(raw: str) -> Optional[int]:
    limpio = re.sub(r"[^\d]", "", raw)
    return int(limpio) if limpio else None
