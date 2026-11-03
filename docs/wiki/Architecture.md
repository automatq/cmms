# Architecture

```
            ┌──────────────┐        ┌──────────────┐
            │  Next.js web │        │  Expo mobile │
            └──────┬───────┘        └──────┬───────┘
                   │ HTTPS + WebSocket     │
                   ▼                       ▼
        ┌──────────────────────────────────────────┐
        │   NestJS API  (/api/v1, /api/auth, ws)   │
        └───────┬───────────────┬──────────┬───────┘
                │               │          │
     ┌──────────▼───┐   ┌───────▼─────┐  ┌─▼─────────────┐
     │ PostgreSQL 16 │   │   Redis     │  │ S3 / MinIO     │
     │ (Timescale,   │   │ BullMQ +    │  │ files, photos  │
     │  pgvector)    │   │ socket.io   │  └────────────────┘
     └──────────────┘   └───────┬─────┘
                                │
                      ┌─────────▼──────────┐
                      │ NestJS worker       │
                      │ 7 BullMQ queues     │
                      └────────────────────┘
```

## Components

**API (`apps/api`).** A single NestJS 11 application. `main.ts` boots it as an HTTP
server with Express, Helmet, compression, a global `/api/v1` prefix, Swagger, and a
Socket.io gateway using the Redis adapter so several API replicas share rooms.
`worker-main.ts` boots the same `AppModule` as a headless application context so the
BullMQ processors run without serving HTTP (apart from a tiny health endpoint).

**Web (`apps/web`).** Next.js 15 App Router. The dashboard is a client-rendered SPA-style
tree under `(dashboard)`; marketing pages under `(public)` and the root are static. Data
access goes through one fetch client (`src/lib/api.ts`) with React Query hooks per
module. The Better Auth React client handles sessions with cookies.

**Mobile (`apps/mobile`).** Expo Router app sharing the same API and auth. Mutations are
queued offline and replayed on reconnect.

**Shared (`packages/shared`).** Color theme tokens used by both clients.

## Multi-tenancy

- A tenant is a Better Auth **organization** (`organizations` table, mapped to the
  `Tenant` entity). Users belong to organizations through `members` with a role of
  `owner`, `admin` or `member`.
- Every domain entity extends `TenantAwareEntity` and carries `tenant_id`. Unique keys are
  composite with `tenant_id` (asset numbers, WO numbers, SKUs, PO numbers).
- `JwtAuthGuard` resolves the caller's active organization once per request and puts it on
  `request.user.tenantId`; services filter on it. A database hook sets
  `active_organization_id` on new sessions to the user's highest-ranked membership.
- Row-level security policies were added early and later disabled (migration
  `DisableBrokenRLS`); isolation is enforced in the application layer.
- A platform-wide `superadmin` role (Better Auth admin plugin) is separate from org roles.
  It unlocks `/api/auth/admin/*`, the tenants controller, and the HQ console in the web
  app, and all of its actions are written to `audit_logs`.

## Authentication

Better Auth is mounted inside Nest at `/api/auth` with a raw-body handler (the rest of
the API gets JSON parsing re-added under `/api/v1`). Plugins: `organization`, `admin`,
`bearer`. Email + password is on; email verification is off at the moment; Google, GitHub
and Apple providers switch on when their client ids are set. Sessions are cookie based
for the web and bearer based for mobile. In production cookies are `Secure` and CORS
origins must be listed explicitly in `CORS_ORIGINS` (no wildcard fallback).

## Data layer

TypeORM with explicit migrations (`synchronize` is always off). The API runs pending
migrations on boot. Timestamps are `timestamptz`. Hot work-order queries have composite
indexes (`AddWorkOrderHotPathIndexes`). TimescaleDB is available for meter readings and
pgvector for AI embeddings, though neither is required by the current schema beyond the
extensions being present.

## Background work

BullMQ on Redis. Processors live next to their module (for example
`modules/pm/pm-scheduler.processor.ts`) and are registered in `AppModule`, so the API
process also executes jobs; the dedicated worker exists so production can scale and
restart it independently. Repeatable jobs: PM scheduler hourly, warranty and reorder
checks daily at 06:00, budget check daily at 07:00. See [Background Jobs](Background-Jobs).

## Real-time

Socket.io gateway in `modules/realtime`. Clients join a room per tenant; services emit
events for work-order changes, notifications and activity so dashboards update without
polling. The Redis adapter lets multiple API instances broadcast to each other.

## Files

`modules/files` wraps the AWS S3 SDK and works against S3, MinIO, RustFS or any
S3-compatible store (`forcePathStyle: true`). Uploads are validated by MIME type and
size (50 MB), stored under tenant-prefixed keys, and served through presigned URLs. A
separate public endpoint can be configured when the browser-reachable origin differs
from the internal one.

## Observability

Sentry is initialised before Nest in both entry points and in the web and mobile apps.
Production logging is JSON (one line per request from `RequestLoggingInterceptor`).
`GET /api/v1/health` reports database and Redis status and is used by Railway, Docker and
Caddy health checks.

## Deployment shape

Three Railway services (api, worker, web) plus managed Postgres and Redis and a MinIO
service with a volume. GitHub Actions deploys on every push to `main` after CI passes.
Self-hosters get the same topology from `docker-compose.prod.yml` behind Caddy. Details in
[Deployment](Deployment).
