'use client'

import { useAuth } from '@/providers/auth-provider'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Progress } from '@/components/ui/progress'
import { useEffect } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, isLoading, login } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      login()
    }
  }, [isLoading, isAuthenticated, login])

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col border-r bg-card" />
        <div className="lg:pl-64">
          <div className="sticky top-0 z-20 bg-background border-b h-16" />
          <main className="p-6">
            <div className="flex items-center justify-center min-h-[50vh]">
              <div className="w-1/3 space-y-2">
                <Progress />
                <p className="text-sm text-muted-foreground text-center">Loading...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
