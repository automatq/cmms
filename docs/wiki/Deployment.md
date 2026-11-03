# Deployment

## Railway (production)

Production runs on Railway as five services in one project:

| Service | Root | Build | Port | Health |
|---|---|---|---|---|
| `cmms-api` | `apps/api` | `Dockerfile` | 4000 | `/api/v1/health` |
| `cmms-worker` | `apps/api` | `Dockerfile.worker` (`railway.worker.json`) | 4000 | `/api/v1/health` |
| `cmms-web` | `apps/web` | `Dockerfile` | 3000 | `/` |
| `maintek-minio` | `infrastructure/minio` | `Dockerfile` | 9000 / 9001 | manual deploy |
| Postgres, Redis | Railway plugins | | | |

`.github/workflows/deploy-railway.yml` runs after CI succeeds on `main` and calls
`railway up --service <name> --ci` for api, worker and web. The worker's config file is
staged as `railway.json` during the job because the CLI only reads that name.

Setup, variables and the MinIO one-shot deploy are documented in the repo:

- [`docs/railway-setup.md`](https://github.com/automatq/cmms/blob/main/docs/railway-setup.md)
- [`docs/railway-minio.md`](https://github.com/automatq/cmms/blob/main/docs/railway-minio.md)

Minimum variables on the API and worker services: `NODE_ENV=production`,
`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `PUBLIC_WEB_URL`, `CORS_ORIGINS`, storage
(`STORAGE_PROVIDER` + `MINIO_*`), `RESEND_API_KEY`, `EMAIL_FROM`. `DATABASE_URL` and
`REDIS_URL` are injected by the plugins. Web needs `NEXT_PUBLIC_API_URL` at build time.

## Docker Compose (self-hosted)

```bash
cp .env.production.example .env     # fill in secrets and PUBLIC_URL
docker compose -f docker-compose.prod.yml up -d
```

Caddy terminates TLS for `PUBLIC_URL` automatically and proxies `/api/*` to the API and
everything else to the web app (`infrastructure/caddy/Caddyfile`). Postgres, Redis, MinIO
and Mailpit run as containers with named volumes. `make` targets wrap the common commands
(`make up`, `make logs`, `make migrate`, `make shell-db`). Add `--profile ai` to also
run Ollama and `make pull-models` to fetch models.

## AWS (Terraform)

`infrastructure/terraform` provisions ECS Fargate services for api, worker and web, RDS
Postgres, ElastiCache Redis, an S3 bucket, SES, an ALB with ACM certificate and CloudWatch
logs. Copy `terraform.tfvars.example`, then `terraform init && terraform apply`. Build and
push images with `scripts/docker-build.sh` and `scripts/docker-push.sh`.

## Release checklist

1. CI green on `main`.
2. New environment variables added to every environment before the deploy that needs them.
3. Migrations are additive or guarded; the API runs them on boot, so a failed migration
   blocks the deploy and the previous version keeps serving.
4. Watch `GET /api/v1/health` and Sentry for ten minutes after deploy.
5. For risky changes use the staging project described in
   [Backups and Staging](Backups-and-Staging).
