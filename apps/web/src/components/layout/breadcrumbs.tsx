'use client'

import { Fragment } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { labelForSegment } from '@/lib/nav'

// Treat UUIDs / long ids / numeric ids as a generic "Details" crumb rather than
// dumping a raw identifier into the breadcrumb.
function isIdSegment(seg: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(seg) || /^\d+$/.test(seg) || seg.length > 24
}

export function Breadcrumbs() {
  const pathname = usePathname() || ''
  const segments = pathname.split('/').filter(Boolean)

  // Nothing useful to show on the dashboard root (or non-dashboard routes).
  if (segments[0] !== 'dashboard' || segments.length < 2) return null

  const crumbs = segments.map((seg, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/')
    const label = isIdSegment(seg) ? 'Details' : labelForSegment(seg)
    return { href, label, isLast: i === segments.length - 1 }
  })

  return (
    <Breadcrumb className="-mb-2">
      <BreadcrumbList>
        {crumbs.map((c, i) => (
          <Fragment key={c.href}>
            {i > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {c.isLast ? (
                <BreadcrumbPage>{c.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={c.href}>{c.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
