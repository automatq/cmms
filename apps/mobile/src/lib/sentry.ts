/**
 * Sentry stub for the mobile app.
 *
 * Not installed yet because @sentry/react-native pulls in native modules
 * that don't run in Expo Go. To enable for production:
 *
 *   1. From apps/mobile: `npx expo install @sentry/react-native`
 *   2. Add the Sentry plugin to app.json:
 *      "plugins": [["@sentry/react-native/expo", { ... }]]
 *   3. Replace the stub below with the real init:
 *
 *      import * as Sentry from '@sentry/react-native';
 *      Sentry.init({
 *        dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
 *        environment: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT || 'production',
 *        tracesSampleRate: 0.1,
 *      });
 *      export { Sentry };
 *
 *   4. Wrap your root component with `Sentry.wrap(...)` (in app/_layout.tsx).
 *   5. Configure source map uploads in eas.json post-build hook.
 *
 * Install requires a custom Expo dev client or EAS build — Expo Go cannot
 * load the native module.
 */

export const Sentry = {
  init: (_opts: unknown) => {},
  captureException: (_e: unknown) => {},
  captureMessage: (_m: string) => {},
  wrap: <T>(component: T): T => component,
};

export function initSentry(): void {
  // no-op until @sentry/react-native is installed
}
