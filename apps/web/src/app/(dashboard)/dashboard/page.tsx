'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  ClipboardList,
  Package,
  AlertTriangle,
  Clock,
  TrendingUp,
  ArrowRight,
  Wrench,
  Calendar,
} from 'lucide-react'

export default function DashboardPage() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.getDashboard({ days: 30 })
      return res.data
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const kpis = dashboard?.kpis || []
  const openWOs = kpis.find((k: any) => k.label === 'Open Work Orders')?.value || 0
  const completedWOs = kpis.find((k: any) => k.label === 'Completed (Period)')?.value || 0
  const overdueWOs = kpis.find((k: any) => k.label === 'Overdue')?.value || 0
  const pmCompliance = kpis.find((k: any) => k.label === 'PM Compliance')?.value || 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your maintenance operations
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/work-orders/new">
            <ClipboardList className="h-4 w-4 mr-2" />
            New Work Order
          </Link>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Work Orders</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openWOs}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting completion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed (30 days)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedWOs}</div>
            <p className="text-xs text-muted-foreground">
              Work orders completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overdueWOs}</div>
            <p className="text-xs text-muted-foreground">
              Requires attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PM Compliance</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pmCompliance}%</div>
            <p className="text-xs text-muted-foreground">
              On-time completion rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Upcoming */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Completions</CardTitle>
            <CardDescription>
              Latest completed work orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(dashboard?.recentActivity || []).slice(0, 5).map((wo: any) => (
                <div key={wo.id} className="flex items-center gap-4">
                  <div className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center">
                    <Wrench className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{wo.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {wo.woNumber} • {wo.asset || 'No asset'}
                    </p>
                  </div>
                </div>
              ))}
              {(!dashboard?.recentActivity || dashboard.recentActivity.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent activity
                </p>
              )}
            </div>
            <Button variant="ghost" className="w-full mt-4" asChild>
              <Link href="/dashboard/work-orders">
                View All Work Orders
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Upcoming PMs */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming PM</CardTitle>
            <CardDescription>
              Preventive maintenance due soon
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(dashboard?.upcomingPMs || []).slice(0, 5).map((pm: any) => (
                <div key={pm.id} className="flex items-center gap-4">
                  <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{pm.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {pm.asset || 'No asset'} • Due: {new Date(pm.nextDueAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {(!dashboard?.upcomingPMs || dashboard.upcomingPMs.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No upcoming PMs
                </p>
              )}
            </div>
            <Button variant="ghost" className="w-full mt-4" asChild>
              <Link href="/dashboard/pm">
                View All PM Plans
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts */}
      {dashboard?.lowStockAlerts && dashboard.lowStockAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Low Stock Alerts
            </CardTitle>
            <CardDescription>
              Parts that need to be reordered
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {dashboard.lowStockAlerts.slice(0, 6).map((part: any) => (
                <div key={part.partId} className="flex items-center gap-3 p-3 rounded-lg border">
                  <Package className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{part.partName}</p>
                    <p className="text-xs text-muted-foreground">
                      SKU: {part.sku} • Qty: {part.qtyOnHand}/{part.reorderPoint}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-4" asChild>
              <Link href="/dashboard/inventory">
                View Inventory
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
