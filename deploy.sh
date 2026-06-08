#!/usr/bin/env bash
cd "$(dirname "$0")"

echo "=== Directorio actual de trabajo: $(pwd) ==="

set -euo pipefail

echo "=== Pulling latest code ==="
git pull

echo "=== Pulling latest image ==="
docker compose pull app-production-web

echo "=== Recreating container ==="
docker compose up -d --force-recreate app-production-web

echo "=== Cleaning up old images ==="
docker image prune -f

echo "=== Deploy complete ==="
docker compose ps app-production-web