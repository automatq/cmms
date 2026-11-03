# Calendar

`/dashboard/calendar` shows work orders, PM due dates, downtime and blackout periods on a
month, week or day grid. Click a day for a popover listing everything scheduled; drag an
item, or use the popover, to reschedule a work order or a PM due date. PM plans that are
due soon are visually prioritised.

## Status colours

The calendar colours items by status first and falls back to type when there is no status.
The same tokens are used by the work-order board and lists (`apps/web/src/lib/status.ts`).

| Colour | Status | Fallback type |
|---|---|---|
| Emerald | completed | preventive maintenance |
| Amber | requested, pending approval, scheduled but not started | |
| Blue | in progress | work orders |
| Slate | on hold | |
| Red | cancelled or overdue | downtime |

Colours are theme-aware and meet contrast requirements in light and dark mode.
