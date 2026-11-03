# Webhooks and Imports

## Outbound webhooks

Configure subscriptions at `/dashboard/settings/webhooks` (or `POST /api/v1/webhooks`)
with a target URL, a secret and a list of events.

| Event | When |
|---|---|
| `wo.created` | a work order is created (any source) |
| `wo.status_changed` | status transition, including hold and resume |
| `wo.completed` | completed |
| `wo.cancelled` | cancelled |
| `pm.triggered` | the scheduler generated a work order from a PM plan |
| `request.submitted` | a public work request arrived |

Deliveries are JSON POSTs with an `X-Webhook-Signature: sha256=<hmac>` header computed
over the raw body with your secret. The `webhook-delivery` queue retries three times with
exponential backoff and records every attempt (status, response, duration) on the
subscription's delivery log (`GET /webhooks/:id/logs`). A test button sends a sample
event, and any failed delivery can be re-sent from the log.

## CSV import

`/dashboard/imports` walks through uploading a CSV or spreadsheet, mapping its columns to
fields, validating, and running the import as a background job. Supported entities:
`assets`, `locations`, `parts`, `work_orders`. The job page shows progress and a
downloadable list of row-level errors (`GET /imports/:id/errors`). Fix the flagged rows
and re-upload only those to avoid creating duplicates.

CSV **export** is available on assets, locations and parts (`/assets/csv`,
`/locations/csv`, `/parts/csv`) and on every report.
