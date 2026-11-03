# @maintek/web

Next.js 15 (App Router) front end for MainTek: the authenticated dashboard, the public
marketing site, the public work-request portal, and the QR scan landing pages.

## Run it

```bash
npm run dev          # http://localhost:3000
npm run build && npm run start
npm run typecheck
npm run lint
```

The only required setting is `NEXT_PUBLIC_API_URL` (defaults to
`http://localhost:4000/api/v1`). The Better Auth client derives `/api/auth` from it, and
`next.config.js` derives the Content Security Policy `connect-src` from its origin.
Optional: `NEXT_PUBLIC_FILES_URL` (object storage origin for images),
`NEXT_PUBLIC_SENTRY_DSN`.

## Routes

```
/                                   marketing home, /features, /about, /contact, /pricing, /privacy, /terms
/sign-in, /sign-up                  Better Auth email + optional social providers
/onboarding/create-org              first organization after sign-up
/invitations/[id]/accept            accept a team invitation
/request/[tenantSlug]               public work-request portal (no account needed)
/scan/asset/[token]                 QR code landing page for technicians
/dashboard                          KPIs, sparklines, calendar, activity
/dashboard/work-orders[/new|/[id]]  list, table, kanban board, detail with status control, comments, time log
/dashboard/work-requests            triage incoming public requests
/dashboard/assets[/new|/[id]|/edit] asset explorer and detail
/dashboard/pm[/new|/[id]|/templates] PM plans and template library
/dashboard/calendar                 schedule with drag-to-reschedule
/dashboard/inventory/*              parts, storerooms, transactions, suppliers, purchase orders, contracts
/dashboard/reports/*                nine report areas with period compare and export
/dashboard/imports                  CSV import wizard
/dashboard/ai                       AI assistant chat
/dashboard/settings/*               members, teams, webhooks, scheduled reports
/dashboard/admin/tenants            superadmin console (hidden unless role = superadmin)
/dashboard/search                   global search (also ⌘K palette)
```

## Code layout

```
src/
├── app/                 routes; (dashboard) and (public) are layout groups
├── components/          shadcn/ui primitives plus feature components
├── lib/
│   ├── api.ts           typed fetch client for /api/v1 (cookies included)
│   ├── auth-client.ts   Better Auth React client
│   ├── status.ts        status tokens and colors shared by board, list, calendar
│   └── nav.ts           sidebar and command-palette registry
├── hooks/               React Query hooks per module
├── providers/           theme, query-client and auth providers
└── middleware.ts        pass-through today; auth redirects happen client-side in the dashboard layout
e2e/                     Playwright suites (see e2e/README.md)
```

The dashboard supports light and dark themes and several color themes; the HSL token sets
live in `packages/shared/themes.ts` so web and mobile stay in sync.

## End-to-end tests

```bash
npx playwright install chromium        # first time
E2E_BASE_URL=http://localhost:3000 E2E_API_BASE_URL=http://localhost:4000 npm run e2e
npm run e2e:ui                         # interactive debugging
```

Suites create a fresh account per scenario. CI runs the `marketing` suite on every push;
the full suite is meant to run against a local or staging stack.
