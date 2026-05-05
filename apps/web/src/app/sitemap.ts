import type { MetadataRoute } from 'next'

const SITE = 'https://maintek.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return [
    { url: `${SITE}/`,         lastModified, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${SITE}/features`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE}/pricing`,  lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE}/about`,    lastModified, changeFrequency: 'yearly',  priority: 0.6 },
    { url: `${SITE}/contact`,  lastModified, changeFrequency: 'yearly',  priority: 0.6 },
  ]
}
