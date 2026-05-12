# Staging Environment

Why: every change today goes straight to production once CI passes.
That is fast but high-risk. A staging environment lets you verify the
full app — including paid Polar.sh checkout, MinIO uploads, and email
delivery — before customers see it.

## Architecture

A second Railway project (`cmms-staging`) that mirrors production:

```
cmms-staging
├── api (cmms-api-staging)        ← from main branch, manual deploy
├── worker (cmms-worker-staging)
├── web (cmms-web-staging)
├── postgres (separate volume, daily snapshots)
├── redis
├── minio (separate volume)
└── caddy (api-staging.maintek.app, app-staging.maintek.app)
```

Domain: use `*-staging.maintek.app` (or a separate domain) so robots
won't crawl it; add a robots.txt deny-all on the staging web service.

## Setup

### 1. Create the Railway project

```bash
# Authenticate once
railway login

# Create the staging project
railway init --name cmms-staging
```

In the Railway dashboard, add: PostgreSQL, Redis, and a MinIO service
(see `docs/railway-minio.md`).

### 2. Add three application services

For each (api, worker, web), create a service from this GitHub repo
with the same Dockerfile path used in production:

| Service | Dockerfile | Health path |
|---|---|---|
| cmms-api-staging | apps/api/Dockerfile | /api/v1/health |
| cmms-worker-staging | apps/api/Dockerfile.worker | (none — long-running) |
| cmms-web-staging | apps/web/Dockerfile | / |

### 3. Environment variables

Use a separate `.env.staging` derived from `.env.production.example`,
with these differences:

| Var | Production | Staging |
|---|---|---|
| `NODE_ENV` | production | production |
| `BETTER_AUTH_URL` | https://api.maintek.app | https://api-staging.maintek.app |
| `PUBLIC_WEB_URL` | https://maintek.app | https://app-staging.maintek.app |
| `CORS_ORIGINS` | https://maintek.app | https://app-staging.maintek.app |
| `POLAR_ENV` | production | sandbox |
| `POLAR_ACCESS_TOKEN` | live token | sandbox token |
| `SENTRY_ENVIRONMENT` | production | staging |
| `SMTP_HOST` | real provider | mailpit/mailtrap (no real sends) |

**Critical:** never point staging at the production database. Use a
separate DB instance with synthetic test data, or restore a
sanitized snapshot (PII scrubbed).

### 4. Manual approval gate in deploy workflow

Edit `.github/workflows/deploy-railway.yml` to deploy staging on every
push to `main` automatically, then require manual approval before
production. GitHub native: add `environment: production` to the prod
job and configure required reviewers in repo settings → Environments.

```yaml
deploy-staging:
  runs-on: ubuntu-latest
  needs: [typecheck]   # whatever your CI gates are
  environment: staging  # auto-deploys
  steps:
    - run: railway up --service cmms-api-staging --environment staging

deploy-production:
  runs-on: ubuntu-latest
  needs: [deploy-staging]
  environment: production  # requires manual approval per repo settings
  steps:
    - run: railway up --service cmms-api --environment production
```

### 5. Seed staging with realistic data

After first deploy:

```bash
railway run --service cmms-api-staging npm run seed --workspace=@maintek/api
```

If you maintain a "demo workspace" snapshot, restore it instead of
seeding fresh — it makes the staging env immediately usable for QA.

### 6. Robots / discovery

Add to `apps/web/src/app/robots.ts` or override at the staging service
with an env var so staging serves `Disallow: /` while production
serves the production robots file.

Example:

```ts
// app/robots.ts
export default function robots() {
  if (process.env.NEXT_PUBLIC_ENV !== 'production') {
    return { rules: { userAgent: '*', disallow: '/' } }
  }
  return { rules: { userAgent: '*', allow: '/' } }
}
```

Set `NEXT_PUBLIC_ENV=staging` on the staging web service.

## Smoke checklist before promoting to production

After every staging deploy, run through:

1. Sign up a fresh user → verify email arrives → confirm.
2. Create a workspace → confirm 14-day trial banner appears.
3. Open a paid checkout → complete with a Polar sandbox card → confirm
   org status flips to active.
4. Upload an image attachment to a work order → reload → confirm it
   renders (presigned URL through public MinIO endpoint works).
5. Reset password → click email link → confirm login.
6. Mobile: launch Expo build pointed at api-staging → sign in →
   capture a photo → sync.

If all six pass, promote.
