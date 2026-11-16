.PHONY: up down build logs shell-api shell-db migrate promote-superadmin pull-models reset prod-up prod-down prod-build prod-logs docker-build docker-push

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

shell-api:
	docker compose exec maintek-api sh

shell-db:
	docker compose exec postgres psql -U $${POSTGRES_USER} -d $${POSTGRES_DB}

# Migrations also run automatically when the API starts (DB_RUN_MIGRATIONS=true).
# The container only ships compiled code, so run the compiled data source.
migrate:
	docker compose exec maintek-api npx typeorm migration:run -d dist/config/data-source.js

# Needs the TypeScript sources, so it runs on the host against the published
# Postgres port (see docker-compose.override.yml) using apps/api/.env.
migration-generate:
	npm run migration:generate --workspace=@maintek/api -- src/database/migrations/$(name)

# Usage: make promote-superadmin EMAIL=you@example.com  (add REVOKE=true to revoke)
# The account must already exist (sign up in the web app first).
promote-superadmin:
	@test -n "$(EMAIL)" || (echo "Usage: make promote-superadmin EMAIL=you@example.com" && exit 1)
	@echo "UPDATE users SET role = $(if $(filter true,$(REVOKE)),NULL,'superadmin'), updated_at = now() WHERE email = :'email' RETURNING email, role;" | \
		docker compose exec -T postgres sh -c 'psql -v ON_ERROR_STOP=1 -v email="$$1" -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"' _ "$(EMAIL)"

# Ollama is in the `ai` profile: start it with `docker compose --profile ai up -d ollama`.
pull-models:
	docker compose --profile ai exec ollama ollama pull llama3.2

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
	@read -p "Enter registry URL (e.g., registry.example.com/maintek): " registry; \
	read -p "Enter tag (default: latest): " tag; \
	./scripts/docker-build.sh $$registry $${tag:-latest}

docker-push:
	@read -p "Enter registry URL (e.g., registry.example.com/maintek): " registry; \
	read -p "Enter tag (default: latest): " tag; \
	./scripts/docker-push.sh $$registry $${tag:-latest}
