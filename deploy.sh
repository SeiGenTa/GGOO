#!/usr/bin/env bash
cd "$(dirname "$0")"

set -euo pipefail

echo "=== 1. Tirando últimos cambios de Git ==="
git pull

echo "=== 2. Descargando la última imagen de producción ==="
docker image pull ghcr.io/seigenta/ggoo:latest

echo "=== 3. Forzando limpieza de redes huérfanas ==="
docker network prune -f || true

echo "=== 4. Cargando variables del .env a la memoria de Swarm ==="
# 👇 ESTA LÍNEA ES CRÍTICA: Lee el .env, ignora comentarios y exporta todo al entorno
echo "=== 4. Cargando variables del .env a la memoria de Swarm ==="
# 👇 REEMPLAZA LA LÍNEA DEL EXPORT VIEJO POR ESTE BLOQUE SEGURO 👇
if [ -f .env ]; then
    while IFS= read -r line || [ -n "$line" ]; do
        # Ignora líneas vacías y comentarios
        if [[ ! "$line" =~ ^# && -n "$line" ]]; then
            export "$line"
        fi
    done < .env
else
    echo "ERROR: No se encontró el archivo .env"
    exit 1
fi

echo "=== 5. Desplegando en Docker Swarm con Variables de Entorno ==="
docker stack deploy --with-registry-auth -c docker-compose.prod.yml ggoo-production

echo "=== 6. Limpiando imágenes antiguas ==="
docker image prune -f

echo "=== 7. Verificando estado... ==="
sleep 3
docker service ps ggoo-production_app-production-web
