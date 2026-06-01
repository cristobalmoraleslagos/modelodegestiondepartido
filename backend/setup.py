"""
setup.py — Inicialización del entorno FinParty Backend
Ejecutar UNA VEZ después de clonar/copiar el proyecto en un equipo nuevo.

Uso:
  python setup.py

Realiza:
  1. Verifica Python >= 3.10
  2. Instala dependencias (pip install -r requirements.txt)
  3. Crea .env desde .env.example si no existe
  4. Verifica que Docker esté corriendo
  5. Levanta PostgreSQL + pgAdmin con docker-compose
  6. Espera que PostgreSQL esté listo
  7. Crea las tablas en la BD
  8. Prueba la conexión IMAP
  9. Imprime instrucciones de uso
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

BASE_DIR = Path(__file__).parent


def main():
    print_header()

    check_python_version()
    instalar_dependencias()
    crear_env()
    verificar_docker()
    levantar_base_de_datos()
    esperar_postgres()
    crear_tablas()
    imprimir_instrucciones()

    print("\n✅ Setup completado. El sistema está listo.\n")


def print_header():
    print("\n" + "═" * 55)
    print("  FinParty PCCh — Setup Inicial")
    print("  Partido Comunista de Chile · RUT 71.701.800-1")
    print("═" * 55 + "\n")


def check_python_version():
    print("🐍 Verificando versión de Python...")
    major, minor = sys.version_info[:2]
    if major < 3 or (major == 3 and minor < 10):
        print(f"   ❌ Se requiere Python 3.10+. Versión actual: {major}.{minor}")
        sys.exit(1)
    print(f"   ✅ Python {major}.{minor}")


def instalar_dependencias():
    print("\n📦 Instalando dependencias...")
    req = BASE_DIR / "requirements.txt"
    result = subprocess.run(
        [sys.executable, "-m", "pip", "install", "-r", str(req), "--quiet"],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        print(f"   ❌ Error instalando dependencias:\n{result.stderr}")
        sys.exit(1)
    print("   ✅ Dependencias instaladas")


def crear_env():
    env_path    = BASE_DIR / ".env"
    env_example = BASE_DIR / ".env.example"

    if env_path.exists():
        print(f"\n⚙  .env ya existe — omitiendo creación")
        return

    if not env_example.exists():
        print("   ⚠ No se encontró .env.example")
        return

    shutil.copy(env_example, env_path)
    print(f"\n⚙  .env creado desde .env.example")
    print(f"   ⚠ IMPORTANTE: Editar .env con las credenciales reales antes de ejecutar el pipeline")
    print(f"   📄 Abrir: {env_path}")


def verificar_docker():
    print("\n🐳 Verificando Docker...")
    result = subprocess.run(["docker", "info"], capture_output=True)
    if result.returncode != 0:
        print("   ❌ Docker no está corriendo.")
        print("   → Instalar Docker Desktop desde: https://www.docker.com/products/docker-desktop/")
        sys.exit(1)
    print("   ✅ Docker está corriendo")


def levantar_base_de_datos():
    print("\n🗄  Levantando PostgreSQL + pgAdmin...")
    compose_file = BASE_DIR / "docker-compose.yml"
    result = subprocess.run(
        ["docker", "compose", "-f", str(compose_file), "up", "-d"],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        print(f"   ❌ Error levantando Docker:\n{result.stderr}")
        sys.exit(1)
    print("   ✅ Contenedores iniciados")
    print("   📊 pgAdmin disponible en: http://localhost:5050")
    print("      Usuario: admin@pcch.cl | Contraseña: admin2026!")


def esperar_postgres():
    print("\n⏳ Esperando que PostgreSQL esté listo...")
    import importlib
    # Necesitamos que las dependencias estén instaladas para importar
    for _ in range(30):
        result = subprocess.run(
            ["docker", "exec", "finparty_db",
             "pg_isready", "-U", "finparty_user", "-d", "finparty"],
            capture_output=True,
        )
        if result.returncode == 0:
            print("   ✅ PostgreSQL listo")
            return
        print("   ... esperando", end="\r")
        time.sleep(2)
    print("   ⚠ PostgreSQL tardó más de lo esperado. Verificar con: docker logs finparty_db")


def crear_tablas():
    print("\n📐 Creando tablas en PostgreSQL...")
    try:
        # Re-importar config para que cargue el .env recién creado
        sys.path.insert(0, str(BASE_DIR))
        from db.database import create_tables
        create_tables()
        print("   ✅ Tablas creadas")
    except Exception as e:
        print(f"   ❌ Error creando tablas: {e}")
        print("   → Verificar credenciales en .env y que PostgreSQL esté corriendo")


def imprimir_instrucciones():
    print("\n" + "─" * 55)
    print("📋 INSTRUCCIONES DE USO")
    print("─" * 55)
    print("""
  1. Editar .env con las credenciales reales del correo:
       IMAP_USER = finanzas@pcch.cl
       IMAP_PASSWORD = (contraseña de aplicación Gmail)

  2. Probar conexiones:
       python main.py --test

  3. Ejecutar el pipeline una vez (manual):
       python main.py

  4. Programar ejecución diaria automática:

     Windows (Programador de tareas):
       Doble clic en run_daily.bat
       O ejecutar: run_daily.bat

     Linux/macOS:
       chmod +x run_daily.sh && ./run_daily.sh
       (agrega a crontab: 0 7 * * * /ruta/al/run_daily.sh)

  5. Ver documentos en revisión:
       http://localhost:5050 (pgAdmin)
       Tabla: documentos_cargados → estado='pendiente_revision'

  6. Ver logs en tiempo real:
       tail -f logs/pipeline.log

  Para detener PostgreSQL:
       docker compose down
  """)


if __name__ == "__main__":
    main()
