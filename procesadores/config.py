"""
config.py — Rutas y constantes para los procesadores FinParty SERVEL
"""
import os

# Directorio raíz del proyecto
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Fuentes de datos
DIR_GASTOS        = os.path.join(ROOT, "finanzas", "Gastos")
DIR_BHE           = os.path.join(ROOT, "ARCHIVOS SII", "BHE")
DIR_RCV           = os.path.join(ROOT, "ARCHIVOS SII", "Registro de Compra y Ventas", "2026")
DIR_F29           = os.path.join(ROOT, "ARCHIVOS SII", "F29")
DIR_SCRAPER       = os.path.join(ROOT, "scraper_transparencia", "Extraccion_Completa_PP007", "_csvs")

# Salidas generadas
DIR_OUTPUT        = os.path.join(ROOT, "procesadores", "output")
DIR_OUT_GASTOS    = os.path.join(DIR_OUTPUT, "M12_Gastos")
DIR_OUT_NOMINA    = os.path.join(DIR_OUTPUT, "Nomina_Contrataciones")
DIR_OUT_RCV       = os.path.join(DIR_OUTPUT, "RCV_Resumen")

# Partido
RUT_PARTIDO       = "71.701.800-1"
NOMBRE_PARTIDO    = "Partido Comunista de Chile"

# Trimestres SERVEL
TRIMESTRES = {
    1: {"label": "Ene - Mar", "meses": [1, 2, 3],  "cols": ["Enero","Febrero","Marzo"]},
    2: {"label": "Abr - Jun", "meses": [4, 5, 6],  "cols": ["Abril","Mayo","Junio"]},
    3: {"label": "Jul - Sep", "meses": [7, 8, 9],  "cols": ["Julio","Agosto","Septiembre"]},
    4: {"label": "Oct - Dic", "meses": [10,11,12], "cols": ["Octubre","Noviembre","Diciembre"]},
}

MESES_COLS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
              "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

MESES_MAP = {
    "01":"Enero","02":"Febrero","03":"Marzo","04":"Abril",
    "05":"Mayo","06":"Junio","07":"Julio","08":"Agosto",
    "09":"Septiembre","10":"Octubre","11":"Noviembre","12":"Diciembre",
}
MESES_NUM = {v: k for k, v in MESES_MAP.items()}

# UTM por año (para umbral 20 UTM de nómina)
UTM_POR_ANIO = {
    2022: 56_242,
    2023: 62_055,
    2024: 66_574,
    2025: 71_638,
    2026: 75_000,  # estimado
}

def utm_20(anio: int) -> int:
    return UTM_POR_ANIO.get(anio, 65_000) * 20

def crear_dirs():
    for d in [DIR_OUTPUT, DIR_OUT_GASTOS, DIR_OUT_NOMINA, DIR_OUT_RCV]:
        os.makedirs(d, exist_ok=True)
