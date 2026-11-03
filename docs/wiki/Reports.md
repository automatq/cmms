# Reports

## Dashboard

`/dashboard` shows open and overdue work orders, PM due soon, mean time to repair, asset
downtime, and inventory alerts as KPI tiles with sparklines and deltas against the
previous period, plus a calendar and a live activity feed.

## Report areas

| Area | Route | Questions it answers |
|---|---|---|
| Work orders | `reports/work-orders` | volume, backlog, cycle time, by type/priority/status |
| Costs | `reports/costs` | labor and parts cost per work order, asset, location; per-technician breakdown |
| Downtime | `reports/downtime` | hours lost per asset and failure code |
| PM compliance | `reports/pm-compliance` | planned vs completed on time |
| Technician performance | `reports/technician-performance` | work completed, hours logged, first-time fix |
| Inventory | `reports/inventory` | valuation, usage, stock-outs |
| Warranties | `reports/warranties` | what is covered and what expires when |
| Assets | `reports/assets` | counts, condition, age, criticality |
| Budgets | `reports/budgets` | budget vs actual by period and category |

Every report has a date-range picker with presets, a period-compare toggle, filter chips,
and drill-down from a chart into the underlying records.

## Export and scheduling

Any report exports to CSV or a real PDF (rendered server-side by the `report-export`
queue). `/dashboard/settings/scheduled-reports` emails a chosen report on a daily, weekly
or monthly cadence to a list of recipients.

## Budgets

Define maintenance budgets per period and category. The daily `budget-checker` job raises
a notification when actual spend crosses the configured threshold.
