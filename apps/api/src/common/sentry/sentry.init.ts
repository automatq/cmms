import * as Sentry from '@sentry/node';

let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE || process.env.RAILWAY_GIT_COMMIT_SHA,
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
    ],
    beforeSend(event) {
      // Strip cookies / authorization headers from breadcrumbs to avoid
      // leaking session tokens and Better Auth cookies into Sentry.
      if (event.request?.headers) {
        delete (event.request.headers as any).cookie;
        delete (event.request.headers as any).authorization;
        delete (event.request.headers as any)['x-api-key'];
      }
      return event;
    },
  });

  initialized = true;
}

export { Sentry };
