# API Reference

The authoritative, always-current reference is the Swagger UI served by the API itself at
`/api/docs` (http://localhost:4000/api/docs locally, https://api.maintek.app/api/docs in
production). This page is the map.

## Conventions

- Base path `/api/v1`. Auth endpoints live at `/api/auth` (Better Auth).
- JSON in and out. `multipart/form-data` for uploads.
- Authentication: the web app sends the Better Auth session cookie; mobile and scripts
  send `Authorization: Bearer <token>` obtained from `/api/auth/sign-in/email`.
- Every request is scoped to the caller's active organization. There is no tenant id in
  the URL.
- Validation errors return `400` with a `message` array from class-validator.
  Permission failures return `403`. Unknown ids return `404`.
- List endpoints accept `page`, `limit` (max 100), `search`, `sortBy`, `sortOrder` and
  module-specific filters, and return `{ data, total, page, limit }`.

## Authentication (`/api/auth`)

| Endpoint | Purpose |
|---|---|
| `POST sign-up/email`, `POST sign-in/email`, `POST sign-out` | email + password |
| `GET get-session` | current user and active organization |
| `POST organization/create`, `set-active`, `invite-member`, `accept-invitation`, ... | Better Auth organization plugin |
| `GET/POST admin/*` | platform superadmin operations |
| `GET sign-in/social?provider=google|github|apple` | when configured |

Full list: https://www.better-auth.com/docs

## Resources (`/api/v1`)

| Prefix | Module | Highlights |
|---|---|---|
| `health` | - | database + redis status |
| `assets`, `assets/csv` | assets | CRUD, `/:id/qr`, meters, downtime, documents, condition logs, tags, CSV export |
| `asset-categories`, `locations`, `locations/csv` | assets | hierarchies |
| `work-orders` | work-orders | CRUD, `/:id/status`, checklist results, labor, parts, attachments, comments, assignee, time log |
| `tenants/:slug/work-requests` | work-orders | public request submission (no auth) |
| `activity` | activity | `quick-start/:assetId`, `quick-start-by-qr`, `active`, `my-active`, complete/abandon |
| `pm`, `checklist-templates`, `blackouts` | pm, blackouts | plans, templates, trigger now, blackout windows |
| `parts`, `parts/csv`, `storerooms`, `inventory`, `suppliers`, `purchase-orders`, `service-contracts` | inventory | stock, transactions, reorder, receiving |
| `reports`, `budgets` | reports | dashboard KPIs, nine report areas, CSV/PDF export, scheduled reports |
| `notifications` | notifications | list, read, read-all, `push-token` |
| `webhooks` | webhooks | subscriptions, `/:id/logs`, `/:id/test`, `logs/:logId/redeliver` |
| `imports` | imports | create job from CSV, status, `/:id/errors` |
| `files` | files | upload, presigned download |
| `ai` | ai | `health`, `query`, `chat`, `summarize-wo`, `predict-failure`, `maintenance-recommendation`, `troubleshoot` |
| `users`, `roles`, `teams`, `organization`, `tenants/me` | users | members, roles and permissions, teams, current org |
| `tenants` | users | superadmin only: list, plan, suspend, impersonate |
| `public` | - | unauthenticated helpers for the portal and QR pages |

## Permissions

Routes declare `@Permissions('<module>:read' | '<module>:write')`. Modules: `assets`,
`work_orders`, `work_requests`, `pm`, `inventory`, `reports`, `users`, `settings`, `ai`.
Owners and admins hold every permission; other members get a seeded role preset
(manager, planner, technician, inventory manager, requestor, viewer). See
[Teams and Permissions](Teams-and-Permissions).

## WebSocket

Socket.io on the same origin as the API. Connect with the session cookie or
`auth: { token }`. The server joins you to your tenant room and emits events such as
`work-order.updated`, `notification.created`, and `activity.started`. Use it to refresh
lists rather than as a source of truth.

## Example

```bash
# sign in and keep the cookie jar
curl -c jar -X POST http://localhost:4000/api/auth/sign-in/email \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:3000' \
  -d '{"email":"you@example.com","password":"..."}'

# list open work orders
curl -b jar 'http://localhost:4000/api/v1/work-orders?status=open&limit=20'
```
