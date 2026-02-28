'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, DollarSign, TrendingUp, Wrench, Package } from 'lucide-react'
import Link from 'next/link'
import { format, subDays } from 'date-fns'
import { ChartCard } from '../components/chart-card'
import { OverviewBarChart, OverviewLineChart, OverviewPieChart } from '../components/reports-charts'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'

export default function CostReportPage() {
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 90), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'costs', dateRange],
    queryFn: () => api.getCostReport(dateRange).then(res => res.data),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map(i => <Skeleton key={i} className="h-[400px] w-full" />)}
        </div>
      </div>
    )
  }

  const summary = data?.summary || data || {}
  const byCategory = Array.isArray(data?.byCategory) ? data.byCategory : []
  const trend = Array.isArray(data?.trend) ? data.trend : []
  const byType = Array.isArray(data?.byType) ? data.byType : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/reports">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Cost Analysis</h1>
            <p className="text-muted-foreground">
              {format(new Date(dateRange.startDate), 'MMM d, yyyy')} - {format(new Date(dateRange.endDate), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="h-9"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalCost || 0)}</div>
            <p className="text-xs text-muted-foreground">All maintenance costs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Labor Cost</CardTitle>
            <Wrench className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.laborCost || 0)}</div>
            <p className="text-xs text-muted-foreground">Technician hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Parts Cost</CardTitle>
            <Package className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.partsCost || 0)}</div>
            <p className="text-xs text-muted-foreground">Material expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Cost/WO</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.avgCostPerWo || 0)}</div>
            <p className="text-xs text-muted-foreground">Per work order</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {byCategory.length > 0 && (
          <ChartCard title="Cost by Category" description="Spending breakdown by asset category">
            <OverviewPieChart data={byCategory} />
          </ChartCard>
        )}
        {byType.length > 0 && (
          <ChartCard title="Cost by Type" description="Corrective vs preventive spending">
            <OverviewBarChart data={byType} />
          </ChartCard>
        )}
        {trend.length > 0 && (
          <ChartCard title="Cost Trend" description="Monthly cost over time" className="md:col-span-2">
            <OverviewLineChart data={trend} />
          </ChartCard>
        )}
      </div>
    </div>
  )
}
