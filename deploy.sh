#!/usr/bin/env bash
cd "$(dirname "$0")"

echo "=== Directorio actual de trabajo: $(pwd) ==="

set -euo pipefail

echo "=== 1. Descargando último código de Git ==="
git pull

echo "=== 2 Descargando nueva imagen ==="
docker pull ghcr.io/seigenta/ggoo:latest

echo "=== 3. Actualizando el servicio en Swarm ==="
docker stack deploy -c docker-compose.prod.yml app-production-web

echo "=== 4. Limpiando imágenes antiguas en el VPS ==="
# Elimina las imágenes viejas que quedaron huérfanas tras el update
docker image prune -f

echo "=== Despliegue completado con Swarm ==="
echo "=== Estado actual del servicio: ==="
docker service ps ggoo-production_app_app-production-web
