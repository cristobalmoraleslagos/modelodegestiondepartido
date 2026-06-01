@echo off
REM ═══════════════════════════════════════════════════════════
REM  FinParty PCCh — Ejecutor diario para Windows
REM  Programador de Tareas:
REM    Acción: Iniciar programa
REM    Programa: C:\ruta\al\backend\run_daily.bat
REM    Hora: 07:00 (todos los días)
REM ═══════════════════════════════════════════════════════════

REM Ir al directorio del backend
cd /d "%~dp0"

REM Activar entorno virtual si existe
if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
)

REM Verificar que Docker esté corriendo (levantar si es necesario)
docker compose up -d --quiet-pull 2>nul

REM Esperar 5 segundos para que PostgreSQL esté listo
timeout /t 5 /nobreak >nul

REM Ejecutar el pipeline
echo [%date% %time%] Iniciando pipeline FinParty... >> logs\run_daily.log
python main.py >> logs\run_daily.log 2>&1

REM Verificar resultado
if %errorlevel% == 0 (
    echo [%date% %time%] Pipeline completado sin errores. >> logs\run_daily.log
) else (
    echo [%date% %time%] Pipeline completado con errores. Ver logs\pipeline.log >> logs\run_daily.log
)
