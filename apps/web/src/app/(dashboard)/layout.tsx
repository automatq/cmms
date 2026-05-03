'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Progress } from '@/components/ui/progress'
import { TrialBanner } from '@/components/trial-banner'
import { useAuth } from '@/providers/auth-provider'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, isLoading, activeOrgId } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.replace(`/sign-in?returnTo=${encodeURIComponent(pathname || '/dashboard')}`)
      return
    }
    if (!activeOrgId) {
      router.replace('/onboarding/create-org')
    }
  }, [isAuthenticated, isLoading, activeOrgId, pathname, router])

  if (isLoading || !isAuthenticated || !activeOrgId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-1/3 sm:w-1/4 max-w-sm space-y-2">
          <Progress />
          <p className="text-sm text-muted-foreground text-center">Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="p-6 space-y-6">
          <TrialBanner />
          {children}
        </main>
      </div>
    </div>
  )
}
