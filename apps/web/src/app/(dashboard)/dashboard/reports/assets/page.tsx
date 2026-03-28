'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Monitor, Wrench, History, Activity } from 'lucide-react'
import { ExportButton } from '@/components/reports/export-button'
import Link from 'next/link'
import { format, subDays } from 'date-fns'
import { ChartCard } from '../components/chart-card'
import { OverviewBarChart, OverviewPieChart } from '../components/reports-charts'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function AssetReportPage() {
    const [dateRange, setDateRange] = useState({
        startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
    })

    const { data, isLoading } = useQuery({
        queryKey: ['reports', 'assets', dateRange],
        queryFn: () => api.getAssetReport(dateRange).then(res => res.data),
    })

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

    const { summary, byStatus, byCategory, byLocation, topFailures, mtbfByAsset } = data

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
                        <h1 className="text-3xl font-bold">Asset Reliability</h1>
                        <p className="text-muted-foreground">
                            Performance metrics for your equipment and infrastructure
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
                    <ExportButton reportType="assets" filters={dateRange} />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.total}</div>
                        <p className="text-xs text-muted-foreground">Registered in system</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Assets</CardTitle>
                        <Activity className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.active}</div>
                        <p className="text-xs text-muted-foreground">Currently operational</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Under Repair</span>
                            <span className="text-2xl font-bold text-amber-500">{summary.underRepair}</span>
                        </div>
                        <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                            <div
                                className="bg-amber-500 h-full"
                                style={{ width: `${(summary.underRepair / summary.total) * 100}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Reliability Ranking</CardTitle>
                        <History className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{mtbfByAsset.length > 0 ? 'High' : 'N/A'}</div>
                        <p className="text-xs text-muted-foreground">Based on MTBF history</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 md:grid-cols-2">
                <ChartCard title="Assets by Category" description="Equipment distribution by type">
                    <OverviewPieChart data={byCategory} />
                </ChartCard>
                <ChartCard title="Assets by Status" description="Current operational state distribution">
                    <OverviewPieChart data={byStatus} />
                </ChartCard>
                <ChartCard title="Equipment at Locations" description="Top 10 locations with most assets">
                    <OverviewBarChart data={byLocation} />
                </ChartCard>
                <ChartCard title="Asset Failure Analysis" description="Mean Time Between Failures (Hours)">
                    <OverviewBarChart data={mtbfByAsset.map((a: any) => ({ label: a.assetName, value: parseFloat(a.mtbfHours) }))} />
                </ChartCard>
            </div>

            {/* Top Failure Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Top Failing Assets</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Assets with the most corrective maintenance requests in the last 30 days
                    </p>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Asset Name</TableHead>
                                <TableHead>Asset #</TableHead>
                                <TableHead className="text-right">Failure Count</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {topFailures.map((asset: any) => (
                                <TableRow key={asset.assetId}>
                                    <TableCell className="font-medium">{asset.assetName}</TableCell>
                                    <TableCell>{asset.assetNumber}</TableCell>
                                    <TableCell className="text-right">{asset.failureCount}</TableCell>
                                </TableRow>
                            ))}
                            {topFailures.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                                        No failure data recorded in this period
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
