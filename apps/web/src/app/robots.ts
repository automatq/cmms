import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/api', '/onboarding', '/sign-in', '/sign-up'],
      },
    ],
    sitemap: 'https://maintek.app/sitemap.xml',
    host: 'https://maintek.app',
  }
}
