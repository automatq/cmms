# Inventory and Procurement

## Parts

A part has a SKU (unique per organization), name, category, unit, unit cost, preferred
supplier, reorder point and reorder quantity, and can be linked to the assets that use it.
Parts can be imported and exported as CSV.

## Storerooms and stock

Stock is tracked per part per **storeroom** (a storeroom is tied to a location). The
inventory page shows stock-level bars against min and max, and the daily
`reorder-checker` job notifies when quantity on hand drops to the reorder point.

## Transactions

Every movement is an inventory transaction: `receive`, `issue` (to a work order),
`adjust`, `transfer` between storerooms, `return`, and `reserve` / `release` for parts
held against planned work. Issuing parts from a work order creates the transaction
automatically and attaches the cost to the work order.

## Suppliers and purchase orders

Suppliers hold contact details and terms. A purchase order (`PO-<year>-<seq>`) lists line
items with part, quantity, unit price and destination storeroom; receiving a PO posts
receipts to stock. Statuses: `draft`, `sent`, `partial`, `received`, `cancelled`.

## Service contracts

Track maintenance contracts with vendors: coverage, assets covered, cost, start and end
dates, renewal reminders. Contracts appear on the asset page and in cost reports.

## Reports

Inventory valuation, usage by part and asset, stock-outs and reorder history live under
`/dashboard/reports/inventory`. See [Reports](Reports).
