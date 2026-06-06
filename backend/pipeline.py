"""
pipeline.py — Orquestador principal del pipeline financiero FinParty
Flujo:
  1. Conectar a IMAP → obtener UIDs nuevos
  2. Por cada email: leer adjuntos
  3. Por cada adjunto: parsear según extensión
  4. Cargar en PostgreSQL con deduplicación y scoring de confianza
  5. Actualizar UF del día
  6. Generar resumen y enviar notificación
"""
from __future__ import annotations

import logging
import smtplib
import traceback
from datetime import datetime, date
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

import requests
from sqlalchemy.orm import Session

from config import (
    MINDICADOR_URL, NOTIF_DESTINATARIOS,
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD,
    SII_CLAVE_TRIBUTARIA,
    TipoDocumento, EstadoDocumento,
)
from db.database import SessionLocal, create_tables
from db.loader import (
    cargar_documento, cargar_email, email_ya_procesado,
)
from db.models import UFHistorica, AuditLog
from email_reader import EmailReader
from parsers.dte_xml import parsear_dte
from parsers.pdf_extractor import parsear_pdf
from parsers.excel_extractor import parsear_excel

logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════════════
#  PUNTO DE ENTRADA PRINCIPAL
# ══════════════════════════════════════════════════════════════════════

def ejecutar_pipeline() -> dict:
    """
    Ejecuta el pipeline completo. Retorna un resumen de ejecución.
    Diseñado para ser llamado desde main.py (scheduler) o manualmente.
    """
    inicio = datetime.now()
    logger.info("=" * 60)
    logger.info("🚀 Pipeline FinParty iniciado — %s", inicio.strftime("%Y-%m-%d %H:%M"))
    logger.info("=" * 60)

    # Asegurar tablas
    create_tables()

    resumen = {
        "fecha": inicio.isoformat(),
        "emails_revisados": 0,
        "emails_nuevos": 0,
        "documentos_cargados": 0,
        "documentos_pendientes": 0,
        "documentos_duplicados": 0,
        "documentos_error": 0,
        "uf_actualizada": False,
        "errores": [],
    }

    # ─── 1. Actualizar UF del día ──────────────────────────────
    try:
        actualizar_uf(resumen)
    except Exception as e:
        logger.error("Error actualizando UF: %s", e)
        resumen["errores"].append(f"UF: {e}")

    # ─── 2. Sincronizar SII ───────────────────────────────────
    if SII_CLAVE_TRIBUTARIA:
        try:
            sincronizar_sii(resumen)
        except Exception as e:
            logger.error("Error sincronizando SII: %s", e)
            resumen["errores"].append(f"SII: {e}")
    else:
        logger.info("SII_CLAVE_TRIBUTARIA no configurada — omitiendo sync SII")

    # ─── 3. Leer correos ──────────────────────────────────────
    try:
        procesar_correos(resumen)
    except Exception as e:
        logger.error("Error en lectura de correos: %s", e)
        resumen["errores"].append(f"IMAP: {e}")
        traceback.print_exc()

    # ─── 4. Resumen final ─────────────────────────────────────
    duracion = (datetime.now() - inicio).total_seconds()
    resumen["duracion_segundos"] = round(duracion, 1)

    logger.info("")
    logger.info("─" * 60)
    logger.info("✅ Pipeline completado en %.1f seg", duracion)
    logger.info("   🌐 SII DTEs recibidos: %d", resumen.get("sii_dtes", 0))
    logger.info("   🧾 SII BHEs emitidas:  %d", resumen.get("sii_bhe", 0))
    logger.info("   📧 Emails revisados:   %d", resumen["emails_revisados"])
    logger.info("   📄 Documentos cargados:  %d", resumen["documentos_cargados"])
    logger.info("   ⏳ Pendientes revisión:  %d", resumen["documentos_pendientes"])
    logger.info("   🔁 Duplicados ignorados: %d", resumen["documentos_duplicados"])
    logger.info("   ❌ Errores:              %d", resumen["documentos_error"])
    logger.info("─" * 60)

    # ─── 4. Notificación por email ────────────────────────────
    try:
        enviar_resumen_email(resumen)
    except Exception as e:
        logger.warning("No se pudo enviar resumen por email: %s", e)

    return resumen


# ══════════════════════════════════════════════════════════════════════
#  MÓDULO: Sincronización SII
# ══════════════════════════════════════════════════════════════════════

def sincronizar_sii(resumen: dict) -> None:
    """Descarga DTEs y BHEs del período actual desde el SII."""
    from sii_client import SIIClient
    from datetime import date as d

    hoy  = d.today()
    anio = str(hoy.year)
    mes  = str(hoy.month).zfill(2)

    with SIIClient() as client:
        datos = client.sincronizar_periodo(anio, mes)

    resumen["sii_dtes"] = datos["dtes_recibidos"]
    resumen["sii_bhe"]  = datos["bhe_emitidas"]
    resumen["sii_f29"]  = datos.get("f29_estado")

    if datos["errores"]:
        for err in datos["errores"]:
            resumen["errores"].append(f"SII: {err}")

    logger.info(
        "🌐 SII sync OK — DTEs: %d | BHEs: %d",
        datos["dtes_recibidos"], datos["bhe_emitidas"],
    )


# ══════════════════════════════════════════════════════════════════════
#  MÓDULO: Lectura de correos
# ══════════════════════════════════════════════════════════════════════

def procesar_correos(resumen: dict) -> None:
    """Lee correos nuevos, parsea adjuntos y carga documentos en BD."""

    with EmailReader() as reader:
        uids = reader.obtener_uids_nuevos()
        resumen["emails_revisados"] = len(uids)

        with SessionLocal() as session:
            for uid in uids:
                # Saltar emails ya procesados
                if email_ya_procesado(session, uid):
                    logger.debug("Email UID %s ya procesado — saltando", uid)
                    continue

                resumen["emails_nuevos"] += 1

                datos_email = reader.leer_email(uid)
                if datos_email is None:
                    resumen["errores"].append(f"No se pudo leer UID {uid}")
                    continue

                adjuntos = datos_email.get("adjuntos", [])

                email_db = cargar_email(session, uid, {
                    "fecha":               datos_email["fecha"],
                    "remitente":           datos_email["remitente"],
                    "asunto":              datos_email["asunto"],
                    "adjuntos_total":      len(adjuntos),
                    "adjuntos_procesados": 0,  # se actualizará
                    "estado":              "procesado",
                })

                procesados = 0
                for adjunto in adjuntos:
                    try:
                        docs = parsear_adjunto(adjunto)
                        for doc_data in docs:
                            doc = cargar_documento(session, doc_data, email_db.id)
                            if doc.estado == EstadoDocumento.CARGADO:
                                resumen["documentos_cargados"] += 1
                            elif doc.estado == EstadoDocumento.PENDIENTE_REVISION:
                                resumen["documentos_pendientes"] += 1
                            elif doc.estado == EstadoDocumento.DUPLICADO:
                                resumen["documentos_duplicados"] += 1
                        procesados += 1
                    except Exception as e:
                        logger.error("Error parseando adjunto '%s': %s",
                                     adjunto["nombre"], e)
                        resumen["documentos_error"] += 1
                        resumen["errores"].append(f"{adjunto['nombre']}: {e}")

                email_db.adjuntos_procesados = procesados
                session.commit()


# ══════════════════════════════════════════════════════════════════════
#  MÓDULO: Parseo de adjuntos
# ══════════════════════════════════════════════════════════════════════

def parsear_adjunto(adjunto: dict) -> list[dict]:
    """
    Despacha el adjunto al parser correcto según su extensión.

    Returns:
        Lista de dicts de documentos (normalmente 1, pero un Excel de
        PREVIRED puede tener múltiples filas/documentos).
    """
    ext      = adjunto["extension"].lower()
    nombre   = adjunto["nombre"]
    contenido = adjunto["contenido"]

    if ext == ".xml":
        logger.info("📄 Parseando XML: %s", nombre)
        return [parsear_dte(contenido, nombre)]

    elif ext == ".pdf":
        logger.info("📄 Parseando PDF: %s", nombre)
        return [parsear_pdf(contenido, nombre)]

    elif ext in (".xlsx", ".xls"):
        logger.info("📊 Parseando Excel: %s", nombre)
        return parsear_excel(contenido, nombre)

    else:
        logger.warning("Extensión no soportada: %s — ignorando", ext)
        return []


# ══════════════════════════════════════════════════════════════════════
#  MÓDULO: UF diaria
# ══════════════════════════════════════════════════════════════════════

def actualizar_uf(resumen: dict) -> None:
    """Descarga el valor UF del día desde mindicador.cl y lo guarda en BD."""
    try:
        resp = requests.get(MINDICADOR_URL, timeout=10)
        resp.raise_for_status()
        data = resp.json()

        # mindicador.cl retorna: {"serie": [{"fecha": "...", "valor": 12345.67}]}
        serie = data.get("serie", [])
        if not serie:
            raise ValueError("Respuesta de mindicador.cl vacía")

        ultimo = serie[0]
        fecha_uf = datetime.fromisoformat(ultimo["fecha"][:10]).date()
        valor_uf = float(ultimo["valor"])

        with SessionLocal() as session:
            # Upsert: solo insertar si no existe
            existente = session.query(UFHistorica).filter_by(fecha=fecha_uf).first()
            if not existente:
                session.add(UFHistorica(fecha=fecha_uf, valor=valor_uf))
                session.commit()
                logger.info("💰 UF %s: $%.2f (nuevo registro)", fecha_uf, valor_uf)
            else:
                logger.debug("UF %s ya registrada: $%.2f", fecha_uf, existente.valor)

        resumen["uf_actualizada"] = True
        resumen["uf_fecha"] = str(fecha_uf)
        resumen["uf_valor"] = valor_uf

    except Exception as e:
        logger.error("Error obteniendo UF: %s", e)
        raise


# ══════════════════════════════════════════════════════════════════════
#  MÓDULO: Notificación por email
# ══════════════════════════════════════════════════════════════════════

def enviar_resumen_email(resumen: dict) -> None:
    """Envía un resumen HTML del pipeline al equipo de finanzas."""
    if not NOTIF_DESTINATARIOS or not SMTP_USER:
        logger.info("Notificaciones deshabilitadas (sin destinatarios configurados)")
        return

    fecha_str = datetime.now().strftime("%d/%m/%Y %H:%M")
    asunto = f"FinParty — Resumen Pipeline {datetime.now().strftime('%d/%m/%Y')}"

    estado_color = "#22c55e" if not resumen["errores"] else "#ef4444"
    estado_texto = "✅ Sin errores" if not resumen["errores"] else f"⚠ {len(resumen['errores'])} errores"

    html = f"""
    <html><body style="font-family: system-ui, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto;">
    <div style="background:#1e293b; color:white; padding:20px; border-radius:8px 8px 0 0;">
      <h2 style="margin:0;">FinParty · Resumen de Pipeline</h2>
      <p style="margin:4px 0 0; opacity:0.7; font-size:13px;">Partido Comunista de Chile · {fecha_str}</p>
    </div>
    <div style="background:#f8fafc; padding:20px; border:1px solid #e2e8f0; border-top:none; border-radius: 0 0 8px 8px;">
      <p style="color:{estado_color}; font-weight:bold; font-size:16px;">{estado_texto}</p>

      <table style="width:100%; border-collapse:collapse; margin-top:12px;">
        <tr style="background:#e2e8f0;">
          <th style="padding:8px 12px; text-align:left;">Métrica</th>
          <th style="padding:8px 12px; text-align:right;">Valor</th>
        </tr>
        <tr><td style="padding:8px 12px; border-bottom:1px solid #f1f5f9;">Emails revisados</td>
            <td style="padding:8px 12px; border-bottom:1px solid #f1f5f9; text-align:right;">{resumen['emails_revisados']}</td></tr>
        <tr><td style="padding:8px 12px; border-bottom:1px solid #f1f5f9;">Emails nuevos procesados</td>
            <td style="padding:8px 12px; border-bottom:1px solid #f1f5f9; text-align:right;">{resumen['emails_nuevos']}</td></tr>
        <tr><td style="padding:8px 12px; border-bottom:1px solid #f1f5f9;">Documentos cargados automáticamente</td>
            <td style="padding:8px 12px; border-bottom:1px solid #f1f5f9; text-align:right; color:#22c55e; font-weight:bold;">{resumen['documentos_cargados']}</td></tr>
        <tr><td style="padding:8px 12px; border-bottom:1px solid #f1f5f9;">Pendientes revisión manual</td>
            <td style="padding:8px 12px; border-bottom:1px solid #f1f5f9; text-align:right; color:#f59e0b; font-weight:bold;">{resumen['documentos_pendientes']}</td></tr>
        <tr><td style="padding:8px 12px; border-bottom:1px solid #f1f5f9;">Duplicados ignorados</td>
            <td style="padding:8px 12px; border-bottom:1px solid #f1f5f9; text-align:right; color:#94a3b8;">{resumen['documentos_duplicados']}</td></tr>
        <tr><td style="padding:8px 12px;">Duración del pipeline</td>
            <td style="padding:8px 12px; text-align:right;">{resumen.get('duracion_segundos', '?')}s</td></tr>
      </table>

      {"<div style='background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:12px;margin-top:16px;'><b style='color:#dc2626;'>Errores detectados:</b><ul style='margin:8px 0 0;padding-left:20px;color:#7f1d1d;font-size:13px;'>" + "".join(f"<li>{e}</li>" for e in resumen['errores']) + "</ul></div>" if resumen['errores'] else ""}

      {"<div style='background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:12px;margin-top:16px;'><b style='color:#15803d;'>UF actualizada:</b> ${resumen.get('uf_valor', '?'):,.2f} ({resumen.get('uf_fecha', '')})</div>" if resumen.get('uf_actualizada') else ""}

      <p style="font-size:11px; color:#94a3b8; margin-top:20px; border-top:1px solid #e2e8f0; padding-top:12px;">
        FinParty · PCCh · Sistema de Control Financiero Partidario<br>
        Este mensaje es generado automáticamente. No responder a este correo.
      </p>
    </div>
    </body></html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = asunto
    msg["From"]    = SMTP_USER
    msg["To"]      = ", ".join(NOTIF_DESTINATARIOS)
    msg.attach(MIMEText(html, "html", "utf-8"))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_USER, NOTIF_DESTINATARIOS, msg.as_string())

    logger.info("📬 Resumen enviado a: %s", ", ".join(NOTIF_DESTINATARIOS))
