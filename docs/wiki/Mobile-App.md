# Mobile App

The Expo app (`apps/mobile`) is built for technicians: see your work, scan a code, do the
job, log it, even with no signal.

## Features

- **Sign-in** with the same account as the web app (email + password; social providers
  when configured).
- **Home** tab: assigned and due work, quick actions.
- **Work orders**: list and detail with status changes, checklists with photos, labor and
  parts, comments.
- **Assets**: lookup and detail with meters, history and documents.
- **Scanner**: scan an asset QR code to open it, start a timed work session, or create a
  work order on the spot.
- **Active work**: the running session with elapsed time and a one-tap finish.
- **Notifications**: in-app list plus push notifications for assignment, comments and
  mentions.
- **Offline**: reads are cached; writes go into a local queue and replay in order when the
  device reconnects. A banner shows offline state and the Sync screen lists pending items.

## Running it

```bash
npm run dev:mobile          # from the repo root, or `npm run start` in apps/mobile
```

Press `i` or `a` for a simulator, or scan the Expo QR with Expo Go. Set
`EXPO_PUBLIC_API_URL` to reach an API that is not on your machine (a phone cannot reach
`localhost`). Builds use EAS (`eas.json`); the bundle id is `com.maintek.app`.

See `apps/mobile/README.md` for the screen map and code layout.
