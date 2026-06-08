#!/usr/bin/env bash
cd "$(dirname "$0")"

echo "=== Directorio actual de trabajo: $(pwd) ==="

# Detiene el script si algún comando falla
set -euo pipefail

echo "=== 1. Tirando últimos cambios de Git ==="
git pull

echo "=== 2. Descargando la última imagen de producción ==="
docker image pull ghcr.io/seigenta/ggoo:latest

echo "=== 3. Forzando limpieza de redes huérfanas para evitar Pool Overlap ==="
# El '|| true' evita que el script se caiga si no encuentra redes para borrar
docker network prune -f || true

echo "=== 4. Desplegando en Docker Swarm ==="
# Usamos el archivo exclusivo de producción y el nombre de stack elegido
docker stack deploy --with-registry-auth -c docker-compose.prod.yml ggoo-production

echo "=== 5. Limpiando imágenes antiguas en desuso ==="
docker image prune -f

echo "=== 6. Despliegue solicitado. Verificando estado... ==="
# Esperamos 3 segundos breves para darle tiempo a Swarm de registrar la tarea
sleep 3
docker service ps ggoo-production_app-production-web