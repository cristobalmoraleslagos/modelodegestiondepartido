"""
correo.py — Envío de correos transaccionales (invitación / definir contraseña).

Usa SMTP genérico (config.SMTP_*). El camino de envío para @pcchile.org queda por
definir (Proton Business SMTP submission, o un proveedor transaccional con SPF+DKIM);
este módulo no depende de cuál sea: solo necesita host/usuario/clave por entorno.

Es TOLERANTE: si SMTP no está configurado, NO lanza excepción — registra y devuelve
False, para que el registro no se caiga en desarrollo. En producción hay que configurar
SMTP para que la invitación llegue de verdad.
"""
from __future__ import annotations

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import config

log = logging.getLogger("finparty.correo")


def smtp_configurado() -> bool:
    return bool(config.SMTP_HOST and config.SMTP_USER and config.SMTP_PASSWORD)


def enviar_correo(destinatario: str, asunto: str, cuerpo_html: str, cuerpo_texto: str = "") -> bool:
    """Envía un correo HTML. Devuelve True si se envió; False si SMTP no está listo o falló."""
    if not smtp_configurado():
        log.warning("SMTP no configurado — correo a %s NO enviado (asunto: %s)", destinatario, asunto)
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = asunto
    msg["From"] = config.CORREO_REMITENTE
    msg["To"] = destinatario
    if cuerpo_texto:
        msg.attach(MIMEText(cuerpo_texto, "plain", "utf-8"))
    msg.attach(MIMEText(cuerpo_html, "html", "utf-8"))

    try:
        with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=20) as smtp:
            smtp.starttls()
            smtp.login(config.SMTP_USER, config.SMTP_PASSWORD)
            smtp.sendmail(config.CORREO_REMITENTE, [destinatario], msg.as_string())
        log.info("Correo enviado a %s (asunto: %s)", destinatario, asunto)
        return True
    except Exception as e:  # noqa: BLE001 — no interrumpir el flujo por un fallo de correo
        log.error("Fallo al enviar correo a %s: %s", destinatario, e)
        return False


def correo_definir_password(destinatario: str, nombre: str, enlace: str) -> bool:
    """Correo de invitación con el enlace para definir la contraseña."""
    asunto = f"{config.NOMBRE_PARTIDO} — Define tu contraseña de acceso"
    html = f"""
    <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:520px;margin:auto">
      <h2 style="color:#003087">Bienvenido/a, {nombre}</h2>
      <p>Tu registro en la plataforma de {config.NOMBRE_PARTIDO} fue recibido.</p>
      <p>Para activar tu acceso, define tu contraseña haciendo clic en el siguiente enlace
      (válido por {config.TOKEN_PASSWORD_MIN // 60} horas):</p>
      <p style="margin:24px 0">
        <a href="{enlace}" style="background:#c1121f;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">
          Definir mi contraseña
        </a>
      </p>
      <p style="color:#64748b;font-size:13px">Si el botón no funciona, copia y pega este enlace:<br>{enlace}</p>
      <p style="color:#64748b;font-size:13px">Tu cuenta quedará habilitada una vez que un administrador
      apruebe tu registro. Si no solicitaste esto, ignora este correo.</p>
    </div>
    """
    texto = f"Bienvenido/a, {nombre}. Define tu contraseña aquí (válido {config.TOKEN_PASSWORD_MIN // 60} h): {enlace}"
    return enviar_correo(destinatario, asunto, html, texto)
