-- FinParty PCCh — Inicialización PostgreSQL
-- Extensiones útiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- búsqueda fuzzy de RUTs/nombres

-- Esquema de trabajo
CREATE SCHEMA IF NOT EXISTS finparty;
SET search_path TO finparty, public;
