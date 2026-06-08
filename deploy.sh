#!/usr/bin/env bash
cd "$(dirname "$0")"

echo "=== Directorio actual de trabajo: $(pwd) ==="

set -euo pipefail

echo "=== 1. Descargando último código de Git ==="
git pull

echo "=== 3. Actualizando el Servicio en el Swarm (Zero-Downtime) ==="
# Este comando le dice a Swarm que descargue la última versión de la imagen 'latest'
# y haga el reemplazo progresivo en producción sin apagar la web.
docker service update \
  --image ghcr.io/seigenta/ggoo:latest \
  --with-registry-auth \
  ggoo-production_app_app-production-web

echo "=== 4. Limpiando imágenes antiguas en el VPS ==="
# Elimina las imágenes viejas que quedaron huérfanas tras el update
docker image prune -f

echo "=== Despliegue completado con Swarm ==="
echo "=== Estado actual del servicio: ==="
docker service ps ggoo-production_app_app-production-web
