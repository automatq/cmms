# MainTek

**Open, multi-tenant maintenance management (CMMS) for teams that run physical assets.**
Track assets, dispatch work orders, automate preventive maintenance, manage parts and
purchasing, and report on all of it, from a browser or a phone.

[![CI](https://github.com/automatq/cmms/actions/workflows/ci.yml/badge.svg)](https://github.com/automatq/cmms/actions/workflows/ci.yml)
[![Deploy](https://github.com/automatq/cmms/actions/workflows/deploy-railway.yml/badge.svg)](https://github.com/automatq/cmms/actions/workflows/deploy-railway.yml)

| | |
|---|---|
| **Live app** | https://maintek.app |
| **Docs / wiki** | https://github.com/automatq/cmms/wiki |
| **API reference** | Swagger UI at `/api/docs` on any running API (http://localhost:4000/api/docs locally) |

---

## What it does

- **Assets** - hierarchical locations and categories, QR codes, meter readings, condition logs, downtime tracking, warranties, documents and photos.
- **Work orders** - corrective / preventive / inspection / emergency types, a seven-state lifecycle with hold reasons, checklists, labor and parts logging, attachments, comments with @mentions, technician assignment, kanban board, list and calendar views.
- **Preventive maintenance** - PM plans triggered by time, meter, condition, calendar or event. An hourly scheduler auto-generates work orders, with blackout periods and a template library.
- **Inventory and procurement** - parts catalog, multi-storeroom stock, transactions, reorder alerts, suppliers, purchase orders, service contracts.
- **Teams and access** - organizations (tenants) with owner / admin / member roles, teams, invitations, per-module permissions, and a hidden superadmin console for operators.
- **Reports** - dashboard KPIs with sparklines, nine report areas (work orders, costs, downtime, PM compliance, technician performance, inventory, warranties, assets, budgets), CSV and PDF export, scheduled email delivery.
- **Public request portal** - anyone with the link can submit a work request without an account; technicians are alerted.
- **AI assistant** - ask questions about your maintenance data in plain language, with context-aware help on asset and work-order pages. Runs on Anthropic Claude, AWS Bedrock, or a local Ollama server.
- **Integrations** - outbound webhooks with retries, bulk CSV import with column mapping, real-time updates over WebSockets.
- **Mobile app** - QR scanning, offline queue with sync, push notifications, field updates to work orders.

---

## Tech stack

| Layer | Technology |
|---|---|
| API | NestJS 11, TypeORM, PostgreSQL 16 (TimescaleDB + pgvector), Redis, BullMQ |
| Web | Next.js 15 (App Router), React 18, Tailwind CSS, shadcn/ui, Recharts, Playwright e2e |
| Mobile | Expo 50, React Native 0.73, Expo Router |
| Auth | [Better Auth](https://www.better-auth.com) with organization + admin plugins; optional Google / GitHub / Apple sign-in |
| Storage | S3-compatible object storage (MinIO locally, S3 or Railway MinIO in prod) |
| Email | Resend (transactional), SMTP or SES (notifications) |
| AI | Anthropic Claude, AWS Bedrock, or Ollama |
| Observability | Sentry on all three apps, JSON logs in production |
| Deploy | Railway (api, worker, web) via GitHub Actions; Docker Compose and Terraform (AWS) alternatives |

---

## Repository layout

```
.
├── apps/
│   ├── api/            NestJS REST + WebSocket API, BullMQ worker, migrations   -> apps/api/README.md
│   ├── web/            Next.js dashboard + marketing site                        -> apps/web/README.md
│   └── mobile/         Expo / React Native app                                   -> apps/mobile/README.md
├── packages/
│   └── shared/         Design tokens shared by web and mobile                    -> packages/shared/README.md
├── infrastructure/     Caddy reverse proxy, Postgres init SQL, Railway MinIO image
├── docs/               Runbooks (backups, Railway, staging) and the wiki source (docs/wiki)
├── scripts/            Docker build/push helpers, wiki publisher
├── docker-compose.yml  Full self-hosted stack behind Caddy
└── Makefile            Shortcuts for the compose stack
```

---

## Quick start (local development)

Prerequisites: Node.js 20+, npm 10+, Docker.

```bash
git clone https://github.com/automatq/cmms.git
cd cmms
npm install
```

**1. Start the backing services.** Postgres, Redis, object storage and a mail catcher.
The compose file below publishes them on localhost ports; the root `docker-compose.yml`
is the full production-style stack behind Caddy and does not expose ports.

```bash
docker compose -f docs/docker-compose.dev.yml up -d
```

**2. Configure the API.**

```bash
cp apps/api/.env.example apps/api/.env
```

Then set `BETTER_AUTH_SECRET` to any random string. The other defaults match the dev
compose file. See the [Configuration](https://github.com/automatq/cmms/wiki/Configuration)
wiki page for every variable.

**3. Run the API and web app** (two terminals).

```bash
npm run dev:api     # http://localhost:4000  (migrations run automatically on boot)
npm run dev:web     # http://localhost:3000
```

Open http://localhost:3000, create an account, create an organization, and you are on
the dashboard. Emails land in Mailpit at http://localhost:8025.

**Optional**

```bash
npm run dev:mobile                                   # Expo dev server
npm run seed --workspace=@maintek/api                # sample data
npm run migration:run --workspace=@maintek/api       # run migrations by hand
npm run e2e --workspace=@maintek/web                 # Playwright (set E2E_BASE_URL=http://localhost:3000)
```

More detail, including Docker-only and troubleshooting notes, lives in the wiki:
[Getting Started](https://github.com/automatq/cmms/wiki/Getting-Started).

---

## Deployment

- **Railway (current production).** The API, worker and web app deploy as three services
  from `main` through `.github/workflows/deploy-railway.yml`. Setup is documented in
  [docs/railway-setup.md](docs/railway-setup.md) and
  [docs/railway-minio.md](docs/railway-minio.md).
- **Docker Compose (self-hosted).** `docker compose -f docker-compose.prod.yml up -d`
  starts everything behind Caddy with automatic TLS. Copy `.env.production.example`
  to `.env` first.
- **AWS (Terraform).** `infrastructure/terraform` provisions ECS, RDS, ElastiCache, S3,
  SES and an ALB.

Backups, staging and operational runbooks: [docs/](docs/) and the
[Deployment](https://github.com/automatq/cmms/wiki/Deployment) wiki page.

---

## Architecture in one paragraph

Every row is scoped by `tenant_id`, and the API resolves the tenant from the caller's
active Better Auth organization on each request. The HTTP API and the BullMQ worker are
the same NestJS application started in two modes; the worker runs seven queues (PM
scheduling, warranty checks, reorder checks, budget alerts, report exports, webhook
delivery, CSV imports). Socket.io with a Redis adapter pushes live updates to the web and
mobile clients. Read the full picture on the
[Architecture](https://github.com/automatq/cmms/wiki/Architecture) wiki page.

---

## Contributing

Pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for the branch,
commit and review conventions, and run `npm run lint` and `npm run typecheck` before
opening a PR. CI runs typecheck, lint, a production dependency audit and a Playwright
smoke suite on every push.

## License

No license has been granted yet. All rights reserved by the MainTek authors.
