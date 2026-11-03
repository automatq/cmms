/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'

// API origin (scheme + host) so connect-src matches whatever scheme the API is
// actually served on: https in production, plain http for local dev on :4000.
const apiOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').origin
  } catch {
    return 'http://localhost:4000'
  }
})()
const apiHost = apiOrigin.replace(/^https?:\/\//, '')
const apiWsOrigin = apiOrigin.replace(/^http/, 'ws')

// Origin of the file/object store that serves (presigned) asset & attachment
// images, so it can be allowlisted in img-src / next image remotePatterns.
// Configurable per deployment; defaults cover S3/CloudFront, local MinIO, and
// the Railway-hosted MinIO used in production (*.up.railway.app).
const filesOrigin = (() => {
  try {
    return process.env.NEXT_PUBLIC_FILES_URL ? new URL(process.env.NEXT_PUBLIC_FILES_URL).origin : ''
  } catch {
    return ''
  }
})()

const imgSrc = [
  "'self'",
  'data:',
  'blob:',
  'https://*.amazonaws.com',
  'https://*.cloudfront.net',
  'https://*.up.railway.app',
  'http://localhost:9000',
  'http://minio:9000',
  filesOrigin,
]
  .filter(Boolean)
  .join(' ')

const cspDirectives = [
  "default-src 'self'",
  // Next.js needs unsafe-inline for the runtime; unsafe-eval only outside prod for fast refresh.
  isProd
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  `img-src ${imgSrc}`,
  `connect-src 'self' ${apiOrigin} ${apiWsOrigin} https://${apiHost} wss://${apiHost} https://api.maintek.app wss://api.maintek.app https://*.sentry.io`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Lint runs as a dedicated CI job (`web - lint`); we don't need `next build`
  // to re-run it and turn lint findings into build failures.
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    instrumentationHook: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.cloudfront.net' },
      { protocol: 'https', hostname: '**.up.railway.app' },
      { protocol: 'http', hostname: 'localhost', port: '9000' },
      { protocol: 'http', hostname: 'minio', port: '9000' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '0' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: cspDirectives },
          ...(isProd
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
            : []),
        ],
      },
    ]
  },
}

module.exports = nextConfig
