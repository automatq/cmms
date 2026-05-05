# e2e tests (Playwright)

End-to-end tests for the web app. Spin up a fresh test account per scenario,
exercise real user journeys, and assert on the resulting UI/URL.

## Run

```bash
cd apps/web
npm run e2e              # headless against E2E_BASE_URL (defaults to prod)
npm run e2e:headed       # see the browser
npm run e2e:ui           # Playwright's UI mode (best for debugging)
npm run e2e -- auth      # only auth.spec.ts
```

First run on a fresh machine: `npx playwright install chromium` to download
the browser binary.

## Target environment

Tests hit whatever URL is in `E2E_BASE_URL` (defaults to
`https://maintek-web-production.up.railway.app`). The corresponding API URL
is auto-derived (`maintek-web` → `maintek-api-production`); override with
`E2E_API_BASE_URL` if you point the suite at a different stack.

```bash
# Run against a local docker-compose stack
E2E_BASE_URL=http://localhost:3000 \
E2E_API_BASE_URL=http://localhost:4000 \
  npm run e2e
```

## Test data

Every test creates a brand-new account (unique email per run, prefix
`pwtest+...@chrisdbender.com`). **Test accounts are not cleaned up** —
they accumulate in the production DB. Periodically prune with:

```sql
DELETE FROM users WHERE email LIKE 'pwtest+%@chrisdbender.com';
-- (sessions, members, organizations cascade)
```

Override the email domain with `E2E_EMAIL_DOMAIN` if you want a domain
that bounces silently.

## What's covered

| File | Journeys |
|---|---|
| `marketing.spec.ts` | landing / pricing / about / contact / features render |
| `auth.spec.ts` | signup → org → dashboard, returning-user lands on dashboard, bad password, duplicate email |
| `dashboard.spec.ts` | sidebar nav, trial banner, work-orders/assets pages render |
| `members.spec.ts` | invite a member, pending invitation appears |

## What's NOT covered yet

- **Accept invitation flow** — needs to fetch the invitation ID from the API or DB
- **Polar billing/checkout** — would create real subscriptions; needs sandbox setup
- **Email-driven flows** (verification, password reset) — needs a fake mailbox or Resend webhook listener
- **Mobile (Expo)** — different tooling; Detox or Maestro
- **Multi-user permission scenarios** (e.g. invited `member` can't see Billing tab) — needs two browser contexts and the invitation flow above

Add specs as new flows ship. Reuse helpers in `e2e/helpers/`.
