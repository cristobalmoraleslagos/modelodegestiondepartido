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
