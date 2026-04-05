.PHONY: help dev bash logs migrate apply-migrate generate-prisma createsuperuser

help:
	@echo "Comandos disponibles:"
	@echo "  make dev              - Levanta el servicio app en modo desarrollo"
	@echo "  make bash             - Abre una shell dentro del contenedor app"
	@echo "  make logs             - Muestra logs en tiempo real del servicio app"
	@echo "  make migrate          - Ejecuta npx prisma migrate dev dentro de app"
	@echo "  make apply-migrate    - Ejecuta npx prisma migrate deploy dentro de app"
	@echo "  make generate-prisma  - Ejecuta npx prisma generate dentro de app"
	@echo "  make createsuperuser  - Crea un superusuario con src/manage.ts"

dev:
	docker compose up --build app

bash:
	docker compose exec app /bin/bash

logs:
	docker compose logs -f app

migrate:
	docker compose exec app sh -lc "npx prisma migrate dev"

apply-migrate:
	docker compose exec app sh -lc "npx prisma migrate deploy"

generate-prisma:
	docker compose exec app sh -lc "npx prisma generate"

createsuperuser:
	docker compose exec app sh -lc "cd src && npx ts-node manage.ts createsuperuser"