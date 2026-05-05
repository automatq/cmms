# Railway MinIO Setup

This app can store asset photos and documents in a MinIO service running in the same Railway project/environment.

## MinIO service

Create a separate Railway service for MinIO and attach a persistent volume.

Set these variables on the MinIO service:

```env
MINIO_ROOT_USER=maintek_minio
MINIO_ROOT_PASSWORD=change-me
MINIO_BUCKET=maintek-files
PORT=9000
```

The service must listen on port `9000`.

## API service

Set these variables on the API service:

```env
STORAGE_PROVIDER=minio
MINIO_ENDPOINT=${{MinIO.RAILWAY_PRIVATE_DOMAIN}}
MINIO_PORT=9000
MINIO_BUCKET=${{MinIO.MINIO_BUCKET}}
MINIO_USE_SSL=false
MINIO_ROOT_USER=${{MinIO.MINIO_ROOT_USER}}
MINIO_ROOT_PASSWORD=${{MinIO.MINIO_ROOT_PASSWORD}}
```

If you prefer, `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` also work instead of `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`.

## Web service

The browser must keep using the API's public URL:

```env
NEXT_PUBLIC_API_URL=https://your-api-service.up.railway.app/api/v1
```

Do not point `NEXT_PUBLIC_API_URL` at a Railway private domain. Browsers cannot reach `*.railway.internal`.

## Notes

- Railway private domains are only available service-to-service inside the same project/environment.
- The API is configured to listen on `::`, which matches Railway's current dual-stack/private-networking guidance.
- The files service accepts both `MINIO_ROOT_*` and `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY`.
