# Troubleshooting

## Local development

**`npm run dev:api` exits with `relation "..." does not exist` during migrations.**
The database is not fresh or a migration was edited. Check `select name from migrations`
in Postgres. For a scratch database, `docker compose -f docs/docker-compose.dev.yml down -v`
and start again.

**API starts but `/api/v1/health` reports `redis: error`.**
Redis is not reachable on `REDIS_HOST:REDIS_PORT`. Confirm the container is up and no
password is set locally (`REDIS_PASSWORD` empty).

**Browser console says the Content Security Policy blocked `localhost:4000`.**
`NEXT_PUBLIC_API_URL` and the API's actual scheme disagree. The CSP `connect-src` is
derived from that variable's origin; restart `next dev` after changing it.

**Sign-up works but creating an organization returns 500.**
A migration is missing. Run `npm run migration:run --workspace=@maintek/api` and read the
API log; the error names the column.

**"Failed to fetch" on sign-in with no network error.**
CORS. The web origin must be in `CORS_ORIGINS` on the API (`http://localhost:3000` by
default), and the browser must send an `Origin` header the API trusts.

**Uploads fail with `AccessDenied` or `NoSuchBucket`.**
The API creates the bucket on boot; check the storage credentials in `.env` match the
compose file and that port 9000 is published. The object store container logs show auth
failures.

**`npx playwright test` cannot find a browser.**
`npx playwright install chromium` (the version must match the installed
`@playwright/test`).

**Port already in use.**
Another workspace or an old process holds 3000 or 4000: `lsof -nP -iTCP:4000 -sTCP:LISTEN`.

## Production

**API fails to boot with `Missing required environment variables`.**
`NODE_ENV=production` validation. Set the listed variables; see [Configuration](Configuration).

**Worker shows as unhealthy on Railway.**
It answers `503` until Nest has initialised, which can take a minute on cold start. If it
stays unhealthy, the log usually shows a Redis or database connection error.

**Emails are not delivered.**
Resend handles auth emails and scheduled reports and needs `RESEND_API_KEY` plus a
verified `EMAIL_FROM`. Notification emails use `EMAIL_PROVIDER` (SMTP or SES). Both log
a warning and skip when unconfigured instead of failing the request.

**Images do not load in the dashboard.**
Presigned URLs point at `MINIO_PUBLIC_ENDPOINT` (or the internal endpoint if unset). It
must be reachable from the browser and allowed by the web CSP through
`NEXT_PUBLIC_FILES_URL`.

**AI assistant says no provider is configured.**
Set `ANTHROPIC_API_KEY`, or `AI_PROVIDER=bedrock` with AWS credentials, or an Ollama URL.
`GET /api/v1/ai/health` tells you which provider is active.

**A tenant is locked out or needs support access.**
A superadmin can suspend, reactivate or impersonate from `/dashboard/admin/tenants`. Every
action lands in `audit_logs`.

## Getting more detail

- API logs are JSON in production; filter by `requestId`.
- Sentry captures unhandled errors in all three apps when a DSN is set.
- Swagger at `/api/docs` lets you replay a request with your session.
