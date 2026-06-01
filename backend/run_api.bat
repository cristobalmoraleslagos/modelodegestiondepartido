@echo off
REM ═══════════════════════════════════════════════════════════
REM  FinParty PCCh — Arranca la API REST local
REM  Disponible en: http://localhost:8000
REM  Documentación: http://localhost:8000/api/docs
REM ═══════════════════════════════════════════════════════════

cd /d "%~dp0"

if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
)

echo Iniciando FinParty API en http://localhost:8000 ...
echo Documentacion: http://localhost:8000/api/docs
echo Presiona Ctrl+C para detener.
echo.

uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
