"""
config.py — Configuración central FinParty Backend
Carga variables desde .env y expone constantes tipadas.
"""
from __future__ import annotations

import os
from pathlib import Path
from dotenv import load_dotenv

# Cargar .env desde el directorio del proyecto
BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR / ".env")


# ─── Base de datos ─────────────────────────────────────────────
DB_HOST     = os.getenv("DB_HOST", "localhost")
DB_PORT     = int(os.getenv("DB_PORT", "5432"))
DB_NAME     = os.getenv("DB_NAME", "finparty")
DB_USER     = os.getenv("DB_USER", "finparty_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "finparty_2026!")

DATABASE_URL = (
    f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}"
    f"@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)


# ─── Correo IMAP ──────────────────────────────────────────────
IMAP_HOST       = os.getenv("IMAP_HOST", "imap.gmail.com")
IMAP_PORT       = int(os.getenv("IMAP_PORT", "993"))
IMAP_USER       = os.getenv("IMAP_USER", "")
IMAP_PASSWORD   = os.getenv("IMAP_PASSWORD", "")
IMAP_FOLDER     = os.getenv("IMAP_FOLDER", "INBOX")
IMAP_SINCE_DAYS = int(os.getenv("IMAP_SINCE_DAYS", "3"))


# ─── SMTP (notificaciones) ────────────────────────────────────
SMTP_HOST     = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER     = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
NOTIF_DESTINATARIOS: list[str] = [
    x.strip()
    for x in os.getenv("NOTIF_DESTINATARIOS", "").split(",")
    if x.strip()
]


# ─── UF ───────────────────────────────────────────────────────
MINDICADOR_URL = os.getenv("MINDICADOR_URL", "https://mindicador.cl/api/uf")


# ─── Pipeline ─────────────────────────────────────────────────
HORA_EJECUCION    = os.getenv("HORA_EJECUCION", "07:00")
CONFIDENCE_MINIMA = float(os.getenv("CONFIDENCE_MINIMA", "0.80"))
ATTACHMENTS_DIR   = Path(os.getenv("ATTACHMENTS_DIR", str(BASE_DIR / "attachments")))
LOG_LEVEL         = os.getenv("LOG_LEVEL", "INFO")


# ─── Seguridad / Intranet ─────────────────────────────────────
# JWT_SECRET DEBE definirse por entorno en producción. El default solo
# sirve para desarrollo local y NUNCA debe usarse en producción.
JWT_SECRET        = os.getenv("JWT_SECRET", "dev-only-change-me-in-prod")
JWT_ALGORITHM     = "HS256"
JWT_EXPIRE_MIN    = int(os.getenv("JWT_EXPIRE_MIN", "60"))
LOGIN_MAX_INTENTOS = int(os.getenv("LOGIN_MAX_INTENTOS", "5"))
LOGIN_BLOQUEO_MIN  = int(os.getenv("LOGIN_BLOQUEO_MIN", "15"))
MAX_UPLOAD_MB      = int(os.getenv("MAX_UPLOAD_MB", "20"))
# Orígenes CORS permitidos (coma-separados). En prod: dominio del frontend.
CORS_ORIGINS: list[str] = [
    x.strip()
    for x in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:5191").split(",")
    if x.strip()
]
# Carpeta de salida de las rendiciones generadas
RENDICION_DIR = Path(os.getenv("RENDICION_DIR", str(BASE_DIR / "rendicion")))
# Seed del primer administrador (idempotente)
ADMIN_USER = os.getenv("ADMIN_USER", "")
ADMIN_PASS = os.getenv("ADMIN_PASS", "")
ADMIN_NOMBRE = os.getenv("ADMIN_NOMBRE", "Administrador")

# ─── Autoinscripción (registro de funcionarios/as) ────────────
# Solo se permite registrarse con correos de este dominio institucional.
EMAIL_DOMAIN_PERMITIDO = os.getenv("EMAIL_DOMAIN_PERMITIDO", "pcchile.org")
# URL pública del frontend, para construir el enlace de "definir contraseña".
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
# Remitente de los correos transaccionales (invitación, etc.).
CORREO_REMITENTE = os.getenv("CORREO_REMITENTE", SMTP_USER or "no-reply@pcchile.org")
# Minutos de validez del enlace de definir/restablecer contraseña.
TOKEN_PASSWORD_MIN = int(os.getenv("TOKEN_PASSWORD_MIN", str(48 * 60)))  # 48 h


# ─── Partido ──────────────────────────────────────────────────
RUT_PARTIDO    = os.getenv("RUT_PARTIDO", "71701800-1")
NOMBRE_PARTIDO = os.getenv("NOMBRE_PARTIDO", "Partido Comunista de Chile")


# ─── SII ──────────────────────────────────────────────────────
SII_RUT              = os.getenv("SII_RUT", RUT_PARTIDO)
SII_CLAVE_TRIBUTARIA = os.getenv("SII_CLAVE_TRIBUTARIA", "")


# ─── Defontana ────────────────────────────────────────────────
DEFONTANA_BASE_URL      = os.getenv("DEFONTANA_BASE_URL", "https://api.defontana.com/api/")
DEFONTANA_COMPANY_TOKEN = os.getenv("DEFONTANA_COMPANY_TOKEN", "")
DEFONTANA_USER_TOKEN    = os.getenv("DEFONTANA_USER_TOKEN", "")
DEFONTANA_TIMEOUT       = int(os.getenv("DEFONTANA_TIMEOUT", "30"))


# ─── Tipos de documento reconocidos ───────────────────────────
class TipoDocumento:
    BHE        = "BHE"         # Boleta Honorarios Electrónica
    FACTURA    = "FACTURA"     # DTE Tipo 33
    BOLETA     = "BOLETA"      # DTE Tipo 39/41
    CARTOLA    = "CARTOLA"     # Cartola bancaria (PDF/XLSX)
    PREVIRED   = "PREVIRED"    # Exportación PREVIRED XLSX
    TGR_F29    = "TGR_F29"    # Comprobante F29 TGR
    OTRO       = "OTRO"


# ─── Estados de documento ─────────────────────────────────────
class EstadoDocumento:
    CARGADO           = "cargado"
    PENDIENTE_REVISION = "pendiente_revision"
    RECHAZADO         = "rechazado"
    DUPLICADO         = "duplicado"


# ─── Estados de email ─────────────────────────────────────────
class EstadoEmail:
    PROCESADO = "procesado"
    ERROR     = "error"
    IGNORADO  = "ignorado"
