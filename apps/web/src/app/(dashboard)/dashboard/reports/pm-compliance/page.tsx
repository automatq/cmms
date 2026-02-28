'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Calendar, AlertCircle, Clock, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { format, subDays } from 'date-fns'
import { ChartCard } from '../components/chart-card'
import { OverviewBarChart, OverviewLineChart } from '../components/reports-charts'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'

export default function PmComplianceReportPage() {
    const [dateRange, setDateRange] = useState({
        startDate: format(subDays(new Date(), 90), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
    })

    const { data, isLoading } = useQuery({
        queryKey: ['reports', 'pm-compliance', dateRange],
        queryFn: () => api.getPmComplianceReport(dateRange).then(res => res.data),
    })

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-64 bg-muted animate-pulse rounded" />
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                    {[1, 2].map(i => <Skeleton key={i} className="h-[400px] w-full" />)}
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

    const { overallCompliance, byAsset, byPlan, trend, overdueCount, upcomingCount } = data

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
                        <h1 className="text-3xl font-bold">PM Compliance Report</h1>
                        <p className="text-muted-foreground">
                            Preventive maintenance schedule adherence and completion metrics
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="space-y-1">
                        <Label className="text-xs">From</Label>
                        <Input type="date" value={dateRange.startDate} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} className="h-9" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">To</Label>
                        <Input type="date" value={dateRange.endDate} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} className="h-9" />
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Overall Compliance</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{overallCompliance}%</div>
                        <Progress value={overallCompliance} className="h-2 mt-2" />
                        <p className="text-xs text-muted-foreground mt-2">Target: 95%</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Overdue PMs</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{overdueCount}</div>
                        <p className="text-xs text-muted-foreground">Require immediate attention</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Upcoming (7 Days)</CardTitle>
                        <Clock className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{upcomingCount}</div>
                        <p className="text-xs text-muted-foreground">Next week's workload</p>
                    </CardContent>
                </Card>
            </div>

            {/* Compliance Trend */}
            <ChartCard title="Compliance Trend" description="Monthly PM completion rate percentage">
                <OverviewLineChart data={trend} />
            </ChartCard>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Compliance by Asset</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Asset</TableHead>
                                    <TableHead className="text-right">Compliance</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {byAsset.slice(0, 5).map((item: any) => (
                                    <TableRow key={item.assetId}>
                                        <TableCell className="font-medium">{item.assetName}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <span className={item.compliance >= 90 ? 'text-green-600' : 'text-amber-600'}>
                                                    {item.compliance}%
                                                </span>
                                                <div className="w-12 bg-muted h-1 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${item.compliance >= 90 ? 'bg-green-500' : 'bg-amber-500'}`}
                                                        style={{ width: `${item.compliance}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Compliance by Plan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Plan Name</TableHead>
                                    <TableHead className="text-right">Compliance</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {byPlan.slice(0, 5).map((item: any) => (
                                    <TableRow key={item.planId}>
                                        <TableCell className="font-medium">{item.planName}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <span className={item.compliance >= 90 ? 'text-green-600' : 'text-amber-600'}>
                                                    {item.compliance}%
                                                </span>
                                                <div className="w-12 bg-muted h-1 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${item.compliance >= 90 ? 'bg-green-500' : 'bg-amber-500'}`}
                                                        style={{ width: `${item.compliance}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
