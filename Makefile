.PHONY: up down build logs shell-api shell-db migrate seed pull-models reset prod-up prod-down prod-build prod-logs docker-build docker-push

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

shell-api:
	docker compose exec nexly-api sh

shell-db:
	docker compose exec postgres psql -U $${POSTGRES_USER} -d $${POSTGRES_DB}

migrate:
	docker compose exec nexly-api npm run migration:run

migration-generate:
	docker compose exec nexly-api npm run migration:generate -- src/database/migrations/$(name)

seed:
	docker compose exec nexly-api npm run seed

pull-models:
	docker compose exec ollama ollama pull llama3.1:8b
	docker compose exec ollama ollama pull nomic-embed-text
	docker compose exec ollama ollama pull qwen2.5-coder:7b

reset:
	@echo "WARNING: This will delete ALL data volumes (database, redis, minio)."
	@read -p "Are you sure? Type 'yes' to confirm: " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		docker compose down -v; \
		docker compose up -d; \
	else \
		echo "Aborted."; \
	fi

# Production commands (uses docker-compose.prod.yml)
prod-up:
	docker compose -f docker-compose.prod.yml up -d

prod-down:
	docker compose -f docker-compose.prod.yml down

prod-build:
	docker compose -f docker-compose.prod.yml build

prod-logs:
	docker compose -f docker-compose.prod.yml logs -f

# Docker image build and push commands
docker-build:
	@read -p "Enter registry URL (e.g., registry.example.com/nexly): " registry; \
	read -p "Enter tag (default: latest): " tag; \
	./scripts/docker-build.sh $$registry $${tag:-latest}

docker-push:
	@read -p "Enter registry URL (e.g., registry.example.com/nexly): " registry; \
	read -p "Enter tag (default: latest): " tag; \
	./scripts/docker-push.sh $$registry $${tag:-latest}
