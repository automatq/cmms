# @maintek/api

NestJS 11 backend for MainTek. One codebase, two processes:

| Entry point | Command | Role |
|---|---|---|
| `src/main.ts` | `npm run start:dev` / `node dist/main` | REST API under `/api/v1`, Better Auth under `/api/auth`, Socket.io gateway, Swagger at `/api/docs` |
| `src/worker-main.ts` | `npm run start:worker` | Headless BullMQ worker running the seven background queues, with a `/api/v1/health` liveness endpoint |

Runtime dependencies: PostgreSQL 16 with the `uuid-ossp`, `vector` and `timescaledb`
extensions, Redis, and an S3-compatible object store.

## Run it

```bash
cp .env.example .env            # set BETTER_AUTH_SECRET; defaults match docs/docker-compose.dev.yml
npm run start:dev               # http://localhost:4000, watches for changes
```

Migrations run automatically on boot (`DB_RUN_MIGRATIONS=true` by default). To run them
explicitly, or to create a new one after changing an entity:

```bash
npm run migration:run
npm run migration:generate -- src/database/migrations/<Name>
npm run migration:revert
npm run seed                    # sample data for the current tenant
```

Other scripts:

```bash
npm test                        # Jest unit tests (jest.config.json)
npm run lint
EMAIL=you@example.com npm run promote-superadmin   # grant the platform superadmin role
```

## Layout

```
src/
├── main.ts / worker-main.ts    bootstrap for API and worker
├── app.module.ts               ConfigModule, TypeORM, BullMQ, Sentry, all feature modules
├── config/                     typed config factories + data-source.ts for the TypeORM CLI
├── database/
│   ├── migrations/             ordered TypeORM migrations (never edit a shipped one)
│   └── seed.ts                 sample data
├── common/                     guards, interceptors, logger, Sentry, Socket.io Redis adapter
└── modules/
    ├── auth/                   Better Auth instance, JwtAuthGuard, PermissionsGuard, decorators
    ├── users/                  users, roles, teams, tenants (organizations), invitations
    ├── assets/                 assets, categories, locations, meters, downtime, documents, QR
    ├── work-orders/            work orders, checklists, labor, parts, attachments, comments, public requests
    ├── pm/                     PM plans, templates, scheduler processor
    ├── blackouts/              maintenance blackout periods
    ├── inventory/              parts, storerooms, stock, transactions, suppliers, POs, service contracts
    ├── reports/                analytics, CSV/PDF export, scheduled reports, budgets
    ├── notifications/          in-app + email notifications, Handlebars templates
    ├── webhooks/               outbound webhook subscriptions and delivery processor
    ├── imports/                CSV import jobs and processor
    ├── files/                  S3 client, presigned URLs, bucket bootstrap
    ├── realtime/               Socket.io gateway
    ├── activity/               technician activity sessions (QR scan-to-work)
    └── ai/                     assistant with Anthropic, Bedrock and Ollama providers
```

## Request lifecycle

1. `JwtAuthGuard` reads the Better Auth session cookie or bearer token, loads the user, and
   resolves the active organization into `request.user.tenantId`. Routes marked `@Public()` skip this.
2. `PermissionsGuard` checks `@Permissions('work_orders:write')` style decorators
   against the member's role. Permission keys are `<module>:read` / `<module>:write`.
3. Every entity extends `TenantAwareEntity`; services filter by `tenantId` from the request.
4. A request logging interceptor emits one structured line per request; errors go to Sentry.

## Background queues

| Queue | Schedule | What it does |
|---|---|---|
| `pm-scheduler` | hourly | generates work orders for due time- and meter-based PM plans |
| `warranty-checker` | daily 06:00 | notifies on warranties expiring soon |
| `reorder-checker` | daily 06:00 | flags parts below reorder point |
| `budget-checker` | daily 07:00 | budget vs actual alerts |
| `report-export` | on demand | CSV / PDF generation and scheduled email reports |
| `webhook-delivery` | on demand | signed POSTs with retry/backoff |
| `data-imports` | on demand | CSV import with validation and column mapping |

## Configuration

See `.env.example` for local defaults and `../../.env.production.example` for a
fully commented production template. The important ones:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` or `DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_DATABASE` | Postgres |
| `REDIS_URL` or `REDIS_HOST/REDIS_PORT/REDIS_PASSWORD` | Redis for BullMQ and Socket.io |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `PUBLIC_WEB_URL`, `CORS_ORIGINS` | auth and allowed origins (all required in production) |
| `STORAGE_PROVIDER` (`minio` or `s3`) + `MINIO_*` / `AWS_REGION`, `S3_BUCKET` | object storage |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_PROVIDER`, `SMTP_*` | email |
| `ANTHROPIC_API_KEY` or `AI_PROVIDER=bedrock|ollama` | AI assistant (optional) |
| `SENTRY_DSN` | error tracking (optional) |
| `GOOGLE_*`, `GITHUB_*`, `APPLE_*` client ids | social sign-in (optional) |
