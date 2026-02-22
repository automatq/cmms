.PHONY: up down build logs shell-api shell-db migrate seed pull-models reset

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

shell-api:
	docker compose exec cmms-api sh

shell-db:
	docker compose exec postgres psql -U $${POSTGRES_USER} -d $${POSTGRES_DB}

migrate:
	docker compose exec cmms-api npm run migration:run

migration-generate:
	docker compose exec cmms-api npm run migration:generate -- src/database/migrations/$(name)

seed:
	docker compose exec cmms-api npm run seed

pull-models:
	docker compose exec ollama ollama pull llama3.1:8b
	docker compose exec ollama ollama pull nomic-embed-text
	docker compose exec ollama ollama pull qwen2.5-coder:7b

reset:
	docker compose down -v
	docker compose up -d
