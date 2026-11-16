# MainTek

**Modern maintenance management platform.** Track assets, automate preventive maintenance, manage inventory, and keep your operations running — from any device.

Built as a full-stack TypeScript monorepo with a NestJS API, Next.js web dashboard, and React Native mobile app.

---

## What It Does

- **Asset Management** — Full lifecycle tracking with QR codes, hierarchical locations, meter readings, warranty alerts, and downtime tracking
- **Work Orders** — Create, assign, and track corrective/preventive/emergency work with checklists, labor logging, parts usage, and digital signatures
- **Preventive Maintenance** — Schedule recurring PM plans by time or meter readings, auto-generate work orders
- **Inventory & Procurement** — Parts catalog, stock levels across storerooms, purchase orders, supplier management, service contracts
- **Teams & Permissions** — Role-based access control, crew management, multi-tenant isolation
- **Reports & Analytics** — Dashboard KPIs, export to CSV/PDF, scheduled report delivery, budget vs. actual tracking
- **Real-time Updates** — WebSocket notifications, live activity feeds
- **AI Assistant** — Natural language queries against your maintenance data (Anthropic, AWS Bedrock or Ollama)
- **Public Request Portal** — External users submit work requests without an account
- **Outbound Webhooks** — Push events to external systems with retry logic
- **Data Import** — Bulk CSV import with column mapping and validation
- **Mobile App** — QR scanning, offline mode, push notifications, field work order updates

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **API** | NestJS 11, TypeORM, PostgreSQL, Redis, BullMQ |
| **Web** | Next.js 15, React 18, Tailwind CSS, Shadcn/ui, Recharts |
| **Mobile** | Expo SDK 58, React Native 0.88, Expo Router |
| **Auth** | Better Auth (email/password, organizations, invitations) |
| **Storage** | MinIO / AWS S3 |
| **Real-time** | Socket.io with Redis adapter |
| **Jobs** | BullMQ (PM scheduling, exports, webhooks, imports, warranty checks, budget alerts) |
| **AI** | Anthropic / AWS Bedrock / Ollama |
| **Billing** | Stripe |
| **Infra** | Docker Compose, Caddy reverse proxy (automatic HTTPS), Railway |

---

## Project Structure

```
.
├── apps/
│   ├── api/            NestJS backend (REST + WebSocket)
│   ├── web/            Next.js dashboard
│   └── mobile/         Expo/React Native app
├── packages/
│   └── shared/         Shared types and utilities
├── infrastructure/
│   ├── caddy/          Reverse proxy config
│   ├── minio/          Object storage config
│   └── postgres/       DB initialization scripts
├── docker-compose.yml           Full stack (dev / self-host)
├── docker-compose.override.yml  Publishes DB/Redis/MinIO/Mailpit on localhost
├── docker-compose.prod.yml      Production (pre-built images)
└── Makefile            Common commands
```

### API Modules

```
modules/
├── assets/          Asset CRUD, QR codes, downtime, meters, documents, warranties
├── work-orders/     Work orders, checklists, labor, parts, attachments, public requests
├── pm/              Preventive maintenance plans and scheduling
├── inventory/       Parts, stock, purchase orders, suppliers, service contracts
├── users/           User management, teams, roles, multi-tenancy
├── reports/         Analytics, CSV/PDF export, scheduled reports, budgets
├── notifications/   Email and in-app notifications
├── webhooks/        Outbound webhook subscriptions and delivery
├── imports/         CSV data import with validation
├── files/           S3/MinIO file storage
├── realtime/        WebSocket gateway
├── ai/              AI-powered assistant (Anthropic/Bedrock/Ollama)
├── billing/         Stripe subscriptions
└── auth/            Better Auth sessions, membership + permission guards
```

---

## Getting Started

### Prerequisites

- Node.js 20+ and npm 10+
- Docker with Compose v2

### Option A — everything in Docker (quickest)

```bash
git clone https://github.com/automatq/cmms.git
cd cmms
cp .env.example .env
# Set BETTER_AUTH_SECRET in .env (required — compose refuses to start without it):
#   openssl rand -base64 32
make up
```

Open **http://localhost**, sign up, and create your organization. Caddy is the only entry point: `/api/*` and `/socket.io/*` go
to the API, everything else to the web app. Database migrations run
automatically when the API starts.

The API and worker containers run with `NODE_ENV=production`, so Swagger is
disabled in this mode. Useful extras (bound to 127.0.0.1 by
`docker-compose.override.yml`):

- **Mailpit** (captured sign-up / invite / report emails): http://localhost:8025
- **MinIO console:** http://localhost:9001
- **Postgres:** `localhost:5432`, **Redis:** `localhost:6379`

### Option B — API and web on the host (hot reload)

Run only the backing services in Docker and the apps with Node:

```bash
npm install                     # .npmrc already sets legacy-peer-deps
cp .env.example .env            # still needed for the container credentials
docker compose up -d postgres redis minio mailpit

cp apps/api/.env.example apps/api/.env
# Set BETTER_AUTH_SECRET in apps/api/.env (openssl rand -base64 32)

npm run dev:api                 # API on http://localhost:4000 (Swagger: /api/docs)
npm run dev:web                 # Web on http://localhost:3000
```

The defaults in `apps/api/.env.example` match the credentials in the root
`.env.example`; if you change one, change the other. The web app talks to
`http://localhost:4000/api/v1` unless `NEXT_PUBLIC_API_URL` is set.

### Mobile app

```bash
npm run dev:mobile              # expo start
```

Set `expo.extra.apiUrl` in `apps/mobile/app.json` to an API your device can
reach (e.g. `http://<your-LAN-IP>:4000/api/v1`, and add that origin to
`CORS_ORIGINS`). The app uses Expo SDK 58, so use a development build
(`npx expo run:android` / `npx expo run:ios`) or an EAS build if your Expo Go
doesn't support that SDK yet.

### AI assistant

Set `ANTHROPIC_API_KEY` to use Claude, or run Ollama locally:

```bash
docker compose --profile ai up -d ollama
make pull-models
```

### Promote a superadmin (optional)

The MainTek HQ admin console at `/dashboard/admin/tenants` lets operators
manage customer organizations, change plans, suspend tenants, and
impersonate users for support. It is hidden behind a `superadmin` role
that is not granted to anyone by default.

Sign up first, then:

```bash
make promote-superadmin EMAIL=you@example.com               # Docker stack
make promote-superadmin EMAIL=you@example.com REVOKE=true   # revoke

# or from the host, using apps/api/.env for the DB connection:
EMAIL=you@example.com npm run promote-superadmin --workspace=@maintek/api
```

All superadmin actions are logged to the `audit_log` table. Treat the
role as you would a database root account.

---

## Development

```bash
make up / make down       # Start / stop the Docker stack
make logs                 # Follow logs
make migrate              # Run migrations manually (they also run on API start)
make migration-generate name=AddSomething   # Host-side, uses apps/api/.env
make reset                # Full reset (drops all volumes — asks first)

# Tests and checks
npm test --workspace=@maintek/api
npm run typecheck
npm run lint
```

---

## Deployment

### Docker (self-hosted)

```bash
cp .env.production.example .env
# Set BETTER_AUTH_SECRET, strong DB/Redis/MinIO passwords, and:
#   SITE_ADDRESS=maintek.example.com
#   PUBLIC_URL=https://maintek.example.com
make prod-up               # docker compose -f docker-compose.prod.yml up -d
```

Point DNS at the server and open ports 80 and 443; Caddy obtains and renews
the TLS certificate automatically. `docker-compose.prod.yml` uses pre-built
images from a registry — build and push your own (`make docker-build`,
`make docker-push`) and update the image tags so you are running current code.

### Railway

The API and web app deploy as separate Railway services. See
`docs/railway-setup.md` and `docs/railway-minio.md`.

---

## Environment Variables

Root `.env` (Docker Compose):

| Variable | Required | Description |
|----------|----------|-------------|
| `BETTER_AUTH_SECRET` | Yes | Session signing secret (`openssl rand -base64 32`) |
| `PUBLIC_URL` | Yes | Public URL of the app (`http://localhost`, or `https://<SITE_ADDRESS>`) |
| `SITE_ADDRESS` | Prod | Public hostname; enables automatic HTTPS in Caddy |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Yes | Database credentials |
| `REDIS_PASSWORD` | Yes | Redis password |
| `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` | Yes | Object storage credentials |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | No | Billing |

API (`apps/api/.env`, or the container environment). In production the API
refuses to start without `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
`PUBLIC_WEB_URL`, `CORS_ORIGINS` and a database connection (`DATABASE_URL` or
`DB_HOST`/`DB_USERNAME`/`DB_PASSWORD`/`DB_DATABASE`).

| Variable | Description |
|----------|-------------|
| `BETTER_AUTH_URL` | Public URL of the API |
| `PUBLIC_WEB_URL` | Public URL of the web app (auth redirects, email links) |
| `CORS_ORIGINS` | Comma-separated allowed browser origins |
| `DB_RUN_MIGRATIONS` | Run migrations on startup (default `true`) |
| `EMAIL_PROVIDER` | `smtp`, `resend` or `ses` (plus `SMTP_*` / `RESEND_API_KEY`) |
| `AI_PROVIDER` | `anthropic`, `bedrock` or `ollama` (`ANTHROPIC_API_KEY`, `OLLAMA_BASE_URL`) |
| `WEBHOOK_ALLOW_HTTP` / `WEBHOOK_ALLOW_PRIVATE_TARGETS` | Relax webhook URL rules (development only) |

Full examples in `.env.example`, `.env.production.example` and `apps/api/.env.example`.

---

## Architecture

**Multi-tenant** — Every record is scoped to a `tenant_id`. Each signed-up
organization is a tenant; users belong to tenants through memberships with a
role, and roles map to permissions checked on every request.

**Auth flow** — Better Auth issues sessions (web and the Expo client on
mobile). A global guard resolves the session and the active organization
membership into a `RequestUser`; a permissions guard enforces the route's
required permissions. Socket.io connections are authenticated the same way.

**Background jobs** — BullMQ processors run in a separate worker process:
PM scheduling, warranty checks, report exports and scheduled reports, budget
alerts, webhook delivery, and data imports.

**Real-time** — Socket.io with Redis adapter for horizontal scaling.

---

## License

Private. All rights reserved.
