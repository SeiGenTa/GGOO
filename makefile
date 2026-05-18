.PHONY: help dev prod build-dev build-prod bash logs migrate apply-migrate generate-prisma createsuperuser prisma-studio

help:
	@echo "Comandos disponibles:"
	@echo "  make dev              - Levanta el servicio app en modo desarrollo (rápido)"
	@echo "  make prod             - Levanta el servicio app en modo producción (rápido)"
	@echo "  make build-dev        - Reconstruye la imagen de Docker para desarrollo"
	@echo "  make build-prod       - Reconstruye la imagen de Docker para producción"
	@echo "  make bash             - Abre una shell dentro del contenedor app"
	@echo "  make logs             - Muestra logs en tiempo real del servicio app"
	@echo "  make migrate          - Ejecuta pnpm prisma migrate dev dentro de app"
	@echo "  make apply-migrate    - Ejecuta pnpm prisma migrate deploy dentro de app"
	@echo "  make generate-prisma  - Ejecuta pnpm prisma generate dentro de app"
	@echo "  make createsuperuser  - Crea un superusuario con src/manage.ts usando pnpm"
	@echo "  make prisma-studio    - Abre Prisma Studio para gestionar la base de datos"
	@echo "  make save-prod		   - Guarda la imagen de producción en un archivo tar"
	@echo "  make load-prod		   - Carga la imagen de producción desde un archivo tar"

dev:
	docker compose up app

prod:
	docker compose up app-production

build-dev:
	docker compose build app

build-prod:
	docker compose build app-production

bash:
	docker compose exec app sh

logs:
	docker compose logs -f app

migrate:
	docker compose exec app /home/node/.npm-global/bin/pnpm prisma migrate dev
apply-migrate:
	docker compose exec app sh -lc "/home/node/.npm-global/bin/pnpm prisma migrate deploy"

generate-prisma:
	docker compose exec app sh -lc "/home/node/.npm-global/bin/pnpm prisma generate"

createsuperuser:
	docker compose exec app sh -lc "cd src && /home/node/.npm-global/bin/pnpm ts-node manage.ts createsuperuser"

prisma-studio:
	docker compose exec app sh -lc "BROWSER=false /home/node/.npm-global/bin/pnpm prisma studio"

save-prod:
	docker save ggoo-app-production -o app-production.tar

load-prod:
	docker load -i app-production.tar