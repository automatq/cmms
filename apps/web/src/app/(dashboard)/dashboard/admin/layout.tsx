'use client'

import { notFound } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  // 404 (not 403) — don't advertise the URL's existence to non-superadmins.
  if (user?.systemRole !== 'superadmin') {
    notFound()
  }

  return <>{children}</>
}
