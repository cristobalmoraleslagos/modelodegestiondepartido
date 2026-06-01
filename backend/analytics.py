"""
analytics.py — Motor de análisis financiero FinParty
Proyecciones, alertas predictivas y detección de anomalías.
"""
from __future__ import annotations

from typing import Optional
from datetime import date


# ─── Constantes normativas ────────────────────────────────────────────────────

# Ley 20.900 Art. 38 — cuota mínima Fondo de Género (10% aporte estatal)
CUOTA_GENERO_PCT = 0.10

# Ley 20.900 Art. 5 — sueldo máximo 60 UF/mes por funcionario
SUELDO_MAX_UF = 60.0

# Ley 19.884 — límites de aporte partidario por tipo de elección (en UF)
LIMITES_APORTE_UF: dict[str, float] = {
    "presidencial": 10_000.0,
    "senador":       3_000.0,
    "diputado":      1_000.0,
    "alcalde":         500.0,
    "concejal":        200.0,
    "gore":          3_000.0,
    "core":            200.0,
}

# Documentos requeridos por categoría canónica de gasto
DOCS_REQUERIDOS: dict[str, list[dict]] = {
    "personal": [
        {"tipo": "liquidacion_sueldo",    "label": "Liquidación de sueldo firmada",         "obligatorio": True},
        {"tipo": "transferencia",          "label": "Comprobante transferencia bancaria",     "obligatorio": True},
        {"tipo": "contrato",               "label": "Contrato de trabajo vigente",            "obligatorio": True},
        {"tipo": "previred",               "label": "Comprobante PREVIRED (cotizaciones)",    "obligatorio": True},
    ],
    "honorarios": [
        {"tipo": "bhe_sii",               "label": "BHE SII (estado: pagada)",               "obligatorio": True},
        {"tipo": "transferencia",          "label": "Comprobante transferencia bancaria",     "obligatorio": True},
        {"tipo": "contrato",               "label": "Contrato de honorarios vigente",         "obligatorio": True},
        {"tipo": "f29_retencion",          "label": "F29 con retención 10,75% declarada",    "obligatorio": True},
    ],
    "bienes_servicios": [
        {"tipo": "factura_dte",            "label": "Factura electrónica DTE (aceptada SII)", "obligatorio": True},
        {"tipo": "transferencia",          "label": "Comprobante transferencia bancaria",     "obligatorio": True},
        {"tipo": "cotizacion",             "label": "Cotización previa (si monto > 3 UTM)",  "obligatorio": False},
    ],
    "otros_admin": [
        {"tipo": "factura_dte",            "label": "Factura o boleta electrónica",           "obligatorio": True},
        {"tipo": "transferencia",          "label": "Comprobante transferencia bancaria",     "obligatorio": True},
    ],
    "genero": [
        {"tipo": "factura_dte",            "label": "Factura / boleta proveedor",             "obligatorio": True},
        {"tipo": "transferencia",          "label": "Comprobante transferencia bancaria",     "obligatorio": True},
        {"tipo": "programa_evento",        "label": "Programa oficial del evento (PDF)",      "obligatorio": True},
        {"tipo": "lista_asistentes",       "label": "Lista de asistentes con firmas",         "obligatorio": True},
        {"tipo": "informe_actividad",      "label": "Informe de actividad realizada",         "obligatorio": True},
    ],
    "juvenil": [
        {"tipo": "factura_dte",            "label": "Factura / boleta proveedor",             "obligatorio": True},
        {"tipo": "transferencia",          "label": "Comprobante transferencia bancaria",     "obligatorio": True},
        {"tipo": "programa_evento",        "label": "Programa del evento con rango etario",  "obligatorio": True},
        {"tipo": "lista_asistentes",       "label": "Lista de asistentes con fecha nacimiento","obligatorio": True},
        {"tipo": "informe_actividad",      "label": "Informe de actividad realizada",         "obligatorio": True},
    ],
    "educacion_civica": [
        {"tipo": "factura_dte",            "label": "Factura / BHE del ejecutor",             "obligatorio": True},
        {"tipo": "transferencia",          "label": "Comprobante transferencia bancaria",     "obligatorio": True},
        {"tipo": "programa_evento",        "label": "Programa o temario de la actividad",     "obligatorio": True},
        {"tipo": "entregable",             "label": "Entregable (publicación, informe, etc.)", "obligatorio": True},
    ],
    "investigacion": [
        {"tipo": "contrato",               "label": "Contrato u orden de trabajo investigador","obligatorio": True},
        {"tipo": "factura_dte",            "label": "Factura / BHE del investigador",         "obligatorio": True},
        {"tipo": "transferencia",          "label": "Comprobante transferencia bancaria",     "obligatorio": True},
        {"tipo": "entregable",             "label": "Informe de investigación o producto",    "obligatorio": True},
    ],
    "formacion": [
        {"tipo": "factura_dte",            "label": "Factura / BHE del relator",              "obligatorio": True},
        {"tipo": "transferencia",          "label": "Comprobante transferencia bancaria",     "obligatorio": True},
        {"tipo": "programa_evento",        "label": "Programa o contenidos del curso",        "obligatorio": True},
        {"tipo": "lista_asistentes",       "label": "Registro de participantes",              "obligatorio": True},
    ],
    "activo_fijo": [
        {"tipo": "factura_dte",            "label": "Factura de compra DTE (aceptada SII)",   "obligatorio": True},
        {"tipo": "transferencia",          "label": "Comprobante transferencia bancaria",     "obligatorio": True},
        {"tipo": "acta_recepcion",         "label": "Acta de recepción del bien (firmada)",   "obligatorio": True},
        {"tipo": "ficha_inventario",       "label": "Ficha inventario (código, vida útil)",   "obligatorio": True},
    ],
    "campana": [
        {"tipo": "factura_dte",            "label": "Factura del proveedor de campaña",       "obligatorio": True},
        {"tipo": "pago_cta_campana",       "label": "Pago DESDE cuenta corriente de campaña", "obligatorio": True},
        {"tipo": "declaracion_tricel",     "label": "Declaración de gastos TRICEL/SERVEL",    "obligatorio": True},
        {"tipo": "muestra_material",       "label": "Muestra del material (foto, captura)",   "obligatorio": False},
    ],
    "prestamos": [
        {"tipo": "contrato_prestamo",      "label": "Contrato de préstamo (solo banco/CF)",   "obligatorio": True},
        {"tipo": "transferencia",          "label": "Comprobante desembolso",                 "obligatorio": True},
        {"tipo": "tabla_amortizacion",     "label": "Tabla de amortización firmada",          "obligatorio": True},
    ],
    "aporte_candidato": [
        {"tipo": "resolucion_interna",     "label": "Resolución interna que autoriza el aporte","obligatorio": True},
        {"tipo": "pago_cta_campana",       "label": "Transferencia a cuenta campaña del candidato","obligatorio": True},
        {"tipo": "declaracion_servel",     "label": "Declaración ante SERVEL (15 días hábiles)","obligatorio": True},
    ],
    "transferencias": [
        {"tipo": "transferencia",          "label": "Comprobante transferencia cuenta origen", "obligatorio": True},
        {"tipo": "transferencia_destino",  "label": "Comprobante transferencia cuenta destino","obligatorio": True},
    ],
}


# ─── Proyección Fondo de Género ───────────────────────────────────────────────

def proyectar_genero(
    gastos_mensuales: list[int],   # gastos género meses 1..k del año actual (CLP)
    cuota_anual: int,              # cuota legal = aporte_estatal × 10%
    mes_actual: int,               # mes en curso (1–12)
) -> dict:
    """
    Proyecta el cumplimiento anual del Fondo de Género
    usando promedio móvil de los meses disponibles.

    Retorna:
      acumulado            → CLP gastados hasta mes_actual
      promedio_mensual     → gasto promedio por mes
      proyeccion_anual     → si el ritmo continúa, total al 31-dic
      pct_proyectado       → % de cuota que se alcanzaría
      deficit_proyectado   → CLP que faltan para cumplir cuota
      monto_mensual_needed → CLP adicionales por mes para llegar al 100%
      meses_restantes      → meses que quedan en el año
      cumple_proyeccion    → True si la proyección supera la cuota
      mes_critico          → mes límite para poder aún cumplir (si el ritmo fuera 0)
    """
    k = len(gastos_mensuales)
    acumulado = sum(gastos_mensuales) if k > 0 else 0
    meses_restantes = 12 - mes_actual

    if k == 0:
        return {
            "acumulado": 0,
            "promedio_mensual": 0,
            "proyeccion_anual": 0,
            "pct_proyectado": 0.0,
            "deficit_proyectado": cuota_anual,
            "monto_mensual_needed": cuota_anual / 12 if cuota_anual > 0 else 0,
            "meses_restantes": meses_restantes,
            "cumple_proyeccion": False,
            "mes_critico": None,
        }

    promedio = acumulado / k
    proyeccion_anual = acumulado + promedio * meses_restantes
    pct = round((proyeccion_anual / cuota_anual) * 100, 1) if cuota_anual > 0 else 0.0
    deficit = max(cuota_anual - proyeccion_anual, 0)

    # Monto extra por mes necesario para llegar al 100%
    if meses_restantes > 0:
        deficit_real = cuota_anual - acumulado
        monto_mensual = max(deficit_real / meses_restantes, 0)
    else:
        monto_mensual = 0.0

    # Mes crítico: si el promedio actual fuera 0, ¿cuánto tiempo queda antes de que
    # sea matemáticamente imposible cumplir aunque se gaste el máximo posible?
    # (no aplica aquí — se simplifica como "alerta roja si faltan < 3 meses y pct < 50")
    mes_critico = None
    if meses_restantes <= 3 and pct < 50:
        mes_critico = mes_actual

    return {
        "acumulado": acumulado,
        "promedio_mensual": int(promedio),
        "proyeccion_anual": int(proyeccion_anual),
        "pct_proyectado": pct,
        "deficit_proyectado": int(deficit),
        "monto_mensual_needed": int(monto_mensual),
        "meses_restantes": meses_restantes,
        "cumple_proyeccion": pct >= 100,
        "mes_critico": mes_critico,
    }


# ─── Burn rate ────────────────────────────────────────────────────────────────

def calcular_burn_rate(
    gasto_acumulado: int,
    presupuesto_anual: int,
    mes_actual: int,
) -> dict:
    """
    Calcula la velocidad de ejecución presupuestaria.
    Compara el gasto real vs el esperado lineal al mes_actual.
    """
    fraccion_año = mes_actual / 12
    gasto_esperado = int(presupuesto_anual * fraccion_año)
    pct_real = round((gasto_acumulado / presupuesto_anual) * 100, 1) if presupuesto_anual > 0 else 0
    pct_esperado = round(fraccion_año * 100, 1)
    variacion = round(pct_real - pct_esperado, 1)

    estado = "normal"
    if variacion > 15:
        estado = "sobreejecutado"
    elif variacion < -15:
        estado = "subeejecutado"

    return {
        "gasto_acumulado": gasto_acumulado,
        "gasto_esperado": gasto_esperado,
        "pct_real": pct_real,
        "pct_esperado": pct_esperado,
        "variacion": variacion,
        "estado": estado,
    }


# ─── Validación de acreedor (Ley 20.900 Art. 14) ─────────────────────────────

ACREEDORES_LEGALES = {
    "banco", "cooperativa", "caja_compensacion",
}

def validar_acreedor(tipo_acreedor: str) -> tuple[bool, str]:
    """
    Valida si un acreedor cumple Art. 14 Ley 20.900.
    Returns (es_legal, motivo).
    """
    if tipo_acreedor.lower() in ACREEDORES_LEGALES:
        return True, "Acreedor válido según Art. 14 Ley 20.900"
    return False, (
        f"ALERTA: '{tipo_acreedor}' no es una institución financiera autorizada. "
        "Art. 14 Ley 20.900 permite solo bancos, cooperativas y cajas de compensación."
    )


# ─── Validación límite aporte candidato (Ley 19.884) ─────────────────────────

def validar_aporte_candidato(
    tipo_eleccion: str,
    monto_clp: int,
    valor_uf: float,
) -> tuple[bool, float, str]:
    """
    Valida si un aporte a candidato supera el límite Ley 19.884.
    Returns (dentro_limite, pct_del_limite, mensaje).
    """
    limite_uf = LIMITES_APORTE_UF.get(tipo_eleccion.lower())
    if limite_uf is None:
        return True, 0.0, f"Tipo de elección '{tipo_eleccion}' sin límite configurado"

    limite_clp = int(limite_uf * valor_uf)
    pct = round((monto_clp / limite_clp) * 100, 1) if limite_clp > 0 else 0.0
    dentro = monto_clp <= limite_clp

    if dentro:
        msg = f"Dentro del límite ({pct}% de {limite_uf:.0f} UF = ${limite_clp:,.0f})"
    else:
        exceso = monto_clp - limite_clp
        msg = (
            f"EXCEDE LÍMITE: ${monto_clp:,.0f} > ${limite_clp:,.0f} ({limite_uf:.0f} UF). "
            f"Exceso: ${exceso:,.0f}"
        )

    return dentro, pct, msg
