# Getting Started

This page gets a full MainTek stack running on a laptop: Postgres, Redis, object storage,
a mail catcher, the API, and the web app. Budget about ten minutes.

## Prerequisites

- Node.js 20 or newer, npm 10 or newer
- Docker Desktop (or any Docker engine with Compose v2)
- About 2 GB free for images

## 1. Clone and install

```bash
git clone https://github.com/automatq/cmms.git
cd cmms
npm install
```

The repo is an npm workspace monorepo. One install covers `apps/api`, `apps/web`,
`apps/mobile` and `packages/shared`.

## 2. Start the backing services

```bash
docker compose -f docs/docker-compose.dev.yml up -d
```

This starts:

| Service | Image | Host port | Notes |
|---|---|---|---|
| postgres | `timescale/timescaledb:latest-pg16` | 5432 | user/db `maintek`, password `maintek_secret_password`; `infrastructure/postgres/init.sql` enables `uuid-ossp`, `vector`, `timescaledb` |
| redis | `redis:7-alpine` | 6379 | no password |
| minio | `rustfs/rustfs` | 9000 (API), 9001 (console) | S3-compatible store; credentials `maintek_minio` / `maintek_minio_secret` |
| mailpit | `axllent/mailpit` | 1025 (SMTP), 8025 (web UI) | catches every email the app sends |

The service is called `minio` for continuity with the production config, but the image is
RustFS: the upstream MinIO images were removed from Docker Hub and Quay in 2025, and the
API only speaks S3 so either works.

## 3. Configure the API

```bash
cp apps/api/.env.example apps/api/.env
```

Set `BETTER_AUTH_SECRET` to any random string (`openssl rand -base64 32`). Everything
else in the example already matches the compose file above. The web app needs no env
file for local use; it defaults to `http://localhost:4000/api/v1`.

## 4. Run the apps

In two terminals from the repo root:

```bash
npm run dev:api      # NestJS in watch mode on :4000, runs migrations on boot
npm run dev:web      # Next.js dev server on :3000
```

You should see `Nest application successfully started` and `Ready in ...`. Then open
http://localhost:3000, click **Sign up**, create an account, and name your first
organization. You land on the dashboard with the onboarding wizard.

Useful URLs:

- Dashboard: http://localhost:3000/dashboard
- Swagger: http://localhost:4000/api/docs
- Health: http://localhost:4000/api/v1/health
- Emails: http://localhost:8025
- Object storage console: http://localhost:9001

## 5. Optional extras

```bash
npm run seed --workspace=@maintek/api           # sample assets, parts, work orders for your org
npm run dev:mobile                              # Expo dev server (set EXPO_PUBLIC_API_URL if not on localhost)
npm run start:worker --workspace=@maintek/api   # run the BullMQ worker as its own process
```

The hourly PM scheduler and the other queues are registered by the API process too, so
you only need the separate worker when testing worker-specific deploys.

### AI assistant locally

Set `ANTHROPIC_API_KEY` in `apps/api/.env` and restart the API, or run
[Ollama](https://ollama.com) and set `AI_PROVIDER=ollama`, `OLLAMA_BASE_URL`,
`OLLAMA_MODEL`. Without any of these the assistant page explains that no provider is
configured and the rest of the app works normally.

### Promote yourself to superadmin

The tenants console at `/dashboard/admin/tenants` is hidden unless your user has the
platform `superadmin` role:

```bash
EMAIL=you@example.com npm run promote-superadmin --workspace=@maintek/api
```

## Alternative: everything in Docker

`docker-compose.yml` at the repo root builds the API, worker and web images and serves
them behind Caddy on ports 80/443. It is the self-hosted production shape rather than a
dev loop (no hot reload, no published database ports):

```bash
cp .env.example .env         # root env for compose
make up                      # docker compose up -d
make logs
```

## Stopping and resetting

```bash
docker compose -f docs/docker-compose.dev.yml down        # stop, keep data
docker compose -f docs/docker-compose.dev.yml down -v     # stop and wipe volumes
```

See [Troubleshooting](Troubleshooting) if something does not come up.
