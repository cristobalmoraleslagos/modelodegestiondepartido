"""
dte_xml.py — Parser de Documentos Tributarios Electrónicos (DTE) XML
Soporta:
  - Boleta Honorarios Electrónica (BHE) — formato SII Chile
  - Factura Electrónica (Tipo 33)
  - Boleta Electrónica (Tipo 39 / 41)

Confianza esperada: 0.95–1.00 (XML estructurado)
"""
from __future__ import annotations

import logging
import re
from datetime import date
from typing import Optional

from lxml import etree

from config import TipoDocumento, RUT_PARTIDO

logger = logging.getLogger(__name__)

# Namespaces comunes en DTE chilenos
NS_DTE = {
    "dte": "http://www.sii.cl/SiiDte",
    "bhe": "http://www.sii.cl/SiiDte",
}

# Tipos DTE → clasificación interna
_TIPOS_DTE: dict[str, str] = {
    "33": TipoDocumento.FACTURA,
    "34": TipoDocumento.FACTURA,    # factura no afecta
    "39": TipoDocumento.BOLETA,
    "41": TipoDocumento.BOLETA,     # boleta no afecta
    "61": TipoDocumento.BOLETA,     # nota de crédito
}


def parsear_dte(contenido_xml: bytes, nombre_archivo: str = "") -> dict:
    """
    Parsea un XML DTE (BHE o factura electrónica).

    Returns:
        dict con campos normalizados + confidence_score.
    """
    resultado = _resultado_vacio(nombre_archivo, "xml")

    try:
        root = etree.fromstring(contenido_xml)
    except etree.XMLSyntaxError as e:
        logger.warning("XML inválido en %s: %s", nombre_archivo, e)
        resultado["confidence_score"] = 0.0
        resultado["error"] = str(e)
        return resultado

    # Intentar BHE primero (estructura diferente al DTE estándar)
    if _es_bhe(root):
        return _parsear_bhe(root, resultado)
    else:
        return _parsear_dte_estandar(root, resultado)


# ─────────────────────────────────────────────────────────────────────
# BHE — Boleta Honorarios Electrónica
# ─────────────────────────────────────────────────────────────────────

def _es_bhe(root: etree._Element) -> bool:
    """Detecta si el XML es una BHE por su tag raíz o namespace."""
    tag = root.tag.lower()
    return "bhe" in tag or "honorario" in tag or "boleta_honorario" in tag


def _parsear_bhe(root: etree._Element, resultado: dict) -> dict:
    """Parsea BHE — Boleta Honorarios Electrónica."""
    resultado["tipo"] = TipoDocumento.BHE

    campos_encontrados = 0
    campos_totales = 7  # campos críticos esperados

    def get_text(xpath: str, parent=None) -> Optional[str]:
        nodo = (parent or root).find(xpath)
        return nodo.text.strip() if nodo is not None and nodo.text else None

    # Folio
    folio = (
        get_text(".//NroBoleta") or
        get_text(".//Folio") or
        get_text(".//NroInterno")
    )
    if folio:
        resultado["folio"] = folio
        campos_encontrados += 1

    # Fecha
    fecha_raw = get_text(".//FchEmis") or get_text(".//FechaEmision")
    if fecha_raw:
        resultado["fecha_documento"] = _parse_fecha(fecha_raw)
        if resultado["fecha_documento"]:
            campos_encontrados += 1

    # Emisor (trabajador/contratista)
    rut_emisor = get_text(".//RUTEmisor") or get_text(".//RutWorker") or get_text(".//RutEmisor")
    if rut_emisor:
        resultado["rut_emisor"] = _normalizar_rut(rut_emisor)
        campos_encontrados += 1

    nombre_emisor = get_text(".//RznSoc") or get_text(".//NombreEmisor") or get_text(".//Nombre")
    if nombre_emisor:
        resultado["nombre_emisor"] = nombre_emisor
        campos_encontrados += 1

    # Receptor (partido)
    rut_receptor = get_text(".//RUTRecep") or get_text(".//RutReceptor")
    if rut_receptor:
        resultado["rut_receptor"] = _normalizar_rut(rut_receptor)
        campos_encontrados += 1

    # Montos
    bruto_raw = get_text(".//MntBruto") or get_text(".//MontoTotal") or get_text(".//MntTotal")
    if bruto_raw:
        resultado["monto_bruto"] = _parse_monto(bruto_raw)
        if resultado["monto_bruto"]:
            # Calcular retención 10.75% (Art. 74 N°2 LIR)
            resultado["monto_retencion"] = round(resultado["monto_bruto"] * 0.1075)
            resultado["monto_liquido"] = resultado["monto_bruto"] - resultado["monto_retencion"]
            campos_encontrados += 1

    retencion_raw = get_text(".//MntRetencion") or get_text(".//ValRetencion")
    if retencion_raw:
        resultado["monto_retencion"] = _parse_monto(retencion_raw)
        campos_encontrados += 1

    # Concepto
    resultado["concepto"] = (
        get_text(".//DescripcionServ") or
        get_text(".//Descripcion") or
        get_text(".//GlosaDesc") or
        "Honorarios profesionales"
    )

    resultado["confidence_score"] = round(campos_encontrados / campos_totales, 2)
    logger.debug("BHE parseada: folio=%s rut=%s bruto=%s confianza=%.2f",
                 resultado["folio"], resultado["rut_emisor"],
                 resultado["monto_bruto"], resultado["confidence_score"])
    return resultado


# ─────────────────────────────────────────────────────────────────────
# DTE estándar (Factura / Boleta)
# ─────────────────────────────────────────────────────────────────────

def _parsear_dte_estandar(root: etree._Element, resultado: dict) -> dict:
    """Parsea DTE estándar chileno (facturas, boletas)."""
    campos_encontrados = 0
    campos_totales = 6

    def get(xpath: str):
        # Intenta con namespace y sin él
        nodo = root.find(xpath, NS_DTE)
        if nodo is None:
            nodo = root.find(xpath.replace("dte:", ""))
        return nodo.text.strip() if nodo is not None and nodo.text else None

    # Tipo de documento
    tipo_raw = get(".//dte:TipoDTE") or get(".//TipoDTE")
    if tipo_raw:
        resultado["tipo"] = _TIPOS_DTE.get(tipo_raw.strip(), TipoDocumento.OTRO)
        campos_encontrados += 1

    # Folio
    folio = get(".//dte:Folio") or get(".//Folio")
    if folio:
        resultado["folio"] = folio
        campos_encontrados += 1

    # Fecha
    fecha_raw = get(".//dte:FchEmis") or get(".//FchEmis")
    if fecha_raw:
        resultado["fecha_documento"] = _parse_fecha(fecha_raw)
        if resultado["fecha_documento"]:
            campos_encontrados += 1

    # RUT emisor
    rut_emisor = get(".//dte:RUTEmisor") or get(".//RUTEmisor")
    if rut_emisor:
        resultado["rut_emisor"] = _normalizar_rut(rut_emisor)
        campos_encontrados += 1

    nombre_emisor = get(".//dte:RznSoc") or get(".//RznSoc")
    if nombre_emisor:
        resultado["nombre_emisor"] = nombre_emisor

    rut_receptor = get(".//dte:RUTRecep") or get(".//RUTRecep")
    if rut_receptor:
        resultado["rut_receptor"] = _normalizar_rut(rut_receptor)
        campos_encontrados += 1

    # Montos
    mnt_neto = get(".//dte:MntNeto") or get(".//MntNeto")
    mnt_iva  = get(".//dte:IVA") or get(".//IVA") or get(".//MntIVA")
    mnt_total = get(".//dte:MntTotal") or get(".//MntTotal")

    if mnt_neto:
        resultado["monto_neto"] = _parse_monto(mnt_neto)
        campos_encontrados += 1
    if mnt_iva:
        resultado["monto_iva"] = _parse_monto(mnt_iva)
    if mnt_total:
        resultado["monto_bruto"] = _parse_monto(mnt_total)
        resultado["monto_liquido"] = resultado["monto_bruto"]

    # Concepto (primera línea de detalle)
    glosa = get(".//dte:NmbItem") or get(".//NmbItem") or get(".//dte:GlosaDesc") or get(".//GlosaDesc")
    resultado["concepto"] = glosa or "Sin descripción"

    resultado["confidence_score"] = round(campos_encontrados / campos_totales, 2)
    return resultado


# ─────────────────────────────────────────────────────────────────────
# Utilidades
# ─────────────────────────────────────────────────────────────────────

def _resultado_vacio(nombre_archivo: str, tipo_arch: str) -> dict:
    return {
        "tipo": TipoDocumento.OTRO,
        "rut_emisor": None,
        "nombre_emisor": None,
        "rut_receptor": RUT_PARTIDO,
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
        "archivo_tipo": tipo_arch,
    }


def _normalizar_rut(rut: str) -> str:
    """Normaliza RUT chileno al formato 12345678-K."""
    rut = rut.strip().upper().replace(".", "").replace(" ", "")
    if "-" not in rut and len(rut) > 1:
        rut = rut[:-1] + "-" + rut[-1]
    return rut


def _parse_fecha(raw: str) -> Optional[date]:
    """Parsea fecha ISO (YYYY-MM-DD) u otros formatos comunes."""
    from dateutil import parser as dparser
    try:
        return dparser.parse(raw.strip()).date()
    except Exception:
        return None


def _parse_monto(raw: str) -> Optional[int]:
    """Convierte string de monto a entero (pesos CLP, sin decimales)."""
    if not raw:
        return None
    limpio = re.sub(r"[^\d]", "", raw)
    return int(limpio) if limpio else None
