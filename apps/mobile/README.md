# @maintek/mobile

Expo 50 / React Native 0.73 app for technicians in the field. Uses Expo Router for
navigation and the same Better Auth backend and REST API as the web app.

## Run it

```bash
npm run start          # Expo dev server; press i / a for iOS / Android simulator
npm run ios
npm run android
npm run typecheck
npm run lint
```

Point the app at an API with `EXPO_PUBLIC_API_URL` (defaults to the local API on
port 4000). Set `EXPO_PUBLIC_SENTRY_DSN` to enable crash reporting. Builds and store
submissions are configured in `eas.json` (bundle id `com.maintek.app`).

## Screens

```
app/
├── index.tsx                 entry: redirects to sign-in or the tab bar
├── sign-in.tsx               email / password sign-in
├── (tabs)/
│   ├── index.tsx             home: assigned work, due PMs, quick actions
│   ├── work-orders.tsx       my work orders
│   ├── assets.tsx            asset lookup
│   ├── notifications.tsx     in-app notifications
│   └── profile.tsx           account and sync status
├── work-orders/[id].tsx      detail: status changes, checklists, photos, labor
├── assets/[id].tsx           asset detail with history and meters
├── scanner.tsx               QR scanner (expo-camera) -> asset or work order
├── active-work.tsx           running technician session started from a scan
└── sync.tsx                  offline queue inspector
```

## Offline and sync

`src/lib/offline-queue.ts` stores mutations while the device is offline and replays them
when `network-provider.tsx` sees connectivity again. `offline-banner.tsx` and
`sync-status.tsx` surface the state. Reads are cached through React Query
(`query-client.ts`).

## Push notifications

`expo-notifications` registers a device token with `POST /api/v1/notifications/push-token`;
the API sends to it when work orders are assigned, commented on, or mentioned.
