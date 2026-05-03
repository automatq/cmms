# Railway Deployment Setup

## Services

| Service | Root Directory | Dockerfile | Port | Health Check |
|---------|---------------|------------|------|-------------|
| nexly-api | `apps/api` | `Dockerfile` | 4000 | `/api/v1/health` |
| nexly-worker | `apps/api` | `Dockerfile.worker` | — | — |
| nexly-web | `apps/web` | `Dockerfile` | 3000 | `/` |
| Postgres | — | Railway plugin | 5432 | — |
| Redis | — | Railway plugin | 6379 | — |

## Environment Variables

### Auto-injected by Railway plugins
- `DATABASE_URL` — from Postgres plugin (shared to nexly-api and nexly-worker)
- `REDIS_URL` — from Redis plugin (shared to nexly-api and nexly-worker)

### Shared variables (set once, used by multiple services)
| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Random 64-char string for JWT signing |
| `PUBLIC_URL` | Public URL of the API (e.g., `https://nexly-api-production.up.railway.app`) |
| `DEFAULT_TENANT_ID` | UUID of the seeded shared tenant (optional; defaults to `0...001`) |
| `DEFAULT_USER_ID` | UUID of the seeded admin user (optional; defaults to `0...002`) |
| `DEFAULT_USER_EMAIL` | Email shown on the seeded admin user (optional) |

### nexly-api service variables
| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `production` |
| `CORS_ORIGINS` | Comma-separated allowed origins (e.g., `https://nexly-web-production.up.railway.app`) |
| `STORAGE_PROVIDER` | `minio` or `s3` |
| `MINIO_ENDPOINT` | MinIO Railway private domain (if using MinIO) |
| `MINIO_PORT` | `9000` |
| `MINIO_BUCKET` | `nexly-files` |
| `MINIO_ROOT_USER` | MinIO access key |
| `MINIO_ROOT_PASSWORD` | MinIO secret key |
| `STRIPE_SECRET_KEY` | Stripe API key (optional) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (optional) |

### nexly-worker service variables
Same `DATABASE_URL`, `REDIS_URL`, and `NODE_ENV` as the API.

### nexly-web service variables (build args)
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Public API URL |

## CI/CD

Push to `main` triggers `.github/workflows/deploy-railway.yml`, which deploys all three services using the Railway CLI.

**Required GitHub secret:** `RAILWAY_TOKEN` — generate from Railway dashboard → Account Settings → Tokens.

## AWS (future)

AWS infrastructure (Terraform + ECS deploy workflow) is preserved in:
- `infrastructure/terraform-aws/` — full Terraform config
- `.github/workflows/deploy.yml` — manual-trigger-only AWS deploy

To migrate to AWS later, run `terraform apply` in `infrastructure/terraform-aws/` and re-enable the AWS deploy workflow.
