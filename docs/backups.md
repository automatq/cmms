# Backup & Restore Runbook

Coverage: PostgreSQL (Railway and self-hosted), MinIO object storage, Redis.

> **Set this up BEFORE the first paying customer onboards.** Without
> backups, a single bad migration or accidental DROP can lose every
> work order, asset record, and uploaded file in the system.

## Cadence (recommended baseline)

| Data store | Snapshot frequency | Off-site copy | Retention | RTO | RPO |
|---|---|---|---|---|---|
| Postgres (workspace data) | hourly WAL + nightly snapshot | nightly to S3/B2 | 30 days nightly, 7 days hourly | 1 h | 1 h |
| MinIO (uploaded files) | nightly mirror | nightly to S3/B2 | 30 days | 4 h | 24 h |
| Redis (cache + queues) | nightly RDB snapshot | nightly to S3/B2 | 7 days | 1 h | 24 h (acceptable: ephemeral data) |

RTO = recovery time objective. RPO = recovery point objective (max acceptable data loss).

---

## PostgreSQL

### Railway-managed Postgres

Railway runs daily snapshots automatically and retains them for 7 days on
the Hobby/Pro plans (longer on higher tiers). Snapshots are restored by
attaching a snapshot to a new database via the Railway dashboard.

This is **not enough** for production. Add an off-site logical backup so
you have a copy outside Railway's control plane and can restore to
arbitrary infrastructure.

#### Nightly logical backup to S3

Run as a Railway cron service or GitHub Actions scheduled workflow:

```bash
TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  | gzip \
  | aws s3 cp - "s3://maintek-backups/postgres/${TIMESTAMP}.dump.gz" \
      --storage-class STANDARD_IA \
      --sse AES256
```

Verify with `aws s3 ls s3://maintek-backups/postgres/ --recursive | tail`.

#### Restore

```bash
aws s3 cp s3://maintek-backups/postgres/20260509T000000Z.dump.gz - \
  | gunzip \
  | pg_restore \
      --dbname="$RECOVERY_DATABASE_URL" \
      --no-owner \
      --no-privileges \
      --clean --if-exists
```

Restore into a *new* database first, run smoke tests against it, then
swap the application's `DATABASE_URL`. Never restore directly over a
running production database.

### Self-hosted Postgres (Docker compose / VM)

Use `pgBackRest` or `wal-g` for continuous archiving (point-in-time
recovery). Ad-hoc nightly dumps as above are a viable starting point.

---

## MinIO

MinIO has no built-in snapshot mechanism. Use `mc mirror` to replicate
to a different bucket on a different provider nightly.

### Setup

```bash
# Configure mc with both endpoints
mc alias set src   https://minio.your-domain.com  $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD
mc alias set dst   https://s3.us-east-1.amazonaws.com $AWS_KEY $AWS_SECRET

# One-time: ensure destination bucket exists with versioning enabled
mc mb dst/maintek-backup-files
mc version enable dst/maintek-backup-files
```

### Nightly mirror

```bash
mc mirror \
  --overwrite \
  --remove \
  --preserve \
  src/maintek-files dst/maintek-backup-files
```

`--remove` keeps the destination in sync (deletions propagate). With
versioning enabled on the destination, deleted objects are still
recoverable for the lifecycle policy duration.

### Restore

```bash
# Reverse the mirror to bring files back
mc mirror dst/maintek-backup-files src/maintek-files
```

### Lifecycle (recommended)

On `dst`, set a lifecycle rule to expire noncurrent versions after 30
days to control cost.

---

## Redis

Redis stores: BullMQ job queues, Better Auth sessions (if backed by
Redis — currently Postgres), Socket.io adapter state, application
cache. Loss of Redis means jobs in flight are dropped and active
sessions log out — annoying but not catastrophic if you accept that.

If full restore is required, enable RDB snapshots:

```
# redis.conf
save 3600 1     # snapshot every hour if at least 1 key changed
save 300 100    # snapshot every 5 min if 100+ keys changed
dbfilename maintek.rdb
dir /var/lib/redis
```

Copy `maintek.rdb` off-box nightly:

```bash
TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
aws s3 cp /var/lib/redis/maintek.rdb \
  "s3://maintek-backups/redis/${TIMESTAMP}.rdb" --sse AES256
```

Restore by stopping Redis, replacing `dbfilename`, restarting.

---

## Verification (the part everyone skips)

A backup you have not restored is not a backup. Schedule a quarterly
restore drill:

1. Restore the previous night's Postgres backup into a scratch database.
2. Restore the MinIO mirror into a scratch bucket.
3. Boot the API pointing at both, log in as a test user, open one work
   order with attachments. Verify the attachment renders.
4. Note the wall-clock time taken; this is your real RTO.
5. Tear the scratch resources down.

Document the restore drill date in this file.

| Date | Operator | Outcome | Notes |
|---|---|---|---|
| _(none yet)_ | | | |

---

## Encryption-at-rest of backups

S3 server-side encryption (`--sse AES256`) is the minimum. For higher
sensitivity environments, layer client-side encryption with `age` or
`gpg` before upload, and store the recovery key in a separate
password manager / KMS so a compromise of the AWS account does not
yield plaintext data.

## Access control

- Backups bucket policy: deny `s3:DeleteObject` to all users except a
  break-glass account, even admins. Enable bucket versioning + MFA-Delete.
- Database superuser credentials used for `pg_dump` should be
  read-only where possible.
- Rotate the dump-job IAM access key annually.
