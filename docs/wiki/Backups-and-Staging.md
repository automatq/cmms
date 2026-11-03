# Backups and Staging

Two runbooks are maintained in the repository so they version with the code:

- **Backup and restore**: [`docs/backups.md`](https://github.com/automatq/cmms/blob/main/docs/backups.md).
  Covers Postgres (Railway snapshots plus `pg_dump` off-site copies), MinIO mirroring,
  Redis snapshots, recommended cadence, retention and tested restore steps. Recovery
  targets: one hour RTO / one hour RPO for Postgres, four hours / one day for files.
- **Staging environment**: [`docs/staging.md`](https://github.com/automatq/cmms/blob/main/docs/staging.md).
  A second Railway project (`cmms-staging`) mirroring production with its own database and
  bucket, deployed manually from `main`, behind `*-staging.maintek.app` with crawlers
  blocked. Use it to rehearse migrations and verify uploads and email before customers see
  a change.

Treat these as the source of truth; this page only points at them.
