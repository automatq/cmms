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
- **AI Assistant** — Natural language queries against your maintenance data (AWS Bedrock or Ollama)
- **Public Request Portal** — External users submit work requests without an account
- **Outbound Webhooks** — Push events to external systems with retry logic
- **Data Import** — Bulk CSV import with column mapping and validation
- **Mobile App** — QR scanning, offline mode, push notifications, field work order updates

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **API** | NestJS 10, TypeORM, PostgreSQL, Redis, BullMQ |
| **Web** | Next.js 14, React 18, Tailwind CSS, Shadcn/ui, Recharts |
| **Mobile** | Expo 50, React Native 0.73, Expo Router |
| **Auth** | None — single shared workspace mode |
| **Storage** | MinIO / AWS S3 |
| **Real-time** | Socket.io with Redis adapter |
| **Jobs** | BullMQ (PM scheduling, exports, webhooks, imports, warranty checks, budget alerts) |
| **AI** | AWS Bedrock / Ollama |
| **Billing** | Stripe |
| **Infra** | Docker Compose, Terraform (AWS ECS/RDS/ElastiCache/S3), Caddy reverse proxy |

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
│   ├── postgres/       DB initialization scripts
│   └── terraform/      AWS infrastructure as code
├── docker-compose.yml  Development environment
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
├── ai/              AI-powered assistant (Bedrock/Ollama)
├── billing/         Stripe subscriptions
└── auth/            JWT guards, permissions (auth currently stubbed)
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose

### 1. Clone and install

```bash
git clone https://github.com/automatq/maintek.git
cd maintek
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

`.env.example` has working defaults for the single shared workspace
(default tenant + admin user are seeded automatically by migrations).

### 3. Start services

```bash
make up
```

This starts PostgreSQL, Redis, MinIO, the API, web app, and supporting services.

### 4. Run migrations

```bash
make migrate
```

### 5. Open the app

- **Web dashboard:** http://localhost:3000
- **API:** http://localhost:4000/api/v1
- **API docs (Swagger):** http://localhost:4000/api/docs

---

## Development

```bash
# Start everything
make up

# Or run individual services
npm run dev:api          # API on :4000
npm run dev:web          # Web on :3000
npm run dev:mobile       # Expo dev server

# Database
make migrate             # Run migrations
make seed                # Seed sample data
make reset               # Full reset (drops volumes)

# Code quality
npm run lint
npm run typecheck
```

---

## Deployment

### Railway (current setup)

The API and web app deploy as separate Railway services. See `docs/railway-minio.md` for storage configuration.

### Docker (self-hosted)

```bash
docker compose -f docker-compose.prod.yml up -d
```

### AWS (Terraform)

```bash
cd infrastructure/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
terraform init
terraform apply
```

Provisions ECS, RDS, ElastiCache, S3, SES, ALB with SSL, and CloudWatch.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Random 64-char string for JWT signing |
| `POSTGRES_USER` | Yes | Database username |
| `POSTGRES_PASSWORD` | Yes | Database password |
| `POSTGRES_DB` | Yes | Database name |
| `REDIS_URL` | Yes | Redis connection string |
| `PUBLIC_URL` | Yes | Public-facing URL of the app |
| `DEFAULT_TENANT_ID` | No | UUID of the seeded shared tenant |
| `DEFAULT_USER_ID` | No | UUID of the seeded admin user |
| `DEFAULT_USER_EMAIL` | No | Email shown on the seeded admin user |
| `MINIO_ENDPOINT` | No | MinIO/S3 endpoint for file storage |
| `MINIO_BUCKET` | No | Storage bucket name |
| `STRIPE_SECRET_KEY` | No | Stripe billing integration |
| `AI_PROVIDER` | No | `bedrock` or `ollama` |
| `SMTP_HOST` | No | Email server for notifications |

Full examples in `.env.example` and `.env.production.example`.

---

## Architecture

**Multi-tenant schema, single shared workspace** — Every record is still scoped to a `tenant_id` and the data model supports multiple tenants, but the app currently runs in single shared workspace mode: a default tenant and admin user are seeded by migration and used for all requests.

**Auth flow** — Auth is currently stubbed: `JwtAuthGuard` returns a hardcoded `RequestUser` from `DEFAULT_TENANT_ID` / `DEFAULT_USER_ID` env vars instead of verifying tokens. The guard, permissions, and Socket.io auth path are kept in place so a real provider can be wired back in later.

**Background jobs** — Six BullMQ processors run in a separate worker process: PM scheduling, warranty checks, report exports, budget alerts, webhook delivery, and data imports.

**Real-time** — Socket.io with Redis adapter for horizontal scaling. WebSocket connections currently inherit the same stubbed user as the REST API.

---

## License

Private. All rights reserved.
