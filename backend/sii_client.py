"""
sii_client.py — Cliente SII para FinParty PCCh
Autenticación con RUT + Clave Tributaria (sin certificado digital).

Descarga automática de:
  - DTEs recibidos (Libro de Compras → M12 Egresos)
  - Boletas de Honorarios emitidas (M14 Personal)
  - Estado de F29 del período (Compliance)
  - Libro de ventas si aplica

Uso:
    from sii_client import SIIClient
    client = SIIClient()
    if client.login():
        dtes = client.obtener_dtes_recibidos('2026', '05')
        f29  = client.obtener_estado_f29('2026', '05')
"""
from __future__ import annotations

import json
import logging
import re
import time
from datetime import date
from typing import Optional

import requests
from requests import Session

from config import SII_RUT, SII_CLAVE_TRIBUTARIA

logger = logging.getLogger(__name__)

# ─── URLs SII ─────────────────────────────────────────────────────────────────
BASE_URL        = "https://zeusr.sii.cl"
LOGIN_URL       = f"{BASE_URL}/AUT2000/InicioAutenticacion/ingresaLogin.html"
AUTH_URL        = f"{BASE_URL}/AUT2000/InicioAutenticacion/autentificarse.html"
IECV_BASE       = "https://www4.sii.cl/consdcvinternetui/services"
RCVD_URL        = f"{IECV_BASE}/data/internos/segmento/COMPRAS"
BHE_URL         = "https://bhe.sii.cl/cgi_bhe/BHESERVICE.cgi"

# ─── Timeout y reintentos ─────────────────────────────────────────────────────
TIMEOUT         = 30
MAX_RETRIES     = 3


class SIIClient:
    """
    Cliente HTTP para el SII de Chile.
    Autentica con Clave Tributaria y descarga datos del IECV y BHE.
    """

    def __init__(self, rut: str = SII_RUT, clave: str = SII_CLAVE_TRIBUTARIA) -> None:
        if not rut or not clave:
            raise ValueError(
                "SII_RUT y SII_CLAVE_TRIBUTARIA deben estar configurados en backend/.env"
            )
        # Normalizar RUT: quitar puntos, mantener guión
        self.rut   = rut.replace(".", "").strip()
        self.clave = clave
        self.session: Session = requests.Session()
        self.session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "es-CL,es;q=0.9",
        })
        self._autenticado = False

    # ══════════════════════════════════════════════════════════════════════════
    #  AUTENTICACIÓN
    # ══════════════════════════════════════════════════════════════════════════

    def login(self) -> bool:
        """
        Inicia sesión en SII con Clave Tributaria.
        Retorna True si la autenticación fue exitosa.
        """
        try:
            logger.info("🔐 Iniciando sesión SII para RUT %s…", self.rut)

            # 1. GET página de login (obtiene cookies de sesión)
            resp = self.session.get(LOGIN_URL, timeout=TIMEOUT)
            resp.raise_for_status()
            time.sleep(1)

            # Separar RUT en número y dígito verificador
            partes = self.rut.split("-")
            if len(partes) != 2:
                raise ValueError(f"RUT mal formateado: {self.rut} (esperado: XXXXXXXX-D)")
            rut_numero, rut_dv = partes[0], partes[1]

            # 2. POST credenciales
            payload = {
                "rutcntr":  rut_numero,
                "dvcntr":   rut_dv.upper(),
                "clave":    self.clave,
                "referencia": "https://homer.sii.cl/",
            }
            resp2 = self.session.post(AUTH_URL, data=payload, timeout=TIMEOUT, allow_redirects=True)
            resp2.raise_for_status()

            # Verificar autenticación exitosa
            if self._verificar_sesion(resp2.text):
                self._autenticado = True
                logger.info("✅ Sesión SII establecida")
                return True
            else:
                logger.error("❌ SII rechazó las credenciales — verificar RUT/clave")
                return False

        except requests.exceptions.Timeout:
            logger.error("⏱ Timeout conectando al SII")
            return False
        except requests.exceptions.ConnectionError as e:
            logger.error("🔌 Error de conexión al SII: %s", e)
            return False
        except Exception as e:
            logger.error("Error inesperado en login SII: %s", e)
            return False

    def _verificar_sesion(self, html: str) -> bool:
        """Detecta si la respuesta indica sesión activa."""
        # SII muestra "Cerrar Sesión" o el RUT en el HTML cuando está autenticado
        indicadores = ["cerrarSesion", "Cerrar Sesi", "RUT Empresa", "sesion activa"]
        rechazos    = ["clave incorrecta", "RUT no válido", "vuelva a intentar", "Error de autenticación"]

        html_lower = html.lower()
        if any(r.lower() in html_lower for r in rechazos):
            return False
        return any(i.lower() in html_lower for i in indicadores)

    def _requiere_login(self) -> bool:
        if not self._autenticado:
            logger.warning("No autenticado — intentando login automático…")
            return self.login()
        return True

    # ══════════════════════════════════════════════════════════════════════════
    #  DTEs RECIBIDOS (Libro de Compras — Módulo 12 Egresos)
    # ══════════════════════════════════════════════════════════════════════════

    def obtener_dtes_recibidos(self, anio: str, mes: str) -> list[dict]:
        """
        Descarga los DTEs recibidos (facturas de proveedores) para un período.

        Args:
            anio: Año en formato '2026'
            mes:  Mes en formato '05'

        Returns:
            Lista de dicts con los documentos del período.
        """
        if not self._requiere_login():
            return []

        periodo = f"{anio}{mes}"
        logger.info("📥 Descargando DTEs recibidos período %s/%s…", mes, anio)

        try:
            # IECV API — Libro de Compras
            url = f"{RCVD_URL}/{periodo}/{self.rut.replace('-', '')}"
            resp = self.session.get(url, timeout=TIMEOUT)

            if resp.status_code == 404:
                logger.info("Sin DTEs recibidos para %s/%s", mes, anio)
                return []
            resp.raise_for_status()

            datos = resp.json()
            documentos = datos.get("data", {}).get("detalleDoc", [])

            resultado = []
            for doc in documentos:
                resultado.append({
                    "tipo":          doc.get("cdoc", ""),    # 33=Factura, 61=NotaCredito, etc.
                    "folio":         doc.get("folio", ""),
                    "fecha":         self._parse_fecha(doc.get("fchEmis", "")),
                    "rut_emisor":    doc.get("rutDoc", ""),
                    "razon_social":  doc.get("rsDoc", ""),
                    "monto_neto":    int(doc.get("mntNeto", 0) or 0),
                    "monto_iva":     int(doc.get("mntIVA", 0) or 0),
                    "monto_total":   int(doc.get("mntTotal", 0) or 0),
                    "estado":        doc.get("estadoSii", ""),
                    "periodo":       f"{anio}-{mes}",
                    "fuente":        "SII_IECV",
                })

            logger.info("📄 %d DTEs recibidos en %s/%s", len(resultado), mes, anio)
            return resultado

        except Exception as e:
            logger.error("Error descargando DTEs recibidos: %s", e)
            return []

    # ══════════════════════════════════════════════════════════════════════════
    #  BOLETAS DE HONORARIOS (BHE — Módulo 14 Personal)
    # ══════════════════════════════════════════════════════════════════════════

    def obtener_bhe_emitidas(self, anio: str, mes: str) -> list[dict]:
        """
        Descarga las BHE emitidas por el partido (como pagador) para un período.
        Estas corresponden a los honorarios pagados a los funcionarios.

        Returns:
            Lista de dicts con las BHEs del período.
        """
        if not self._requiere_login():
            return []

        logger.info("📥 Descargando BHEs emitidas período %s/%s…", mes, anio)

        try:
            url = (
                f"{BHE_URL}?opcion=listaBHEReceptor"
                f"&rutReceptor={self.rut.replace('-', '')}"
                f"&periodo={anio}{mes}"
            )
            resp = self.session.get(url, timeout=TIMEOUT)
            resp.raise_for_status()

            # La respuesta puede ser XML o JSON según el endpoint
            content_type = resp.headers.get("Content-Type", "")
            if "json" in content_type:
                datos = resp.json()
                boletas = datos.get("listaBHE", [])
            else:
                # Parseo básico de XML/HTML si aplica
                boletas = self._parsear_bhe_html(resp.text)

            resultado = []
            for b in boletas:
                bruto     = int(b.get("montoHonorarios", 0) or 0)
                retencion = round(bruto * 0.1075)
                liquido   = bruto - retencion
                resultado.append({
                    "folio":          b.get("folio", ""),
                    "fecha":          self._parse_fecha(b.get("fechaEmision", "")),
                    "rut_emisor":     b.get("rutEmisor", ""),
                    "nombre_emisor":  b.get("nombreEmisor", ""),
                    "monto_bruto":    bruto,
                    "monto_retencion":retencion,
                    "monto_liquido":  liquido,
                    "estado":         b.get("estado", ""),
                    "periodo":        f"{anio}-{mes}",
                    "fuente":         "SII_BHE",
                })

            logger.info("🧾 %d BHEs encontradas en %s/%s", len(resultado), mes, anio)
            return resultado

        except Exception as e:
            logger.error("Error descargando BHEs: %s", e)
            return []

    def _parsear_bhe_html(self, html: str) -> list[dict]:
        """Extrae datos de BHE desde respuesta HTML del SII."""
        boletas = []
        # Búsqueda básica de datos en tablas HTML del portal SII
        filas = re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.DOTALL | re.IGNORECASE)
        for fila in filas[1:]:  # saltar encabezado
            celdas = re.findall(r"<td[^>]*>(.*?)</td>", fila, re.DOTALL | re.IGNORECASE)
            celdas = [re.sub(r"<[^>]+>", "", c).strip() for c in celdas]
            if len(celdas) >= 5:
                try:
                    boletas.append({
                        "folio":         celdas[0] if len(celdas) > 0 else "",
                        "fechaEmision":  celdas[1] if len(celdas) > 1 else "",
                        "rutEmisor":     celdas[2] if len(celdas) > 2 else "",
                        "nombreEmisor":  celdas[3] if len(celdas) > 3 else "",
                        "montoHonorarios": re.sub(r"\D", "", celdas[4]) if len(celdas) > 4 else "0",
                        "estado":        celdas[5] if len(celdas) > 5 else "",
                    })
                except (IndexError, ValueError):
                    continue
        return boletas

    # ══════════════════════════════════════════════════════════════════════════
    #  ESTADO F29 (Compliance)
    # ══════════════════════════════════════════════════════════════════════════

    def obtener_estado_f29(self, anio: str, mes: str) -> Optional[dict]:
        """
        Consulta si el F29 del período fue declarado y pagado.

        Returns:
            Dict con estado del F29 o None si no se pudo consultar.
        """
        if not self._requiere_login():
            return None

        logger.info("📊 Consultando F29 período %s/%s…", mes, anio)

        try:
            url = (
                f"https://www4.sii.cl/consdcvinternetui/services/data/"
                f"internos/f29/estado/{self.rut.replace('-', '')}/{anio}{mes}"
            )
            resp = self.session.get(url, timeout=TIMEOUT)

            if resp.status_code == 404:
                return {"periodo": f"{anio}-{mes}", "estado": "no_declarado", "fuente": "SII_F29"}

            resp.raise_for_status()
            datos = resp.json()

            return {
                "periodo":         f"{anio}-{mes}",
                "estado":          datos.get("estado", "desconocido"),
                "monto_declarado": int(datos.get("montoDeclared", 0) or 0),
                "monto_pagado":    int(datos.get("montoPagado", 0) or 0),
                "fecha_pago":      datos.get("fechaPago", ""),
                "folio_f29":       datos.get("folio", ""),
                "fuente":          "SII_F29",
            }

        except Exception as e:
            logger.error("Error consultando F29: %s", e)
            return None

    # ══════════════════════════════════════════════════════════════════════════
    #  SINCRONIZACIÓN COMPLETA (llamar desde pipeline.py)
    # ══════════════════════════════════════════════════════════════════════════

    def sincronizar_periodo(self, anio: str, mes: str) -> dict:
        """
        Sincroniza todos los datos SII de un período.
        Retorna resumen de lo descargado.
        """
        resumen = {
            "periodo":       f"{anio}-{mes}",
            "dtes_recibidos": 0,
            "bhe_emitidas":   0,
            "f29_estado":     None,
            "errores":        [],
        }

        if not self.login():
            resumen["errores"].append("No se pudo autenticar en SII")
            return resumen

        # 1. DTEs recibidos
        dtes = self.obtener_dtes_recibidos(anio, mes)
        resumen["dtes_recibidos"] = len(dtes)
        resumen["dtes"] = dtes

        # 2. BHEs
        bhe = self.obtener_bhe_emitidas(anio, mes)
        resumen["bhe_emitidas"] = len(bhe)
        resumen["bhe"] = bhe

        # 3. F29
        f29 = self.obtener_estado_f29(anio, mes)
        resumen["f29_estado"] = f29

        logger.info(
            "✅ SII sync %s/%s — DTEs: %d | BHEs: %d | F29: %s",
            mes, anio,
            resumen["dtes_recibidos"],
            resumen["bhe_emitidas"],
            f29.get("estado", "?") if f29 else "no consultado",
        )
        return resumen

    # ══════════════════════════════════════════════════════════════════════════
    #  UTILIDADES
    # ══════════════════════════════════════════════════════════════════════════

    @staticmethod
    def _parse_fecha(fecha_str: str) -> str:
        """Normaliza fechas del SII (DD/MM/YYYY o YYYYMMDD) a YYYY-MM-DD."""
        if not fecha_str:
            return ""
        fecha_str = fecha_str.strip()
        # Formato DD/MM/YYYY
        m = re.match(r"(\d{2})/(\d{2})/(\d{4})", fecha_str)
        if m:
            return f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
        # Formato YYYYMMDD
        m = re.match(r"(\d{4})(\d{2})(\d{2})", fecha_str)
        if m:
            return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
        return fecha_str

    def cerrar_sesion(self) -> None:
        """Cierra la sesión SII."""
        try:
            self.session.get(f"{BASE_URL}/AUT2000/InicioAutenticacion/salir.html", timeout=10)
        except Exception:
            pass
        self._autenticado = False
        logger.info("🔒 Sesión SII cerrada")

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.cerrar_sesion()


# ══════════════════════════════════════════════════════════════════════════════
#  TEST MANUAL (ejecutar directamente: python sii_client.py)
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import sys
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    hoy  = date.today()
    anio = str(hoy.year)
    mes  = str(hoy.month).zfill(2)

    print(f"\n{'='*60}")
    print(f"  FinParty — Test SII Client")
    print(f"  RUT: {SII_RUT}  |  Período: {mes}/{anio}")
    print(f"{'='*60}\n")

    with SIIClient() as client:
        ok = client.login()
        if not ok:
            print("❌ Login fallido — verifica SII_CLAVE_TRIBUTARIA en backend/.env")
            sys.exit(1)

        resumen = client.sincronizar_periodo(anio, mes)

        print(f"\n📋 Resumen período {mes}/{anio}:")
        print(f"   DTEs recibidos : {resumen['dtes_recibidos']}")
        print(f"   BHEs emitidas  : {resumen['bhe_emitidas']}")
        print(f"   F29 estado     : {resumen['f29_estado']}")
        if resumen["errores"]:
            print(f"   Errores        : {resumen['errores']}")
