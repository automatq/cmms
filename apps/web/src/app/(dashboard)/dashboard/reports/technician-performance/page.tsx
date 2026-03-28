'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Users, Clock, CheckCircle2, Star } from 'lucide-react'
import { ExportButton } from '@/components/reports/export-button'
import Link from 'next/link'
import { format, subDays } from 'date-fns'
import { ChartCard } from '../components/chart-card'
import { OverviewBarChart } from '../components/reports-charts'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

export default function TechnicianPerformancePage() {
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'technician-performance', dateRange],
    queryFn: () => api.getTechnicianPerformanceReport(dateRange).then(res => res.data),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  const summary = data?.summary || data || {}
  const technicians = Array.isArray(data?.technicians) ? data.technicians : Array.isArray(data?.byTechnician) ? data.byTechnician : []
  const completionChart = Array.isArray(data?.completionByTechnician) ? data.completionByTechnician : technicians.map((t: any) => ({ label: t.name || t.label, value: t.completed || t.value || 0 }))

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
            <h1 className="text-3xl font-bold">Technician Performance</h1>
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
          <ExportButton reportType="technician-performance" filters={dateRange} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Technicians</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalTechnicians || technicians.length}</div>
            <p className="text-xs text-muted-foreground">Active in period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Completion Time</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.avgCompletionTime || '-'}h</div>
            <p className="text-xs text-muted-foreground">Per work order</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Rating</CardTitle>
            <Star className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.avgRating || '-'}</div>
            <p className="text-xs text-muted-foreground">Overall satisfaction</p>
          </CardContent>
        </Card>
      </div>

      {completionChart.length > 0 && (
        <ChartCard title="Work Orders Completed" description="By technician in selected period">
          <OverviewBarChart data={completionChart} />
        </ChartCard>
      )}

      {/* Technician Detail Table */}
      {technicians.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Technician Details</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-b-lg overflow-hidden">
              <div className="grid grid-cols-6 gap-4 p-3 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <span className="col-span-2">Technician</span>
                <span>Assigned</span>
                <span>Completed</span>
                <span>Avg Time</span>
                <span>Rate</span>
              </div>
              <div className="divide-y">
                {technicians.map((tech: any, i: number) => (
                  <div key={tech.id || i} className="grid grid-cols-6 gap-4 p-3 items-center">
                    <div className="col-span-2 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {(tech.name || tech.label || '?').slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{tech.name || tech.label}</span>
                    </div>
                    <span className="text-sm">{tech.assigned || tech.total || tech.value || 0}</span>
                    <span className="text-sm">
                      {tech.completed || 0}
                      {tech.assigned > 0 && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {Math.round(((tech.completed || 0) / (tech.assigned || 1)) * 100)}%
                        </Badge>
                      )}
                    </span>
                    <span className="text-sm">{tech.avgTime || '-'}h</span>
                    <span className="text-sm">{tech.completionRate || '-'}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
