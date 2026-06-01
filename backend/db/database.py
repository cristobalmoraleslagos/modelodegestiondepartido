"""
database.py — Motor SQLAlchemy y sesión de base de datos
"""
from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from config import DATABASE_URL


# Motor con pool apropiado para uso local (un solo proceso)
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,          # reconecta si la conexión está caída
    pool_size=5,
    max_overflow=10,
    echo=False,                  # True para ver SQL en consola (debug)
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


class Base(DeclarativeBase):
    """Base declarativa compartida por todos los modelos."""
    pass


def get_session():
    """Context manager: uso recomendado → with get_session() as session: ..."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def create_tables():
    """Crear todas las tablas definidas en models.py (idempotente)."""
    from db import models  # noqa: importar modelos para que Base los registre
    Base.metadata.create_all(bind=engine)
