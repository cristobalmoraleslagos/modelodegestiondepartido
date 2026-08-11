"""
models.py — Modelos SQLAlchemy (PostgreSQL)
Esquema completo FinParty PCCh
"""
from __future__ import annotations

from datetime import datetime, date
from typing import Optional

from sqlalchemy import (
    BigInteger, Boolean, Date, DateTime, Float, ForeignKey,
    Integer, Numeric, String, Text, UniqueConstraint, Index,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.database import Base


# ══════════════════════════════════════════════════════════════════════
#  GASTOS MENSUALES — importados desde CSVs SERVEL (Módulo 12)
# ══════════════════════════════════════════════════════════════════════
class GastoMensual(Base):
    __tablename__ = "gastos_mensuales"
    __table_args__ = (
        UniqueConstraint("año", "mes", "categoria", name="uq_gasto_año_mes_cat"),
        Index("ix_gasto_año", "año"),
    )

    id:        Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    año:       Mapped[int]           = mapped_column(Integer, nullable=False)
    mes:       Mapped[int]           = mapped_column(Integer, nullable=False)  # 1–12
    categoria: Mapped[str]           = mapped_column(String(64), nullable=False)
    # Categorías: personal | bienes_servicios | otros_admin | genero |
    #             juvenil | educacion_civica | prestamos_corto | prestamos_largo |
    #             activo_fijo | campana | otros
    monto:     Mapped[int]           = mapped_column(BigInteger, default=0)
    fuente:    Mapped[Optional[str]] = mapped_column(String(64))   # nombre del CSV origen
    fecha_carga: Mapped[datetime]    = mapped_column(DateTime(timezone=True), default=func.now())


# ══════════════════════════════════════════════════════════════════════
#  EMAILS PROCESADOS — log de cada correo revisado
# ══════════════════════════════════════════════════════════════════════
class EmailProcesado(Base):
    __tablename__ = "emails_procesados"

    id:                  Mapped[int]            = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    uid:                 Mapped[str]            = mapped_column(String(64), unique=True, nullable=False, index=True)  # UID IMAP
    fecha_email:         Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    remitente:           Mapped[Optional[str]]  = mapped_column(String(255))
    asunto:              Mapped[Optional[str]]  = mapped_column(String(512))
    adjuntos_total:      Mapped[int]            = mapped_column(Integer, default=0)
    adjuntos_procesados: Mapped[int]            = mapped_column(Integer, default=0)
    estado:              Mapped[str]            = mapped_column(String(32), default="procesado")  # procesado | error | ignorado
    fecha_procesamiento: Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=func.now())
    error_mensaje:       Mapped[Optional[str]]  = mapped_column(Text)

    # Relación inversa
    documentos: Mapped[list["DocumentoCargado"]] = relationship(back_populates="email")


# ══════════════════════════════════════════════════════════════════════
#  DOCUMENTOS CARGADOS — cada adjunto parseado y cargado
# ══════════════════════════════════════════════════════════════════════
class DocumentoCargado(Base):
    __tablename__ = "documentos_cargados"
    __table_args__ = (
        # Unicidad: mismo RUT emisor + folio + tipo no puede cargarse dos veces
        UniqueConstraint("rut_emisor", "folio", "tipo", name="uq_doc_rut_folio_tipo"),
        Index("ix_doc_fecha", "fecha_documento"),
        Index("ix_doc_estado", "estado"),
        Index("ix_doc_tipo", "tipo"),
    )

    id:                Mapped[int]            = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    email_id:          Mapped[Optional[int]]  = mapped_column(BigInteger, ForeignKey("emails_procesados.id"), nullable=True)

    # Clasificación
    tipo:              Mapped[str]            = mapped_column(String(32))   # BHE | FACTURA | BOLETA | CARTOLA | PREVIRED | TGR_F29 | OTRO

    # Identificación del emisor
    rut_emisor:        Mapped[Optional[str]]  = mapped_column(String(20))
    nombre_emisor:     Mapped[Optional[str]]  = mapped_column(String(255))
    rut_receptor:      Mapped[Optional[str]]  = mapped_column(String(20))   # siempre 71701800-1 para el partido

    # Identificación del documento
    folio:             Mapped[Optional[str]]  = mapped_column(String(64))   # número de documento
    fecha_documento:   Mapped[Optional[date]] = mapped_column(Date)
    periodo:           Mapped[Optional[str]]  = mapped_column(String(7))    # "2026-05" para agrupar mensualmente

    # Montos (en pesos chilenos, sin decimales)
    monto_bruto:       Mapped[Optional[int]]  = mapped_column(BigInteger)
    monto_neto:        Mapped[Optional[int]]  = mapped_column(BigInteger)
    monto_retencion:   Mapped[Optional[int]]  = mapped_column(BigInteger)   # 10,75% BHE
    monto_iva:         Mapped[Optional[int]]  = mapped_column(BigInteger)   # 19% facturas
    monto_liquido:     Mapped[Optional[int]]  = mapped_column(BigInteger)   # bruto - retención

    # Descripción
    concepto:          Mapped[Optional[str]]  = mapped_column(Text)

    # Calidad del parseo
    confidence_score:  Mapped[float]          = mapped_column(Float, default=0.0)

    # Estado de carga
    estado:            Mapped[str]            = mapped_column(String(32), default="pendiente_revision")
    archivo_nombre:    Mapped[Optional[str]]  = mapped_column(String(255))
    archivo_tipo:      Mapped[Optional[str]]  = mapped_column(String(16))   # xml | pdf | xlsx

    # Aprobación manual (para docs bajo el umbral)
    aprobado_por:      Mapped[Optional[str]]  = mapped_column(String(128))
    fecha_aprobacion:  Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    notas:             Mapped[Optional[str]]  = mapped_column(Text)

    # Anulación (BHE anuladas) — se conservan en la base para trazabilidad
    anulada:           Mapped[bool]           = mapped_column(Boolean, default=False)
    fecha_anulacion:   Mapped[Optional[date]] = mapped_column(Date)
    motivo_anulacion:  Mapped[Optional[str]]  = mapped_column(Text)

    # Metadata
    fecha_carga:       Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=func.now())
    raw_json:          Mapped[Optional[str]]  = mapped_column(Text)         # JSON del parseo completo

    # Relación
    email:             Mapped[Optional["EmailProcesado"]] = relationship(back_populates="documentos")


# ══════════════════════════════════════════════════════════════════════
#  UF HISTÓRICA — sincronización diaria desde mindicador.cl
# ══════════════════════════════════════════════════════════════════════
class UFHistorica(Base):
    __tablename__ = "uf_historica"

    id:     Mapped[int]   = mapped_column(Integer, primary_key=True, autoincrement=True)
    fecha:  Mapped[date]  = mapped_column(Date, unique=True, index=True, nullable=False)
    valor:  Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)


# ══════════════════════════════════════════════════════════════════════
#  NÓMINA DE PERSONAL — datos SERVEL + honorarios
# ══════════════════════════════════════════════════════════════════════
class PersonalNomina(Base):
    __tablename__ = "personal_nomina"
    __table_args__ = (
        UniqueConstraint("rut", "periodo", name="uq_nomina_rut_periodo"),
    )

    id:                Mapped[int]            = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    rut:               Mapped[str]            = mapped_column(String(20), nullable=False, index=True)
    nombre:            Mapped[str]            = mapped_column(String(255), nullable=False)
    cargo:             Mapped[Optional[str]]  = mapped_column(String(255))
    tipo_contrato:     Mapped[str]            = mapped_column(String(32))   # honorarios | contrato | planta
    periodo:           Mapped[str]            = mapped_column(String(7))    # "2026-05"
    honorario_bruto:   Mapped[Optional[int]]  = mapped_column(BigInteger)
    retencion:         Mapped[Optional[int]]  = mapped_column(BigInteger)
    honorario_liquido: Mapped[Optional[int]]  = mapped_column(BigInteger)
    estado_pago:       Mapped[str]            = mapped_column(String(32), default="pendiente")
    fuente:            Mapped[Optional[str]]  = mapped_column(String(64))   # SERVEL | email | manual
    documento_id:      Mapped[Optional[int]]  = mapped_column(BigInteger, ForeignKey("documentos_cargados.id"))
    fecha_carga:       Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=func.now())


# ══════════════════════════════════════════════════════════════════════
#  RETENCIONES F29 — control de obligaciones SII
# ══════════════════════════════════════════════════════════════════════
class RetencionF29(Base):
    __tablename__ = "retenciones_f29"
    __table_args__ = (
        UniqueConstraint("periodo", name="uq_f29_periodo"),
    )

    id:                  Mapped[int]            = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    periodo:             Mapped[str]            = mapped_column(String(7), nullable=False)   # "2026-05"
    total_honorarios:    Mapped[Optional[int]]  = mapped_column(BigInteger)
    total_retencion:     Mapped[Optional[int]]  = mapped_column(BigInteger)
    cantidad_boletas:    Mapped[int]            = mapped_column(Integer, default=0)
    fecha_limite_pago:   Mapped[Optional[date]] = mapped_column(Date)                        # día 20 mes siguiente
    estado:              Mapped[str]            = mapped_column(String(32), default="pendiente")
    folio_f29:           Mapped[Optional[str]]  = mapped_column(String(64))
    monto_pagado:        Mapped[Optional[int]]  = mapped_column(BigInteger)
    fecha_pago:          Mapped[Optional[date]] = mapped_column(Date)
    fecha_carga:         Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=func.now())


# ══════════════════════════════════════════════════════════════════════
#  MOVIMIENTOS BANCARIOS — cartolas parseadas
# ══════════════════════════════════════════════════════════════════════
class MovimientoBancario(Base):
    __tablename__ = "movimientos_bancarios"
    __table_args__ = (
        UniqueConstraint("cuenta", "fecha", "descripcion", "monto", name="uq_mov_banco"),
    )

    id:            Mapped[int]            = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    cuenta:        Mapped[str]            = mapped_column(String(64), nullable=False)
    banco:         Mapped[Optional[str]]  = mapped_column(String(64))
    fecha:         Mapped[date]           = mapped_column(Date, nullable=False, index=True)
    descripcion:   Mapped[Optional[str]]  = mapped_column(Text)
    monto:         Mapped[int]            = mapped_column(BigInteger, nullable=False)          # negativo = egreso
    saldo:         Mapped[Optional[int]]  = mapped_column(BigInteger)
    tipo:          Mapped[Optional[str]]  = mapped_column(String(32))                          # cargo | abono
    conciliado:    Mapped[bool]           = mapped_column(Boolean, default=False)
    documento_id:  Mapped[Optional[int]]  = mapped_column(BigInteger, ForeignKey("documentos_cargados.id"))
    fecha_carga:   Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=func.now())


# ══════════════════════════════════════════════════════════════════════
#  INGRESOS — Módulo 6 SERVEL (aporte estatal, cotizaciones, donaciones)
# ══════════════════════════════════════════════════════════════════════
class IngresoRegistro(Base):
    __tablename__ = "ingresos"
    __table_args__ = (
        Index("ix_ingreso_año_mes", "año", "mes"),
    )

    id:          Mapped[int]           = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    año:         Mapped[int]           = mapped_column(Integer, nullable=False)
    mes:         Mapped[int]           = mapped_column(Integer, nullable=False)   # 1–12
    tipo:        Mapped[str]           = mapped_column(String(32), nullable=False)
    # aporte_estatal | cotizaciones | donacion | reintegro | arriendo | interes | otro
    monto:       Mapped[int]           = mapped_column(BigInteger, nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(Text)
    rut_origen:  Mapped[Optional[str]] = mapped_column(String(20))   # RUT donante si aplica
    doc_ref:     Mapped[Optional[str]] = mapped_column(String(128))  # nro. comprobante
    estado:      Mapped[str]           = mapped_column(String(32), default="registrado")
    # registrado | validado | rechazado
    fecha_carga: Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=func.now())


# ══════════════════════════════════════════════════════════════════════
#  PRÉSTAMOS — Módulo 17 SERVEL (solo bancos — Art. 14 Ley 20.900)
# ══════════════════════════════════════════════════════════════════════
class Prestamo(Base):
    __tablename__ = "prestamos"

    id:                Mapped[int]            = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    fecha_inicio:      Mapped[date]           = mapped_column(Date, nullable=False)
    acreedor_rut:      Mapped[str]            = mapped_column(String(20), nullable=False)
    acreedor_nombre:   Mapped[str]            = mapped_column(String(255), nullable=False)
    tipo_acreedor:     Mapped[str]            = mapped_column(String(32))
    # banco | cooperativa | caja_compensacion | otro
    monto_original:    Mapped[int]            = mapped_column(BigInteger, nullable=False)
    tasa_interes:      Mapped[Optional[float]]= mapped_column(Float)    # % anual
    plazo_meses:       Mapped[Optional[int]]  = mapped_column(Integer)
    monto_pendiente:   Mapped[int]            = mapped_column(BigInteger, nullable=False)
    estado:            Mapped[str]            = mapped_column(String(32), default="vigente")
    # vigente | pagado | vencido | restructurado
    numero_contrato:   Mapped[Optional[str]]  = mapped_column(String(128))
    garantia:          Mapped[Optional[str]]  = mapped_column(Text)
    fecha_vencimiento: Mapped[Optional[date]] = mapped_column(Date)
    es_legal:          Mapped[bool]           = mapped_column(Boolean, default=True)
    # False si acreedor NO es banco — alerta Art. 14 Ley 20.900
    observacion:       Mapped[Optional[str]]  = mapped_column(Text)
    fecha_carga:       Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=func.now())


# ══════════════════════════════════════════════════════════════════════
#  APORTES A CANDIDATOS — Ley 19.884 (cuenta separada obligatoria)
# ══════════════════════════════════════════════════════════════════════
class AporteCandidato(Base):
    __tablename__ = "aportes_candidatos"
    __table_args__ = (
        Index("ix_aporte_año", "año"),
    )

    id:                Mapped[int]            = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    año:               Mapped[int]            = mapped_column(Integer, nullable=False)
    rut_candidato:     Mapped[str]            = mapped_column(String(20), nullable=False)
    nombre_candidato:  Mapped[str]            = mapped_column(String(255), nullable=False)
    tipo_eleccion:     Mapped[str]            = mapped_column(String(32))
    # presidencial | senador | diputado | alcalde | concejal | gore | core
    monto:             Mapped[int]            = mapped_column(BigInteger, nullable=False)
    fecha:             Mapped[date]           = mapped_column(Date, nullable=False)
    cuenta_campana:    Mapped[Optional[str]]  = mapped_column(String(128))  # cuenta bancaria destino
    nro_transferencia: Mapped[Optional[str]]  = mapped_column(String(128))
    limite_legal_uf:   Mapped[Optional[float]]= mapped_column(Float)        # límite en UF para este cargo
    excede_limite:     Mapped[bool]           = mapped_column(Boolean, default=False)
    declarado_servel:  Mapped[bool]           = mapped_column(Boolean, default=False)
    fecha_declaracion: Mapped[Optional[date]] = mapped_column(Date)
    estado:            Mapped[str]            = mapped_column(String(32), default="registrado")
    fecha_carga:       Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=func.now())


# ══════════════════════════════════════════════════════════════════════
#  DOCUMENTOS POR EGRESO — checklist documental por ítem SERVEL
# ══════════════════════════════════════════════════════════════════════
class DocumentoEgreso(Base):
    __tablename__ = "documentos_egreso"
    __table_args__ = (
        Index("ix_docegreso_item", "item_servel_canon"),
        Index("ix_docegreso_estado", "estado"),
    )

    id:                Mapped[int]            = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    egreso_ref:        Mapped[Optional[str]]  = mapped_column(String(128))  # referencia libre (folio egreso)
    item_servel_canon: Mapped[str]            = mapped_column(String(64), nullable=False)
    # personal | honorarios | bienes_servicios | genero | juvenil |
    # educacion_civica | investigacion | formacion | activo_fijo |
    # campana | prestamos | aporte_candidato
    tipo_documento:    Mapped[str]            = mapped_column(String(64))
    # factura_dte | bhe_sii | transferencia | liquidacion | previred |
    # programa_evento | lista_asistentes | informe_actividad |
    # cotizacion | contrato | ficha_activo | declaracion_tricel
    es_obligatorio:    Mapped[bool]           = mapped_column(Boolean, default=True)
    estado:            Mapped[str]            = mapped_column(String(32), default="pendiente")
    # pendiente | cargado | validado | rechazado
    archivo_url:       Mapped[Optional[str]]  = mapped_column(Text)
    validado_por:      Mapped[Optional[str]]  = mapped_column(String(128))
    observacion:       Mapped[Optional[str]]  = mapped_column(Text)
    fecha_carga:       Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=func.now())


# ══════════════════════════════════════════════════════════════════════
#  USUARIOS — acceso intranet (funcionarios regulares y permanentes)
# ══════════════════════════════════════════════════════════════════════
class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = (
        Index("ix_usuario_username", "username"),
    )

    id:               Mapped[int]            = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    username:         Mapped[str]            = mapped_column(String(255), unique=True, nullable=False)  # email
    password_hash:    Mapped[str]            = mapped_column(String(255), nullable=False)               # bcrypt
    nombre:           Mapped[str]            = mapped_column(String(255), nullable=False)
    rol:              Mapped[str]            = mapped_column(String(32), default="funcionario")          # admin | funcionario | auditor
    rut:              Mapped[Optional[str]]  = mapped_column(String(20))                                 # vínculo a PersonalNomina
    activo:           Mapped[bool]           = mapped_column(Boolean, default=True)
    permanente:       Mapped[bool]           = mapped_column(Boolean, default=True)                      # funcionario regular y permanente
    creado_por:       Mapped[Optional[str]]  = mapped_column(String(128))
    fecha_creacion:   Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=func.now())
    ultimo_acceso:    Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    intentos_fallidos: Mapped[int]           = mapped_column(Integer, default=0)
    bloqueado_hasta:  Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    debe_cambiar_password: Mapped[bool]      = mapped_column(Boolean, default=False)  # fuerza cambio en primer login


# ══════════════════════════════════════════════════════════════════════
#  CONTRATOS — documentos de contrato por funcionario
# ══════════════════════════════════════════════════════════════════════
class Contrato(Base):
    __tablename__ = "contratos"
    __table_args__ = (
        Index("ix_contrato_rut", "funcionario_rut"),
    )

    id:                Mapped[int]            = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    funcionario_rut:   Mapped[str]            = mapped_column(String(20), nullable=False)
    funcionario_nombre: Mapped[str]           = mapped_column(String(255), nullable=False)
    tipo_contrato:     Mapped[str]            = mapped_column(String(32))    # honorarios | planta | codigo_trabajo
    fecha_inicio:      Mapped[Optional[date]] = mapped_column(Date)
    fecha_termino:     Mapped[Optional[date]] = mapped_column(Date)          # null = indefinido
    archivo_path:      Mapped[str]            = mapped_column(Text, nullable=False)
    archivo_nombre:    Mapped[str]            = mapped_column(String(255), nullable=False)
    archivo_hash:      Mapped[Optional[str]]  = mapped_column(String(64))    # sha256
    mime:              Mapped[Optional[str]]  = mapped_column(String(64))
    subido_por:        Mapped[Optional[str]]  = mapped_column(String(128))
    vigente:           Mapped[bool]           = mapped_column(Boolean, default=True)
    estado:            Mapped[str]            = mapped_column(String(32), default="cargado")
    fecha_carga:       Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=func.now())
    # ── Extensiones RRHH (spec §3.2) ──
    unidad_id:            Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("unidades_organizacionales.id"))
    jefatura_directa_id:  Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("empleados.id"))
    jornada:              Mapped[Optional[str]] = mapped_column(String(32))    # completa | parcial | teletrabajo
    sueldo_base_cifrado:  Mapped[Optional[str]] = mapped_column(Text)          # SENSIBLE: ciphertext, NUNCA en claro
    centro_costo:         Mapped[Optional[str]] = mapped_column(String(64))


# ══════════════════════════════════════════════════════════════════════
#  AUDIT LOG — registro inmutable de todas las operaciones del pipeline
# ══════════════════════════════════════════════════════════════════════
class AuditLog(Base):
    __tablename__ = "audit_log"

    id:          Mapped[int]           = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    timestamp:   Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=func.now(), index=True)
    accion:      Mapped[str]           = mapped_column(String(64))   # EMAIL_LEIDO | DOC_CARGADO | DOC_RECHAZADO | UF_ACTUALIZADA | etc.
    entidad:     Mapped[Optional[str]] = mapped_column(String(64))   # tabla afectada
    entidad_id:  Mapped[Optional[int]] = mapped_column(BigInteger)
    usuario:     Mapped[Optional[str]] = mapped_column(String(128))  # "pipeline" o nombre de usuario
    detalle:     Mapped[Optional[str]] = mapped_column(Text)         # JSON con detalles adicionales
    ip:          Mapped[Optional[str]] = mapped_column(String(64))   # IP de origen (auditoría de datos sensibles, spec §6)


# ══════════════════════════════════════════════════════════════════════
#  RRHH — Plataforma de Recursos Humanos (ver RRHH/HOJA-RUTA-RRHH.md)
#  Entidades nuevas del spec §3. Aditivas: no alteran el pipeline actual.
# ══════════════════════════════════════════════════════════════════════
class UnidadOrganizacional(Base):
    """Estructura jerárquica (área/departamento/jefatura) — spec §3.7."""
    __tablename__ = "unidades_organizacionales"

    id:         Mapped[int]            = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    nombre:     Mapped[str]            = mapped_column(String(255), nullable=False)
    tipo:       Mapped[str]            = mapped_column(String(32))    # area | departamento | jefatura
    parent_id:  Mapped[Optional[int]]  = mapped_column(BigInteger, ForeignKey("unidades_organizacionales.id"))
    activa:     Mapped[bool]           = mapped_column(Boolean, default=True)
    fecha_creacion: Mapped[datetime]   = mapped_column(DateTime(timezone=True), default=func.now())


class Empleado(Base):
    """Ficha del funcionario/a — spec §3.1. Vincula con PersonalNomina por RUT."""
    __tablename__ = "empleados"
    __table_args__ = (Index("ix_empleado_rut", "rut"),)

    id:                 Mapped[int]            = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    rut:                Mapped[str]            = mapped_column(String(20), unique=True, nullable=False)
    nombres:            Mapped[str]            = mapped_column(String(255), nullable=False)
    apellidos:          Mapped[str]            = mapped_column(String(255), nullable=False)
    fecha_nacimiento:   Mapped[Optional[date]] = mapped_column(Date)
    genero:             Mapped[Optional[str]]  = mapped_column(String(32))
    email_personal:     Mapped[Optional[str]]  = mapped_column(String(255))
    email_corporativo:  Mapped[Optional[str]]  = mapped_column(String(255))
    telefono:           Mapped[Optional[str]]  = mapped_column(String(64))
    direccion:          Mapped[Optional[str]]  = mapped_column(Text)
    contacto_emergencia: Mapped[Optional[dict]] = mapped_column(JSONB)   # {nombre, relacion, telefono}
    estado:             Mapped[str]            = mapped_column(String(32), default="activo")  # activo|inactivo|licencia|desvinculado
    fecha_ingreso:      Mapped[Optional[date]] = mapped_column(Date)
    fecha_egreso:       Mapped[Optional[date]] = mapped_column(Date)
    foto_url:           Mapped[Optional[str]]  = mapped_column(Text)
    unidad_id:          Mapped[Optional[int]]  = mapped_column(BigInteger, ForeignKey("unidades_organizacionales.id"))
    fecha_creacion:     Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=func.now())
    fecha_actualizacion: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())
    actualizado_por:    Mapped[Optional[str]]  = mapped_column(String(128))


class HistorialCargo(Base):
    """Trayectoria de cargo/unidad/jefatura/renta sin sobrescribir — spec §3.3."""
    __tablename__ = "historial_cargo"

    id:            Mapped[int]            = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    empleado_id:   Mapped[int]            = mapped_column(BigInteger, ForeignKey("empleados.id"), nullable=False)
    cargo:         Mapped[Optional[str]]  = mapped_column(String(255))
    unidad_id:     Mapped[Optional[int]]  = mapped_column(BigInteger, ForeignKey("unidades_organizacionales.id"))
    jefatura_id:   Mapped[Optional[int]]  = mapped_column(BigInteger, ForeignKey("empleados.id"))
    renta_ref_cifrada: Mapped[Optional[str]] = mapped_column(Text)      # SENSIBLE: ciphertext
    motivo:        Mapped[Optional[str]]  = mapped_column(String(32))   # promocion | traslado | ajuste | otro
    fecha_desde:   Mapped[date]           = mapped_column(Date, nullable=False)
    fecha_hasta:   Mapped[Optional[date]] = mapped_column(Date)
    fecha_creacion: Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=func.now())


class Ausentismo(Base):
    """Vacaciones, licencias médicas y permisos — spec §3.5."""
    __tablename__ = "ausentismos"

    id:            Mapped[int]            = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    empleado_id:   Mapped[int]            = mapped_column(BigInteger, ForeignKey("empleados.id"), nullable=False)
    tipo:          Mapped[str]            = mapped_column(String(32), nullable=False)  # vacaciones|licencia_medica|permiso
    fecha_inicio:  Mapped[date]           = mapped_column(Date, nullable=False)
    fecha_fin:     Mapped[date]           = mapped_column(Date, nullable=False)
    dias:          Mapped[Optional[float]] = mapped_column(Numeric(6, 2))
    estado:        Mapped[str]            = mapped_column(String(32), default="solicitado")  # solicitado|aprobado|rechazado
    aprobado_por:  Mapped[Optional[int]]  = mapped_column(BigInteger, ForeignKey("empleados.id"))
    documento_id:  Mapped[Optional[int]]  = mapped_column(BigInteger, ForeignKey("documentos_cargados.id"))
    observacion:   Mapped[Optional[str]]  = mapped_column(Text)
    fecha_creacion: Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=func.now())


class DatosPrevisionales(Base):
    """Datos previsionales/bancarios — spec §3.6. AISLADA, permisos estrictos.
    Los campos sensibles se guardan cifrados (ciphertext), nunca en claro."""
    __tablename__ = "datos_previsionales"

    id:              Mapped[int]            = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    empleado_id:     Mapped[int]            = mapped_column(BigInteger, ForeignKey("empleados.id"), unique=True, nullable=False)
    afp:             Mapped[Optional[str]]  = mapped_column(String(64))
    salud:           Mapped[Optional[str]]  = mapped_column(String(32))   # fonasa | isapre
    salud_detalle:   Mapped[Optional[str]]  = mapped_column(String(128))  # nombre isapre / tramo fonasa
    banco:           Mapped[Optional[str]]  = mapped_column(String(64))
    cuenta_bancaria_cifrada: Mapped[Optional[str]] = mapped_column(Text)  # SENSIBLE: ciphertext
    forma_pago:      Mapped[Optional[str]]  = mapped_column(String(32))   # transferencia | cheque | efectivo
    fecha_actualizacion: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())
    actualizado_por: Mapped[Optional[str]]  = mapped_column(String(128))
