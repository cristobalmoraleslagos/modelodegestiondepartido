"""
api/main.py — FinParty API REST
FastAPI con CORS abierto para consumo desde el frontend React (local o Vercel).

Endpoints:
  GET  /api/gastos/serie          → Serie anual 2017–2026 (totales y categorías)
  GET  /api/gastos/mensual        → Detalle mensual de un año (?year=2026)
  GET  /api/gastos/categorias     → Totales por categoría para un año (?year=2026)
  GET  /api/uf/hoy                → Valor UF del día más reciente en BD
  GET  /api/alertas               → Alertas activas (género, F29, etc.)
  GET  /api/health                → Estado del servicio

Ejecución:
  uvicorn api.main:app --reload --port 8000
"""
from __future__ import annotations

import sys
from pathlib import Path

# Asegurar que el directorio raíz esté en sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, text
from typing import Optional

from db.database import SessionLocal, create_tables
from db.models import (
    GastoMensual, UFHistorica,
    IngresoRegistro, Prestamo, AporteCandidato, DocumentoEgreso,
)
from analytics import (
    proyectar_genero, calcular_burn_rate,
    validar_acreedor, validar_aporte_candidato,
    DOCS_REQUERIDOS, LIMITES_APORTE_UF,
)

# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="FinParty API",
    description="Control Financiero Partidario — Partido Comunista de Chile",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS: permite cualquier origen (frontend local o Vercel)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Crear tablas al arrancar (idempotente)
@app.on_event("startup")
def startup():
    create_tables()


# ─── /api/health ──────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    """Verificación de estado del servicio."""
    try:
        with SessionLocal() as session:
            session.execute(text("SELECT 1"))
        return {"status": "ok", "db": "conectada"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"BD no disponible: {e}")


# ─── /api/uf/hoy ──────────────────────────────────────────────────────────────
@app.get("/api/uf/hoy")
def uf_hoy():
    """Retorna el valor UF más reciente almacenado en la BD."""
    with SessionLocal() as session:
        uf = session.query(UFHistorica).order_by(UFHistorica.fecha.desc()).first()
        if not uf:
            # Valor por defecto si aún no se ha sincronizado
            return {"fecha": None, "valor": 40442.0, "fuente": "hardcoded"}
        return {
            "fecha": str(uf.fecha),
            "valor": float(uf.valor),
            "fuente": "mindicador.cl",
        }


# ─── /api/gastos/serie ────────────────────────────────────────────────────────
@app.get("/api/gastos/serie")
def gastos_serie():
    """
    Serie histórica anual 2017–2026.
    Retorna por año: total general y totales por las categorías principales.
    """
    with SessionLocal() as session:
        rows = (
            session.query(
                GastoMensual.año,
                GastoMensual.categoria,
                func.sum(GastoMensual.monto).label("total"),
            )
            .group_by(GastoMensual.año, GastoMensual.categoria)
            .order_by(GastoMensual.año)
            .all()
        )

    # Agrupar en dict por año
    por_año: dict[int, dict] = {}
    for row in rows:
        año = row.año
        if año not in por_año:
            por_año[año] = {
                "año": año,
                "gastoTotal": 0,
                "personal": 0,
                "bienes_servicios": 0,
                "otros_admin": 0,
                "genero": 0,
                "juvenil": 0,
                "educacion_civica": 0,
                "prestamos": 0,
                "campana": 0,
                "activo_fijo": 0,
                "formacion": 0,
                "otros": 0,
                "transferencias": 0,
                "inversiones": 0,
            }
        cat = row.categoria if row.categoria in por_año[año] else "otros"
        monto = int(row.total)
        por_año[año][cat] = por_año[año].get(cat, 0) + monto

        # No sumar transferencias al gasto total (son movimientos internos)
        if row.categoria != "transferencias":
            por_año[año]["gastoTotal"] += monto

    # Enriquecer con metadatos históricos conocidos
    _APORTES_ESTATALES = _APORTES_ESTATALES_FULL
    _CUOTAS_GENERO = {
        año: aporte * 0.10
        for año, aporte in _APORTES_ESTATALES.items()
    }

    resultado = []
    for año, datos in sorted(por_año.items()):
        datos["aporteEstatal"] = _APORTES_ESTATALES.get(año)
        datos["cuotaGenero"] = _CUOTAS_GENERO.get(año)
        datos["cumplimientoGenero"] = (
            round((datos["genero"] / datos["cuotaGenero"]) * 100, 1)
            if datos["cuotaGenero"] and datos["cuotaGenero"] > 0
            else None
        )
        resultado.append(datos)

    return {"serie": resultado, "total_años": len(resultado)}


# ─── /api/gastos/mensual ──────────────────────────────────────────────────────
@app.get("/api/gastos/mensual")
def gastos_mensual(year: int = Query(..., ge=2017, le=2030, description="Año a consultar")):
    """
    Detalle mensual de gastos para un año dado.
    Retorna 12 meses con totales por categoría.
    """
    with SessionLocal() as session:
        rows = (
            session.query(GastoMensual)
            .filter(GastoMensual.año == year)
            .order_by(GastoMensual.mes, GastoMensual.categoria)
            .all()
        )

    if not rows:
        raise HTTPException(status_code=404, detail=f"Sin datos para el año {year}")

    NOMBRES_MES = ["","Ene","Feb","Mar","Abr","May","Jun",
                   "Jul","Ago","Sep","Oct","Nov","Dic"]

    # Inicializar los 12 meses
    meses: dict[int, dict] = {}
    for m in range(1, 13):
        meses[m] = {
            "mes": m,
            "nombre": NOMBRES_MES[m],
            "personal": 0,
            "bienes_servicios": 0,
            "otros_admin": 0,
            "genero": 0,
            "juvenil": 0,
            "educacion_civica": 0,
            "prestamos": 0,
            "campana": 0,
            "activo_fijo": 0,
            "formacion": 0,
            "otros": 0,
            "total": 0,
        }

    for row in rows:
        m = row.mes
        cat = row.categoria if row.categoria in meses[m] else "otros"
        monto = row.monto
        meses[m][cat] = meses[m].get(cat, 0) + monto
        if row.categoria != "transferencias":
            meses[m]["total"] += monto

    return {
        "año": year,
        "meses": list(meses.values()),
    }


# ─── /api/gastos/categorias ───────────────────────────────────────────────────
@app.get("/api/gastos/categorias")
def gastos_categorias(year: int = Query(..., ge=2017, le=2030)):
    """Totales por categoría para un año. Útil para gráficos de torta/barras."""
    with SessionLocal() as session:
        rows = (
            session.query(
                GastoMensual.categoria,
                func.sum(GastoMensual.monto).label("total"),
            )
            .filter(GastoMensual.año == year)
            .group_by(GastoMensual.categoria)
            .order_by(func.sum(GastoMensual.monto).desc())
            .all()
        )

    if not rows:
        raise HTTPException(status_code=404, detail=f"Sin datos para {year}")

    return {
        "año": year,
        "categorias": [{"categoria": r.categoria, "monto": int(r.total)} for r in rows],
        "total": sum(int(r.total) for r in rows if r.categoria != "transferencias"),
    }


# ─── /api/alertas ─────────────────────────────────────────────────────────────
@app.get("/api/alertas")
def alertas():
    """
    Lista de alertas activas del sistema.
    Combina datos de BD + reglas de compliance.
    """
    items = []

    with SessionLocal() as session:
        # ── Alerta Fondo Género ────────────────────────────────────────────────
        CUOTA_GENERO_2025 = 120_000_000
        fila_genero = (
            session.query(func.sum(GastoMensual.monto))
            .filter(GastoMensual.año == 2025, GastoMensual.categoria == "genero")
            .scalar()
        )
        gasto_genero_2025 = int(fila_genero or 0)
        pct_genero = round((gasto_genero_2025 / CUOTA_GENERO_2025) * 100, 1)

        if pct_genero < 100:
            items.append({
                "id": "genero_2025",
                "tipo": "critico" if pct_genero < 50 else "advertencia",
                "titulo": "Fondo de Género 2025 — Incumplimiento Ley 20.900",
                "descripcion": (
                    f"Ejecutado: ${gasto_genero_2025:,.0f} ({pct_genero}% de la cuota). "
                    f"Déficit: ${CUOTA_GENERO_2025 - gasto_genero_2025:,.0f}"
                ),
                "modulo": "genero",
                "valor": pct_genero,
                "umbral": 100,
            })

        # ── UF desactualizada ─────────────────────────────────────────────────
        from datetime import date
        uf = session.query(UFHistorica).order_by(UFHistorica.fecha.desc()).first()
        if uf:
            dias_sin_uf = (date.today() - uf.fecha).days
            if dias_sin_uf > 3:
                items.append({
                    "id": "uf_desactualizada",
                    "tipo": "advertencia",
                    "titulo": "UF desactualizada",
                    "descripcion": f"Último valor: {uf.fecha} ({dias_sin_uf} días sin actualizar)",
                    "modulo": "sistema",
                    "valor": dias_sin_uf,
                    "umbral": 3,
                })

    return {"alertas": items, "total": len(items)}


# ─── /api/años ────────────────────────────────────────────────────────────────
@app.get("/api/años")
def años_disponibles():
    """Lista los años con datos cargados en la BD."""
    with SessionLocal() as session:
        años = (
            session.query(GastoMensual.año)
            .distinct()
            .order_by(GastoMensual.año)
            .all()
        )
    return {"años": [r.año for r in años]}


# ══════════════════════════════════════════════════════════════════════════════
#  INGRESOS — Módulo 6 SERVEL
# ══════════════════════════════════════════════════════════════════════════════

_APORTES_ESTATALES_FULL = {
    2017: 800_000_000,
    2018: 900_000_000,
    2019: 950_000_000,
    2020: 950_000_000,
    2021: 1_370_047_598,  # fuente: Balance SERVEL 2021 aprobado (corregido)
    2022: 1_240_127_041,  # fuente: Balance Clasificado SERVEL 2022
    2023: 1_200_000_000,
    2024: 1_200_000_000,
    2025: 1_200_000_000,
    2026: 134_400_000,    # Q1 2026 parcial — actualizar cuando SERVEL publique balance completo
}

TIPOS_INGRESO = ["aporte_estatal", "cotizaciones", "donacion", "reintegro", "arriendo", "interes", "otro"]


@app.get("/api/ingresos")
def get_ingresos(year: int = Query(..., ge=2017, le=2030)):
    """Ingresos registrados para un año, agrupados por tipo."""
    with SessionLocal() as session:
        rows = (
            session.query(
                IngresoRegistro.tipo,
                func.sum(IngresoRegistro.monto).label("total"),
            )
            .filter(IngresoRegistro.año == year)
            .group_by(IngresoRegistro.tipo)
            .all()
        )
    por_tipo = {r.tipo: int(r.total) for r in rows}
    total = sum(por_tipo.values())
    return {
        "año": year,
        "ingresos": [{"tipo": t, "monto": por_tipo.get(t, 0)} for t in TIPOS_INGRESO],
        "total": total,
        "aporte_estatal_referencia": _APORTES_ESTATALES_FULL.get(year),
    }


@app.post("/api/ingresos", status_code=201)
def crear_ingreso(body: dict):
    """Registra un nuevo ingreso."""
    from datetime import datetime as dt
    required = ["año", "mes", "tipo", "monto"]
    for f in required:
        if f not in body:
            raise HTTPException(400, f"Campo requerido: {f}")
    if body["tipo"] not in TIPOS_INGRESO:
        raise HTTPException(400, f"Tipo inválido. Opciones: {TIPOS_INGRESO}")
    with SessionLocal() as session:
        ingreso = IngresoRegistro(
            año=body["año"], mes=body["mes"], tipo=body["tipo"],
            monto=body["monto"], descripcion=body.get("descripcion"),
            rut_origen=body.get("rut_origen"), doc_ref=body.get("doc_ref"),
        )
        session.add(ingreso)
        session.commit()
        session.refresh(ingreso)
        return {"id": ingreso.id, "mensaje": "Ingreso registrado"}


@app.get("/api/ingresos/balance")
def balance_ingresos_egresos(year: int = Query(..., ge=2017, le=2030)):
    """Balance mensual: ingresos vs egresos para un año."""
    MESES = ["","Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
    with SessionLocal() as session:
        ing_rows = (
            session.query(IngresoRegistro.mes, func.sum(IngresoRegistro.monto).label("total"))
            .filter(IngresoRegistro.año == year)
            .group_by(IngresoRegistro.mes)
            .all()
        )
        eg_rows = (
            session.query(GastoMensual.mes, func.sum(GastoMensual.monto).label("total"))
            .filter(GastoMensual.año == year,
                    GastoMensual.categoria != "transferencias")
            .group_by(GastoMensual.mes)
            .all()
        )
    ing_por_mes = {r.mes: int(r.total) for r in ing_rows}
    eg_por_mes  = {r.mes: int(r.total) for r in eg_rows}
    meses = []
    for m in range(1, 13):
        ing = ing_por_mes.get(m, 0)
        eg  = eg_por_mes.get(m, 0)
        meses.append({
            "mes": m, "nombre": MESES[m],
            "ingresos": ing, "egresos": eg, "saldo": ing - eg,
        })
    total_ing = sum(ing_por_mes.values())
    total_eg  = sum(eg_por_mes.values())
    return {
        "año": year,
        "meses": meses,
        "total_ingresos": total_ing,
        "total_egresos": total_eg,
        "saldo_neto": total_ing - total_eg,
    }


# ══════════════════════════════════════════════════════════════════════════════
#  PRÉSTAMOS — Art. 14 Ley 20.900
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/prestamos")
def get_prestamos(estado: Optional[str] = Query(None)):
    """Lista de préstamos, con validación de legalidad de acreedor."""
    with SessionLocal() as session:
        q = session.query(Prestamo)
        if estado:
            q = q.filter(Prestamo.estado == estado)
        rows = q.order_by(Prestamo.fecha_inicio.desc()).all()
    result = []
    for p in rows:
        es_legal, motivo = validar_acreedor(p.tipo_acreedor)
        result.append({
            "id": p.id,
            "fecha_inicio": str(p.fecha_inicio),
            "acreedor_rut": p.acreedor_rut,
            "acreedor_nombre": p.acreedor_nombre,
            "tipo_acreedor": p.tipo_acreedor,
            "monto_original": p.monto_original,
            "tasa_interes": p.tasa_interes,
            "plazo_meses": p.plazo_meses,
            "monto_pendiente": p.monto_pendiente,
            "estado": p.estado,
            "numero_contrato": p.numero_contrato,
            "fecha_vencimiento": str(p.fecha_vencimiento) if p.fecha_vencimiento else None,
            "es_legal": es_legal,
            "alerta_legal": None if es_legal else motivo,
        })
    total_deuda = sum(p["monto_pendiente"] for p in result if p["estado"] == "vigente")
    ilegales = [p for p in result if not p["es_legal"]]
    return {
        "prestamos": result,
        "total_deuda_vigente": total_deuda,
        "cantidad_ilegales": len(ilegales),
        "alertas": [p["alerta_legal"] for p in ilegales],
    }


@app.post("/api/prestamos", status_code=201)
def crear_prestamo(body: dict):
    """Registra un nuevo préstamo con validación de acreedor."""
    required = ["fecha_inicio", "acreedor_rut", "acreedor_nombre", "tipo_acreedor",
                "monto_original", "monto_pendiente"]
    for f in required:
        if f not in body:
            raise HTTPException(400, f"Campo requerido: {f}")
    es_legal, motivo = validar_acreedor(body["tipo_acreedor"])
    with SessionLocal() as session:
        from datetime import date as d
        prestamo = Prestamo(
            fecha_inicio=d.fromisoformat(body["fecha_inicio"]),
            acreedor_rut=body["acreedor_rut"],
            acreedor_nombre=body["acreedor_nombre"],
            tipo_acreedor=body["tipo_acreedor"],
            monto_original=body["monto_original"],
            monto_pendiente=body["monto_pendiente"],
            tasa_interes=body.get("tasa_interes"),
            plazo_meses=body.get("plazo_meses"),
            numero_contrato=body.get("numero_contrato"),
            garantia=body.get("garantia"),
            es_legal=es_legal,
            observacion=None if es_legal else motivo,
        )
        session.add(prestamo)
        session.commit()
        session.refresh(prestamo)
        return {
            "id": prestamo.id,
            "es_legal": es_legal,
            "alerta": None if es_legal else motivo,
            "mensaje": "Préstamo registrado",
        }


# ══════════════════════════════════════════════════════════════════════════════
#  APORTES A CANDIDATOS — Ley 19.884
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/aportes-candidatos")
def get_aportes(year: int = Query(..., ge=2017, le=2030)):
    """Aportes a candidatos del año, con validación de límites."""
    uf = 40_442.0  # fallback
    with SessionLocal() as session:
        uf_row = session.query(UFHistorica).order_by(UFHistorica.fecha.desc()).first()
        if uf_row:
            uf = float(uf_row.valor)
        rows = (
            session.query(AporteCandidato)
            .filter(AporteCandidato.año == year)
            .order_by(AporteCandidato.fecha.desc())
            .all()
        )
    result = []
    for a in rows:
        dentro, pct, msg = validar_aporte_candidato(a.tipo_eleccion, a.monto, uf)
        result.append({
            "id": a.id,
            "rut_candidato": a.rut_candidato,
            "nombre_candidato": a.nombre_candidato,
            "tipo_eleccion": a.tipo_eleccion,
            "monto": a.monto,
            "fecha": str(a.fecha),
            "cuenta_campana": a.cuenta_campana,
            "dentro_limite": dentro,
            "pct_del_limite": pct,
            "mensaje_validacion": msg,
            "declarado_servel": a.declarado_servel,
            "estado": a.estado,
        })
    total = sum(r["monto"] for r in result)
    excedidos = [r for r in result if not r["dentro_limite"]]
    no_declarados = [r for r in result if not r["declarado_servel"]]
    return {
        "año": year,
        "aportes": result,
        "total_aportes": total,
        "cantidad_exceden_limite": len(excedidos),
        "cantidad_no_declarados_servel": len(no_declarados),
        "limites_por_cargo": {k: {"uf": v, "clp": int(v * uf)} for k, v in LIMITES_APORTE_UF.items()},
    }


@app.post("/api/aportes-candidatos", status_code=201)
def crear_aporte(body: dict):
    """Registra un aporte a candidato con validación automática."""
    required = ["año", "rut_candidato", "nombre_candidato", "tipo_eleccion", "monto", "fecha"]
    for f in required:
        if f not in body:
            raise HTTPException(400, f"Campo requerido: {f}")
    uf = 40_442.0
    with SessionLocal() as session:
        uf_row = session.query(UFHistorica).order_by(UFHistorica.fecha.desc()).first()
        if uf_row:
            uf = float(uf_row.valor)
    dentro, pct, msg = validar_aporte_candidato(body["tipo_eleccion"], body["monto"], uf)
    from datetime import date as d
    with SessionLocal() as session:
        aporte = AporteCandidato(
            año=body["año"],
            rut_candidato=body["rut_candidato"],
            nombre_candidato=body["nombre_candidato"],
            tipo_eleccion=body["tipo_eleccion"],
            monto=body["monto"],
            fecha=d.fromisoformat(body["fecha"]),
            cuenta_campana=body.get("cuenta_campana"),
            nro_transferencia=body.get("nro_transferencia"),
            limite_legal_uf=LIMITES_APORTE_UF.get(body["tipo_eleccion"].lower()),
            excede_limite=not dentro,
            declarado_servel=body.get("declarado_servel", False),
        )
        session.add(aporte)
        session.commit()
        session.refresh(aporte)
        return {
            "id": aporte.id,
            "dentro_limite": dentro,
            "pct_del_limite": pct,
            "mensaje": msg,
        }


# ══════════════════════════════════════════════════════════════════════════════
#  ANALYTICS — Proyecciones y alertas predictivas
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/analytics/genero-proyeccion")
def genero_proyeccion(year: int = Query(..., ge=2017, le=2030)):
    """
    Proyección de cumplimiento del Fondo de Género para el año dado.
    Usa regresión simple sobre los meses con datos cargados.
    """
    from datetime import date as d
    aporte = _APORTES_ESTATALES_FULL.get(year, 1_200_000_000)
    cuota  = int(aporte * 0.10)

    with SessionLocal() as session:
        rows = (
            session.query(GastoMensual.mes, func.sum(GastoMensual.monto).label("total"))
            .filter(GastoMensual.año == year, GastoMensual.categoria == "genero")
            .group_by(GastoMensual.mes)
            .order_by(GastoMensual.mes)
            .all()
        )
    gastos_por_mes = {r.mes: int(r.total) for r in rows}
    mes_actual = d.today().month if year == d.today().year else 12
    gastos_lista = [gastos_por_mes.get(m, 0) for m in range(1, mes_actual + 1)]

    proyeccion = proyectar_genero(gastos_lista, cuota, mes_actual)
    proyeccion["año"] = year
    proyeccion["cuota_anual"] = cuota
    proyeccion["aporte_estatal"] = aporte
    proyeccion["gastos_por_mes"] = [
        {"mes": m, "monto": gastos_por_mes.get(m, 0)} for m in range(1, 13)
    ]
    return proyeccion


@app.get("/api/analytics/burn-rate")
def burn_rate(year: int = Query(..., ge=2017, le=2030)):
    """Burn rate del presupuesto para el año dado."""
    from datetime import date as d
    presupuesto = _APORTES_ESTATALES_FULL.get(year, 1_200_000_000)
    mes_actual  = d.today().month if year == d.today().year else 12

    with SessionLocal() as session:
        total_gastado = (
            session.query(func.sum(GastoMensual.monto))
            .filter(GastoMensual.año == year,
                    GastoMensual.mes <= mes_actual,
                    GastoMensual.categoria != "transferencias")
            .scalar() or 0
        )
    return calcular_burn_rate(int(total_gastado), presupuesto, mes_actual)


# ══════════════════════════════════════════════════════════════════════════════
#  ITEMS SERVEL — documentos requeridos por categoría
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/items-servel/documentos")
def docs_por_item(categoria: Optional[str] = Query(None)):
    """
    Retorna los documentos requeridos por categoría SERVEL.
    Si se pasa ?categoria=genero, filtra solo esa categoría.
    """
    if categoria:
        docs = DOCS_REQUERIDOS.get(categoria)
        if docs is None:
            raise HTTPException(404, f"Categoría '{categoria}' no encontrada")
        return {"categoria": categoria, "documentos": docs}
    return {
        "categorias": [
            {"categoria": cat, "documentos": docs, "total": len(docs),
             "obligatorios": sum(1 for d in docs if d["obligatorio"])}
            for cat, docs in DOCS_REQUERIDOS.items()
        ]
    }
