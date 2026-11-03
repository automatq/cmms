# Files and Attachments

Uploads are used for asset images and documents, work order attachments, checklist item
photos, public request photos, CSV import files and generated report exports.

## Rules

- Maximum size per file: 50 MB.
- Allowed types: JPEG, PNG, GIF, WebP, PDF, DOC, DOCX, XLS, XLSX, CSV, TXT. Anything
  else is rejected at the API with a 400.
- Files are stored under a tenant-prefixed key in the configured bucket. Metadata (name,
  MIME type, size, uploader, parent record) is stored in Postgres.
- Downloads use short-lived presigned URLs, so storage never has to be public.

## Storage backends

The API uses the AWS S3 SDK with path-style addressing, so any S3-compatible service
works:

| Environment | Backend |
|---|---|
| Local dev | RustFS from `docs/docker-compose.dev.yml` (MinIO-compatible) |
| Railway | MinIO service with a volume (`docs/railway-minio.md`) |
| AWS | S3 with `STORAGE_PROVIDER=s3` |

If the browser must reach storage on a different host than the API does (private
networking), set `MINIO_PUBLIC_ENDPOINT` on the API and `NEXT_PUBLIC_FILES_URL` on the web
app so presigned URLs resolve and pass the Content Security Policy.

## Clients

- Web: drag-and-drop with progress and image previews on asset and work-order pages.
- Mobile: camera and library pickers on work orders and checklists, queued while offline.
