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
import { Skeleton } from '@/components/ui/skeleton'

export default function WorkOrderReportPage() {
    const [dateRange, setDateRange] = useState(defaultDateRange(30))
    const [compareEnabled, setCompareEnabled] = useState(false)

    const { data, isLoading } = useQuery({
        queryKey: ['reports', 'work-orders', dateRange],
        queryFn: () => api.getWorkOrderReport(dateRange).then(res => res.data),
    })

    // Only fetch the prior period when the user explicitly opts in —
    // saves a round trip on the default render. `enabled` gates the
    // query; the queryKey still carries the date range so React Query
    // refetches when the user changes the range while comparison is on.
    const prevRange = previousPeriod(dateRange)
    const { data: prevData } = useQuery({
        queryKey: ['reports', 'work-orders', 'prev', prevRange],
        queryFn: () => api.getWorkOrderReport(prevRange).then(res => res.data),
        enabled: compareEnabled,
    })
    const prevSummary = compareEnabled ? prevData?.summary : undefined

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
                <div className="flex items-center gap-2">
                    <DateRangePicker value={dateRange} onChange={setDateRange} />
                    <PeriodComparisonToggle enabled={compareEnabled} onChange={setCompareEnabled} />
                    <ExportButton reportType="work-orders" filters={dateRange} />
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

            {/* Charts */}
            <div className="grid gap-6 md:grid-cols-2">
                <ChartCard title="Work Orders by Type" description="Distribution of maintenance activities">
                    <OverviewPieChart data={byType} />
                </ChartCard>
                <ChartCard title="Work Orders by Priority" description="Task urgency distribution">
                    <OverviewBarChart data={byPriority} />
                </ChartCard>
                <ChartCard title="Technician Performance" description="Work orders assigned per technician">
                    <OverviewBarChart data={byTechnician} />
                </ChartCard>
                <ChartCard title="Work Order Creation Trend" description="New work orders over time">
                    <OverviewLineChart data={trend} />
                </ChartCard>
            </div>
        </div>
    )
}
