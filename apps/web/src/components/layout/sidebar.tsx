'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Settings,
  LogOut,
  Menu,
  X,
  Wrench,
  Shield,
  QrCode,
  Command as CommandIcon,
} from 'lucide-react'
import { useState } from 'react'
import { QrScannerDialog } from '@/components/dashboard/qr-scanner-dialog'
import { openCommandPalette } from '@/components/command-palette'
import { primaryNav, settingsSubNav, reportSubNav } from '@/lib/nav'

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout, activeOrgId } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)

  // Reuses the cached ['organization'] query (dashboard/settings already prime it).
  // Disabled for superadmins with no active org so we don't fire a GET /organization 404.
  const { data: organization, isLoading: isLoadingOrg } = useQuery({
    queryKey: ['organization'],
    queryFn: () => api.getOrganization().then((r) => r.data),
    enabled: !!activeOrgId,
  })

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo + current organization */}
          <div className="flex items-center gap-2 px-6 py-5 border-b">
            <Wrench className="h-8 w-8 text-primary shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xl font-bold leading-tight">MainTek</span>
              {activeOrgId && isLoadingOrg ? (
                <Skeleton className="h-3 w-24 mt-1" />
              ) : organization?.name ? (
                <span className="text-xs text-muted-foreground truncate">
                  {organization.name}
                </span>
              ) : null}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="px-4 pt-4 space-y-2">
            <button
              type="button"
              onClick={openCommandPalette}
              className="flex w-full items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <CommandIcon className="h-4 w-4" />
              <span>Search…</span>
              <kbd className="ml-auto hidden items-center gap-0.5 rounded border bg-background px-1.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
                ⌘K
              </kbd>
            </button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 border-dashed text-muted-foreground hover:text-primary hover:border-primary"
              onClick={() => setScannerOpen(true)}
            >
              <QrCode className="h-4 w-4" />
              Scan QR Code
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {primaryNav.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  {isActive && (
                    <span className="absolute -left-4 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                  )}
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}

            {/* Reports Sub-nav */}
            {pathname.startsWith('/dashboard/reports') && (
              <div className="pl-4 space-y-1">
                {reportSubNav.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <item.icon className="h-3.5 w-3.5" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            )}

            {/* Settings Sub-nav */}
            {pathname.startsWith('/dashboard/settings') && (
              <div className="border-t pt-2 mt-2">
                <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Settings</p>
                {settingsSubNav.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <item.icon className="h-3.5 w-3.5" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            )}

            {/* Admin — only visible to platform superadmins (MainTek HQ operators) */}
            {user?.systemRole === 'superadmin' && (
              <div className="border-t pt-2 mt-2">
                <Link
                  href="/dashboard/admin/tenants"
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    pathname.startsWith('/dashboard/admin')
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Shield className="h-5 w-5" />
                  Admin
                </Link>
              </div>
            )}
          </nav>

          {/* User section */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {user?.firstName?.[0] || user?.username?.[0] || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="flex-1 justify-start" asChild>
                <Link href="/dashboard/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={logout} title="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <QrScannerDialog open={scannerOpen} onOpenChange={setScannerOpen} />
    </>
  )
}
