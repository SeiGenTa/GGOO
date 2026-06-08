#!/usr/bin/env bash
cd "$(dirname "$0")"

echo "=== Directorio actual de trabajo: $(pwd) ==="

set -euo pipefail

echo "=== Pulling latest code ==="
git pull

# Descargamos la imagen exacta desde tu registro de GitHub
echo "=== Pulling latest image ==="
docker image pull ghcr.io/seigenta/ggoo:latest

echo "=== Recreating container ==="
docker stack deploy -c docker-compose.yml ggoo-production

echo "=== Cleaning up old images ==="
docker image prune -f

echo "=== Deploy complete ==="
# Consultamos el estado real del servicio en el clúster
docker service ps ggoo-production-production-web