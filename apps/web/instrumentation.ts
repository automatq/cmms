// Next.js loads this file once per server runtime to register
// instrumentation hooks. Sentry needs us to import the right config
// for the active runtime.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}
