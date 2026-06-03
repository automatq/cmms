'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BarChart3, Clock, CheckCircle2, DollarSign } from 'lucide-react'
import { ExportButton } from '@/components/reports/export-button'
import Link from 'next/link'
import { format } from 'date-fns'
import { ChartCard } from '../components/chart-card'
import { OverviewBarChart, OverviewLineChart, OverviewPieChart } from '../components/reports-charts'
import { DateRangePicker, defaultDateRange } from '../components/date-range-picker'
import {
    PeriodComparisonToggle,
    DeltaIndicator,
    previousPeriod,
} from '../components/period-comparison'
import { FilterChips, type FilterOption } from '../components/filter-chips'
import { DrillDownSheet } from '../components/drill-down-sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default function WorkOrderReportPage() {
    const [dateRange, setDateRange] = useState(defaultDateRange(30))
    const [compareEnabled, setCompareEnabled] = useState(false)
    const [locationIds, setLocationIds] = useState<string[]>([])
    const [categoryIds, setCategoryIds] = useState<string[]>([])
    const [technicianIds, setTechnicianIds] = useState<string[]>([])

    // Filter option lookups. Each is fetched once and cached by React
    // Query; the report itself refetches whenever the selected IDs change.
    const { data: locations } = useQuery({
        queryKey: ['locations'],
        queryFn: () => api.getLocations().then((r) => r.data ?? []),
    })
    const { data: categories } = useQuery({
        queryKey: ['categories'],
        queryFn: () => api.getCategories().then((r) => r.data ?? []),
    })
    const { data: users } = useQuery({
        queryKey: ['users', 'all'],
        queryFn: () => api.getUsers({ limit: 200 }).then((r) => {
            const d = r.data as unknown
            // getUsers may return PaginatedResult<User> | User[] depending on backend; handle both.
            if (Array.isArray(d)) return d
            if (d && typeof d === 'object' && 'data' in d && Array.isArray((d as { data: unknown[] }).data)) {
                return (d as { data: unknown[] }).data
            }
            return []
        }),
    })

    const locationOptions: FilterOption[] = (Array.isArray(locations) ? locations : [])
        .map((l: { id: string; name?: string }) => ({ id: l.id, label: l.name ?? '(unnamed)' }))
    const categoryOptions: FilterOption[] = (Array.isArray(categories) ? categories : [])
        .map((c: { id: string; name?: string }) => ({ id: c.id, label: c.name ?? '(unnamed)' }))
    const technicianOptions: FilterOption[] = (Array.isArray(users) ? users : [])
        .map((u: { id: string; firstName?: string; lastName?: string; email?: string }) => ({
            id: u.id,
            label: [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email || '(unknown)',
        }))

    // Build the params object the API client receives. Empty arrays are
    // omitted so the server-side default ("no filter") kicks in.
    const reportParams = {
        ...dateRange,
        ...(locationIds.length ? { locationIds } : {}),
        ...(categoryIds.length ? { categoryIds } : {}),
        ...(technicianIds.length ? { technicianIds } : {}),
    }

    const { data, isLoading } = useQuery({
        queryKey: ['reports', 'work-orders', reportParams],
        queryFn: () => api.getWorkOrderReport(reportParams).then(res => res.data),
    })

    // Only fetch the prior period when the user explicitly opts in —
    // saves a round trip on the default render.
    const prevRange = previousPeriod(dateRange)
    const prevReportParams = { ...prevRange, ...reportParams, ...prevRange }
    const { data: prevData } = useQuery({
        queryKey: ['reports', 'work-orders', 'prev', prevReportParams],
        queryFn: () => api.getWorkOrderReport(prevReportParams).then(res => res.data),
        enabled: compareEnabled,
    })
    const prevSummary = compareEnabled ? prevData?.summary : undefined

    // Drill-down state — clicking a chart segment opens this sheet
    // with the underlying WOs (uses the existing /work-orders list
    // endpoint with the same filters + the chart's dimension).
    const [drillOpen, setDrillOpen] = useState(false)
    const [drillTitle, setDrillTitle] = useState('')
    const [drillFilter, setDrillFilter] = useState<Record<string, unknown>>({})

    const { data: drillRows, isLoading: drillLoading } = useQuery({
        queryKey: ['reports', 'work-orders', 'drill', drillFilter],
        queryFn: () => api.getWorkOrders(drillFilter).then((r) => {
            const d = r.data as unknown
            if (Array.isArray(d)) return d
            if (d && typeof d === 'object' && 'data' in d && Array.isArray((d as { data: unknown[] }).data)) {
                return (d as { data: unknown[] }).data
            }
            return []
        }),
        enabled: drillOpen,
    })

    function openDrill(field: 'type' | 'priority', value: string) {
        setDrillTitle(`Work orders — ${field}: ${value}`)
        setDrillFilter({
            ...dateRange,
            ...(locationIds.length ? { locationIds } : {}),
            ...(categoryIds.length ? { categoryIds } : {}),
            ...(technicianIds.length ? { technicianIds } : {}),
            [field]: value,
            limit: 100,
        })
        setDrillOpen(true)
    }

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-64 bg-muted animate-pulse rounded" />
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[400px] w-full" />)}
                </div>
            </div>
        )
    }

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <h2 className="text-xl font-semibold">Failed to load report data</h2>
                <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
        )
    }

    const { summary, byType, byPriority, byTechnician, trend } = data

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/dashboard/reports">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">Work Order Analysis</h1>
                        <p className="text-muted-foreground">
                            {format(new Date(dateRange.startDate), 'MMM d, yyyy')} - {format(new Date(dateRange.endDate), 'MMM d, yyyy')}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 justify-end">
                    <DateRangePicker value={dateRange} onChange={setDateRange} />
                    <FilterChips
                        label="Location"
                        options={locationOptions}
                        value={locationIds}
                        onChange={setLocationIds}
                    />
                    <FilterChips
                        label="Category"
                        options={categoryOptions}
                        value={categoryIds}
                        onChange={setCategoryIds}
                    />
                    <FilterChips
                        label="Technician"
                        options={technicianOptions}
                        value={technicianIds}
                        onChange={setTechnicianIds}
                    />
                    <PeriodComparisonToggle enabled={compareEnabled} onChange={setCompareEnabled} />
                    <ExportButton reportType="work-orders" filters={reportParams} />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Work Orders</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-2">
                            <div className="text-2xl font-bold">{summary.total}</div>
                            <DeltaIndicator current={summary.total} previous={prevSummary?.total} />
                        </div>
                        <p className="text-xs text-muted-foreground">In selected period</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-2">
                            <div className="text-2xl font-bold">{summary.completionRate}%</div>
                            <DeltaIndicator current={summary.completionRate} previous={prevSummary?.completionRate} />
                        </div>
                        <p className="text-xs text-muted-foreground">{summary.completed} completed</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Completion Time</CardTitle>
                        <Clock className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-2">
                            <div className="text-2xl font-bold">{summary.avgCompletionTime}h</div>
                            {/* Lower is better for "time to complete" — inverse=true so increases render red */}
                            <DeltaIndicator current={summary.avgCompletionTime} previous={prevSummary?.avgCompletionTime} inverse />
                        </div>
                        <p className="text-xs text-muted-foreground">Per work order</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Labor Cost</CardTitle>
                        <DollarSign className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-2">
                            <div className="text-2xl font-bold">${summary.totalCost}</div>
                            <DeltaIndicator current={summary.totalCost} previous={prevSummary?.totalCost} />
                        </div>
                        <p className="text-xs text-muted-foreground">Estimated costs</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts — byType and byPriority slices are clickable for drill-down. */}
            <div className="grid gap-6 md:grid-cols-2">
                <ChartCard title="Work Orders by Type" description="Distribution of maintenance activities · click to drill in">
                    <OverviewPieChart data={byType} onSegmentClick={(d) => openDrill('type', d.label)} />
                </ChartCard>
                <ChartCard title="Work Orders by Priority" description="Task urgency distribution · click to drill in">
                    <OverviewBarChart data={byPriority} onSegmentClick={(d) => openDrill('priority', d.label)} />
                </ChartCard>
                <ChartCard title="Technician Performance" description="Work orders assigned per technician">
                    <OverviewBarChart data={byTechnician} />
                </ChartCard>
                <ChartCard title="Work Order Creation Trend" description="New work orders over time">
                    <OverviewLineChart data={trend} />
                </ChartCard>
            </div>

            <DrillDownSheet
                open={drillOpen}
                onOpenChange={setDrillOpen}
                title={drillTitle}
                description="Underlying work orders matching the chart segment and current filters"
            >
                {drillLoading ? (
                    <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                ) : !drillRows?.length ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No work orders in this slice.</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>WO #</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Created</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(drillRows as Array<{ id: string; woNumber: string; title: string; status: string; priority: string; createdAt: string }>).map((wo) => (
                                <TableRow key={wo.id}>
                                    <TableCell className="font-mono text-xs">{wo.woNumber}</TableCell>
                                    <TableCell>
                                        <Link href={`/dashboard/work-orders/${wo.id}`} className="hover:underline">
                                            {wo.title}
                                        </Link>
                                    </TableCell>
                                    <TableCell><Badge variant="secondary">{wo.status?.replace(/_/g, ' ')}</Badge></TableCell>
                                    <TableCell>{wo.priority}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {format(new Date(wo.createdAt), 'MMM d, yyyy')}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </DrillDownSheet>
        </div>
    )
}
