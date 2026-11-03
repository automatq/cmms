# Background Jobs

MainTek uses BullMQ queues on Redis. Processors are registered in `AppModule`, so the API
process executes them too; production additionally runs `node dist/worker-main` as a
separate Railway service (`cmms-worker`) so long jobs never compete with request handling.

| Queue | Trigger | Processor | Effect |
|---|---|---|---|
| `pm-scheduler` | repeat every hour | `modules/pm/pm-scheduler.processor.ts` | finds PM plans whose next due date or meter threshold has been reached, creates work orders, advances the plan, writes `pm_history`, respects blackout periods, notifies assignees |
| `warranty-checker` | daily 06:00 | `modules/assets` | notifications for warranties expiring within the alert window |
| `reorder-checker` | daily 06:00 | `modules/inventory` | notifications for parts at or below reorder point |
| `budget-checker` | daily 07:00 | `modules/reports` | budget vs actual threshold alerts |
| `report-export` | on demand and scheduled reports | `modules/reports` | renders CSV or PDF, stores in object storage, emails a link |
| `webhook-delivery` | on domain events | `modules/webhooks/webhook-delivery.processor.ts` | signed POST, 3 attempts with exponential backoff, logs every attempt |
| `data-imports` | when a CSV job is created | `modules/imports/imports.processor.ts` | parses, validates, maps columns, inserts rows, records per-row errors |

## Operating notes

- Repeatable jobs are registered when the module initialises. Restarting the worker does
  not duplicate them; BullMQ dedupes by job key.
- The worker exposes `GET /api/v1/health` returning `503` until Nest has finished
  bootstrapping, then `200 {"status":"ok","role":"worker"}`. Railway uses it as the
  liveness check.
- Failed jobs stay in Redis with their stack trace. Inspect with any BullMQ UI pointed at
  the same Redis, or `redis-cli KEYS 'bull:*'`.
- Jobs are tenant-aware: each payload carries `tenantId` and processors scope queries by
  it. Scheduled checks iterate over all tenants.
- To run only the worker locally: `npm run start:worker --workspace=@maintek/api` after a
  `npm run build --workspace=@maintek/api`.
