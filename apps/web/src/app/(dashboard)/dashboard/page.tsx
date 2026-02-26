'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/page-header'
import {
  ClipboardList,
  Package,
  AlertTriangle,
  Clock,
  TrendingUp,
  ArrowRight,
  Wrench,
  Calendar as CalendarIcon,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { DashboardCalendar, CalendarEvent } from '@/components/dashboard/dashboard-calendar'
import { useMemo, useState } from 'react'

export default function DashboardPage() {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const { data: dashboard, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.getDashboard({ days: 30 })
      return res.data
    },
  })

  // Fetch Work Orders for the calendar
  const { data: workOrdersData, isLoading: isLoadingWO } = useQuery({
    queryKey: ['work-orders', 'calendar'],
    queryFn: async () => {
      const res = await api.getWorkOrders({ limit: 100 }) // Fetching a reasonable amount for the current view
      return res.data
    },
  })

  // Fetch PM Plans for the calendar
  const { data: pmPlansData, isLoading: isLoadingPM } = useQuery({
    queryKey: ['pm-plans', 'calendar'],
    queryFn: async () => {
      const res = await api.getPmPlans({ limit: 100 })
      return res.data
    },
  })

  const isLoading = isLoadingDashboard || isLoadingWO || isLoadingPM

  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    const events: CalendarEvent[] = []

    // Map Work Orders
    if (workOrdersData?.data) {
      workOrdersData.data.forEach((wo: any) => {
        if (wo.dueDate || wo.createdAt) {
          events.push({
            id: `wo-${wo.id}`,
            title: wo.title,
            date: new Date(wo.dueDate || wo.createdAt),
            type: wo.type === 'emergency' ? 'downtime' : 'work_order',
            status: wo.status,
            priority: wo.priority,
            asset: wo.asset?.name,
          })
        }
      })
    }

    // Map PM Plans
    if (pmPlansData?.data) {
      pmPlansData.data.forEach((pm: any) => {
        if (pm.nextDueAt) {
          events.push({
            id: `pm-${pm.id}`,
            title: pm.name,
            date: new Date(pm.nextDueAt),
            type: 'pm',
            status: pm.isActive ? 'Active' : 'Inactive',
            asset: pm.asset?.name,
          })
        }
      })
    }

    return events
  }, [workOrdersData, pmPlansData])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full md:w-1/2" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[120px] w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[600px] w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[300px] w-full rounded-xl" />
          <Skeleton className="h-[300px] w-full rounded-xl" />
        </div>
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
      <PageHeader
        title="Dashboard"
        description="Overview of your maintenance operations"
        actions={
          <Button asChild>
            <Link href="/dashboard/work-orders/new">
              <ClipboardList className="h-4 w-4 mr-2" />
              New Work Order
            </Link>
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Work Orders</CardTitle>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <ClipboardList className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openWOs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting completion
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed (30 days)</CardTitle>
            <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedWOs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Work orders completed
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overdueWOs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Requires attention
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PM Compliance</CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <CalendarIcon className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pmCompliance}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              On-time completion rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Big Calendar Section */}
      <Card className="col-span-1 border-t-4 border-t-primary">
        <CardHeader>
          <CardTitle>Operations Calendar</CardTitle>
          <CardDescription>
            Schedule of all maintenance activities, preventive maintenance plans, and reported downtimes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[700px]">
            <DashboardCalendar
              events={calendarEvents}
              onEventClick={(event) => {
                setSelectedEvent(event)
              }}
            />
          </div>
        </CardContent>
      </Card>

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
                <div key={wo.id} className="flex items-center gap-4 border-b last:border-b-0 pb-3 last:pb-0">
                  <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <Wrench className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate leading-none">{wo.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {wo.woNumber} <span className="mx-1">•</span> {wo.asset || 'No asset'}
                    </p>
                  </div>
                </div>
              ))}
              {(!dashboard?.recentActivity || dashboard.recentActivity.length === 0) && (
                <div className="h-24 flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded-lg">
                  No recent activity
                </div>
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
                <div key={pm.id} className="flex items-center gap-4 border-b last:border-b-0 pb-3 last:pb-0">
                  <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate leading-none">{pm.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {pm.asset || 'No asset'} <span className="mx-1">•</span> Date: {new Date(pm.nextDueAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {(!dashboard?.upcomingPMs || dashboard.upcomingPMs.length === 0) && (
                <div className="h-24 flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded-lg">
                  No upcoming PMs
                </div>
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
                <div key={part.partId} className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:border-amber-500/50 transition-colors">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Package className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{part.partName}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      SKU: {part.sku}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-600 ring-1 ring-inset ring-amber-500/20">
                      {part.qtyOnHand} / {part.reorderPoint}
                    </span>
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

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
            <DialogDescription>
              {selectedEvent?.type === 'pm' ? 'Preventive Maintenance' :
                selectedEvent?.type === 'work_order' ? 'Work Order' :
                  selectedEvent?.type === 'downtime' ? 'Downtime Event' : 'Event'} Details
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date</p>
                  <p className="text-sm">{selectedEvent.date.toLocaleDateString()} {selectedEvent.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Type</p>
                  <p className="text-sm capitalize">{selectedEvent.type.replace('_', ' ')}</p>
                </div>
                {selectedEvent.asset && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Asset</p>
                    <p className="text-sm">{selectedEvent.asset}</p>
                  </div>
                )}
                {selectedEvent.status && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <p className="text-sm capitalize">{typeof selectedEvent.status === 'string' ? selectedEvent.status.replace('_', ' ') : selectedEvent.status}</p>
                  </div>
                )}
                {selectedEvent.priority && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Priority</p>
                    <p className="text-sm capitalize">{selectedEvent.priority}</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedEvent(null)}>Close</Button>
                {selectedEvent.id.startsWith('wo-') && (
                  <Button asChild>
                    <Link href={`/dashboard/work-orders/${selectedEvent.id.replace('wo-', '')}`}>View Work Order</Link>
                  </Button>
                )}
                {selectedEvent.id.startsWith('pm-') && (
                  <Button asChild>
                    <Link href={`/dashboard/pm/${selectedEvent.id.replace('pm-', '')}`}>View PM Plan</Link>
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
