'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Calendar,
  Warehouse,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Wrench,
  Sparkles,
  Inbox,
  Shield,
  QrCode,
  Users,
  Webhook,
  DollarSign,
  FileText,
  Clock,
  FileUp,
  CalendarClock,
} from 'lucide-react'
import { useState } from 'react'
import { QrScannerDialog } from '@/components/dashboard/qr-scanner-dialog'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Assets', href: '/dashboard/assets', icon: Package },
  { name: 'Work Orders', href: '/dashboard/work-orders', icon: ClipboardList },
  { name: 'Work Requests', href: '/dashboard/work-requests', icon: Inbox },
  { name: 'PM Plans', href: '/dashboard/pm', icon: Calendar },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Warehouse },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'Data Import', href: '/dashboard/imports', icon: FileUp },
  { name: 'AI Assistant', href: '/dashboard/ai', icon: Sparkles },
]

const settingsSubNav = [
  { name: 'Teams', href: '/dashboard/settings/teams', icon: Users },
  { name: 'Webhooks', href: '/dashboard/settings/webhooks', icon: Webhook },
  { name: 'Scheduled Reports', href: '/dashboard/settings/scheduled-reports', icon: CalendarClock },
]

const reportSubNav = [
  { name: 'Downtime', href: '/dashboard/reports/downtime', icon: Clock },
  { name: 'Warranties', href: '/dashboard/reports/warranties', icon: Shield },
  { name: 'Budgets', href: '/dashboard/reports/budgets', icon: DollarSign },
  { name: 'Contracts', href: '/dashboard/inventory/contracts', icon: FileText },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)

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
          {/* Logo */}
          <div className="flex items-center gap-2 px-6 py-5 border-b">
            <Wrench className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">CMMS</span>
          </div>

          {/* Quick Actions */}
          <div className="px-4 pt-4">
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
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
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

            {/* Admin */}
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
              <Button variant="ghost" size="icon" onClick={logout}>
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
