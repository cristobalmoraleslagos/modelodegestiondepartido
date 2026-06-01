#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
#  FinParty PCCh — Ejecutor diario para Linux/macOS
#  Para agregar al crontab:
#    crontab -e
#    0 7 * * * /ruta/al/backend/run_daily.sh
# ═══════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

LOG_FILE="logs/run_daily.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] Iniciando pipeline FinParty..." >> "$LOG_FILE"

# Activar entorno virtual si existe
if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
fi

# Verificar/levantar Docker
docker compose up -d --quiet-pull 2>/dev/null || true
sleep 5  # esperar PostgreSQL

# Ejecutar pipeline
if python main.py >> "$LOG_FILE" 2>&1; then
    echo "[$DATE] Pipeline completado sin errores." >> "$LOG_FILE"
else
    echo "[$DATE] Pipeline completado con errores. Ver logs/pipeline.log" >> "$LOG_FILE"
fi
