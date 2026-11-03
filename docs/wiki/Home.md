# MainTek Wiki

MainTek is a multi-tenant maintenance management system (CMMS): assets, work orders,
preventive maintenance, inventory and purchasing, reporting, and an AI assistant, delivered
as a web dashboard and a mobile app on one NestJS API.

- Source: https://github.com/automatq/cmms
- Production: https://maintek.app
- API reference: Swagger at `/api/docs` on any running API

## Start here

| If you want to... | Read |
|---|---|
| Run the app on your machine | [Getting Started](Getting-Started) |
| Understand how the pieces fit | [Architecture](Architecture) |
| Know every environment variable | [Configuration](Configuration) |
| Call the API | [API Reference](API-Reference) |
| Ship to production | [Deployment](Deployment) |
| Fix something that is not working | [Troubleshooting](Troubleshooting) |
| Contribute code | [CONTRIBUTING.md](https://github.com/automatq/cmms/blob/main/CONTRIBUTING.md) |

## Feature guides

- [Work Orders](Work-Orders) - lifecycle, board, comments, time log, assignment
- [Assets](Assets) - hierarchy, QR codes, meters, downtime, warranties
- [Preventive Maintenance](Preventive-Maintenance) - plans, triggers, scheduler, blackouts
- [Inventory and Procurement](Inventory-and-Procurement) - parts, stock, suppliers, purchase orders
- [Reports](Reports) - dashboard KPIs, nine report areas, exports, scheduled delivery
- [Calendar](Calendar) - schedule view and status colors
- [Teams and Permissions](Teams-and-Permissions) - organizations, roles, invitations, superadmin
- [Public Request Portal](Public-Request-Portal) - requests from people without accounts
- [Files and Attachments](Files-and-Attachments) - uploads, storage, limits
- [AI Assistant](AI-Assistant) - providers and capabilities
- [Webhooks and Imports](Webhooks-and-Imports) - outbound events and CSV import
- [Mobile App](Mobile-App) - scanning, offline mode, push

## Operations

- [Background Jobs](Background-Jobs) - the worker process and its seven queues
- [Backups and Staging](Backups-and-Staging) - runbooks kept in the repo

This wiki is generated from `docs/wiki/` in the main repository. Edit there and publish
with `scripts/publish-wiki.sh`.
