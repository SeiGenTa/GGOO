bash:
	docker compose exec app /bin/bash

dev:
	docker compose up --build app

logs:
	docker compose logs -f app