# Assets

Anything you maintain is an asset: a machine, a vehicle, a building system, a tool. Assets
sit in a **location** tree (site > building > floor > room) and belong to a **category**
tree, and can be nested under a parent asset.

## Fields

Name, asset number (`AST-<year>-<seq>`, editable), description, status
(`active`, `inactive`, `under repair`, `retired`), criticality flag, tags, manufacturer,
model, serial number, purchase date and cost, warranty expiry and alert window, category,
location, parent, primary image, and ISO 55000 fields (condition, risk, life expectancy,
replacement cost, depreciation).

## What you can do

- **QR codes.** Each asset has a QR code (`GET /assets/:id/qr`) that links to
  `/scan/asset/<token>`. Scanning it on the web or in the mobile app opens the asset and
  offers to start a work session or create a work order.
- **Meters.** Record readings (hours, cycles, kilometres, anything numeric). Meter-based
  PM plans trigger when readings cross a threshold.
- **Downtime.** Log downtime intervals with a reason and failure code; the downtime
  report aggregates them by asset and cause.
- **Condition logs.** Periodic condition assessments feeding the condition trigger for PM.
- **Documents and images.** Manuals, drawings, photos. See [Files and Attachments](Files-and-Attachments).
- **Warranties.** A daily job notifies before expiry; the warranties report lists what is
  covered.
- **Parts.** Link spare parts to an asset so technicians see what to stock.
- **History.** Work orders, PM history and activity sessions on the detail page.
- **Bulk operations.** CSV import and export for assets and locations
  ([Webhooks and Imports](Webhooks-and-Imports)); an asset status filter and tag filter on
  the explorer.

## Editing

`/dashboard/assets/[id]/edit` loads the same form as creation, pre-populated. Changes save
on submit only. Images can be replaced or removed. Editing requires `assets:write`.
