# Configuration

All configuration is environment variables. The API reads `apps/api/.env.local` then
`apps/api/.env` in development; in production set variables on the platform. Fully
commented templates: `apps/api/.env.example` (dev) and `.env.production.example` (prod).

In production (`NODE_ENV=production`) the API refuses to start unless
`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `PUBLIC_WEB_URL`, `CORS_ORIGINS` and a database
configuration are present.

## API

### Core

| Variable | Default | Notes |
|---|---|---|
| `NODE_ENV` | `development` | `production` enables env validation, JSON logs, secure cookies |
| `PORT` | `4000` | |
| `CORS_ORIGINS` | | comma-separated web origins; also become Better Auth trusted origins |
| `PUBLIC_WEB_URL` | `http://localhost:3000` | used in emails and redirects |
| `APP_BASE_URL` | | public base URL for links in notifications |

### Database

Either one URL or the discrete variables.

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | | `postgresql://user:pass@host:5432/db`; Railway injects this |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | localhost / 5432 / maintek | |
| `DB_SSL` | `false` | `true` for managed Postgres |
| `DB_SSL_REJECT_UNAUTHORIZED` | `true` | set `false` for self-signed certs |
| `DB_POOL_MAX` | `20` | |
| `DB_RUN_MIGRATIONS` | `true` | run pending migrations on boot |
| `DB_LOGGING` | `false` | log SQL |

### Redis

| Variable | Default |
|---|---|
| `REDIS_URL` | `redis://localhost:6379` (Railway injects this) |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` | localhost / 6379 / none |

### Auth

| Variable | Notes |
|---|---|
| `BETTER_AUTH_SECRET` | required; `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | public URL of the API, e.g. `https://api.maintek.app` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional social login |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | optional |
| `APPLE_CLIENT_ID` / `APPLE_CLIENT_SECRET` / `APPLE_BUNDLE_ID` | optional |
| `BILLING_ENFORCED` | `false`; there is no payment provider any more, leave it off |

### Storage

| Variable | Notes |
|---|---|
| `STORAGE_PROVIDER` | `minio` (any S3-compatible endpoint) or `s3` |
| `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL` | internal endpoint the API talks to |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` or `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` | either pair works |
| `MINIO_BUCKET` or `STORAGE_BUCKET` | default `maintek-files`; created on boot if missing |
| `MINIO_PUBLIC_ENDPOINT` | browser-reachable origin for presigned URLs when it differs from the internal one |
| `AWS_REGION`, `S3_BUCKET` | for `STORAGE_PROVIDER=s3`; uses the default AWS credential chain |

### Email

| Variable | Notes |
|---|---|
| `RESEND_API_KEY` | transactional mail (invitations, verification, scheduled reports). Empty = log and skip |
| `EMAIL_FROM` | verified sender for Resend |
| `EMAIL_PROVIDER` | `smtp` or `ses` for notification mail |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`/`SMTP_PASSWORD`, `SMTP_FROM` | Mailpit locally: `localhost:1025` |
| `SES_FROM_EMAIL` | with `EMAIL_PROVIDER=ses` |

### AI assistant

Precedence: `AI_PROVIDER` if set; otherwise Anthropic when `ANTHROPIC_API_KEY` exists;
otherwise Ollama.

| Variable | Notes |
|---|---|
| `AI_PROVIDER` | `anthropic`, `bedrock` or `ollama` |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | hosted Claude |
| `AWS_REGION` | for Bedrock |
| `OLLAMA_BASE_URL`, `OLLAMA_MODEL` | self-hosted; default `http://localhost:11434`, `llama3.2` |

### Observability

| Variable | Notes |
|---|---|
| `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE` | API |

### Legacy

`DEFAULT_TENANT_ID`, `DEFAULT_USER_ID`, `DEFAULT_USER_EMAIL` and `JWT_SECRET` date from
the pre-Better-Auth single-workspace mode. They are still read by a few seeds and the
compose files but are not needed for normal operation.

## Web

| Variable | Default | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api/v1` | baked in at build time; drives the CSP `connect-src` and the auth client |
| `NEXT_PUBLIC_FILES_URL` | | object storage origin to allow in `img-src` |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT` | | |
| `APP_BASE_URL` | | canonical site URL for metadata |

## Mobile

| Variable | Notes |
|---|---|
| `EXPO_PUBLIC_API_URL` | API base, defaults to local |
| `EXPO_PUBLIC_SENTRY_DSN` | optional |

## Docker Compose (root `.env`)

`PUBLIC_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `REDIS_PASSWORD`,
`MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `MINIO_BUCKET`, plus the auth and email
variables above. See `.env.example` at the root.
