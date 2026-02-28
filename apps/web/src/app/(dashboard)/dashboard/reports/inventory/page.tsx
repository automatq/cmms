'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Package, AlertTriangle, DollarSign, TrendingDown } from 'lucide-react'
import Link from 'next/link'
import { format, subDays } from 'date-fns'
import { ChartCard } from '../components/chart-card'
import { OverviewBarChart, OverviewLineChart, OverviewPieChart, StackedBarChart } from '../components/reports-charts'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default function InventoryReportPage() {
    const [dateRange, setDateRange] = useState({
        startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
    })

    const { data, isLoading } = useQuery({
        queryKey: ['reports', 'inventory', dateRange],
        queryFn: () => api.getInventoryReport(dateRange).then(res => res.data),
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

    const { summary, lowStockItems, topConsumedParts, stockValueByStoreroom, transactionTrend } = data

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
                        <h1 className="text-3xl font-bold">Inventory Analysis</h1>
                        <p className="text-muted-foreground">
                            Stock levels, consumption trends, and value distribution
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
                        <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${summary.totalValue}</div>
                        <p className="text-xs text-muted-foreground">Across all storerooms</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.lowStockCount}</div>
                        <p className="text-xs text-muted-foreground">Parts below reorder point</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Unique Parts</CardTitle>
                        <Package className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.totalParts}</div>
                        <p className="text-xs text-muted-foreground">Items in catalog</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 md:grid-cols-2">
                <ChartCard title="Value by Storeroom" description="Inventory capital distribution">
                    <OverviewPieChart data={stockValueByStoreroom} />
                </ChartCard>
                <ChartCard title="Transaction Activity" description="Inbound vs Outbound inventory moves">
                    <StackedBarChart data={transactionTrend} />
                </ChartCard>
                <ChartCard title="Top Consumed Parts" description="Most frequently issued items (Last 30 days)">
                    <OverviewBarChart data={topConsumedParts.map((p: any) => ({ label: p.partName, value: p.totalConsumed }))} />
                </ChartCard>
                <Card>
                    <CardHeader>
                        <CardTitle>Low Stock Items</CardTitle>
                        <p className="text-xs text-muted-foreground">Immediate reorder required</p>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Part Name</TableHead>
                                    <TableHead>Stock</TableHead>
                                    <TableHead>Min</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {lowStockItems.slice(0, 5).map((item: any) => (
                                    <TableRow key={item.partId}>
                                        <TableCell className="font-medium">{item.partName}</TableCell>
                                        <TableCell className="text-red-600 font-bold">{item.qtyOnHand}</TableCell>
                                        <TableCell>{item.reorderPoint}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                                                -{item.deficit}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {lowStockItems.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-4 text-muted-foreground text-sm">
                                            All stock levels are currently healthy
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
