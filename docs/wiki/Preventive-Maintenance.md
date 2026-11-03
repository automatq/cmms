# Preventive Maintenance

A **PM plan** describes recurring work on an asset and how often it should happen. The
scheduler turns due plans into work orders automatically.

## Triggers

| Trigger | Fires when |
|---|---|
| `time` | every N `day` / `week` / `month` / `year` from the last completion |
| `calendar` | on fixed calendar dates |
| `meter` | an asset meter reading crosses the plan's interval (e.g. every 250 hours) |
| `condition` | an asset condition log falls below a threshold |
| `event` | an external or manual event, via the API |

Plans carry a title, description, priority, estimated hours, assignee, checklist
template, lead time in days (create the work order before it is due), a rolling-schedule
switch (next due counts from completion rather than the original date), an
ignore-blackouts switch, and an active flag.

## Scheduler

The `pm-scheduler` queue runs hourly. For each active plan it checks whether the next due
date (or meter threshold) has been reached, skips dates inside a **blackout period**,
creates a `preventive` work order with the plan's checklist, records `pm_history`, and
notifies the assignee. You can also trigger a plan immediately from its page.

## Templates

`/dashboard/pm/templates` ships twelve starter templates (HVAC filter change, fire
extinguisher inspection, forklift service and so on) that you can clone into plans.
Checklist templates are shared with work orders.

## Blackouts

`/dashboard/settings` lets you define blackout periods (holiday shutdowns, audits). The
scheduler will not create PM work during them and the calendar shows them shaded.

## Compliance

The PM compliance report shows planned versus completed on time per asset and per plan.
Due-soon plans get visual priority on the dashboard and calendar.
