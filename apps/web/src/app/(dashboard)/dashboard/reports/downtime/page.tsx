'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { Clock, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react'

export default function DowntimeReportPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data: report, isLoading } = useQuery({
    queryKey: ['reports', 'downtime', dateFrom, dateTo],
    queryFn: () =>
      api
        .getDowntimeReport({
          ...(dateFrom && { dateFrom }),
          ...(dateTo && { dateTo }),
        })
        .then((r) => r.data),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Downtime Report"
        description="Track asset downtime, MTBF, and MTTR metrics"
      />

      <div className="flex gap-4">
        <div>
          <label className="text-sm font-medium">From</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">To</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-24" />
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Downtime Events
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {report?.totalEvents || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Downtime
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {report?.totalDowntimeHours?.toFixed(1) || 0}h
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Avg MTBF</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {report?.avgMtbfHours?.toFixed(1) || '—'}h
                </div>
                <p className="text-xs text-muted-foreground">
                  Mean Time Between Failures
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Avg MTTR</CardTitle>
                <TrendingDown className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {report?.avgMttrHours?.toFixed(1) || '—'}h
                </div>
                <p className="text-xs text-muted-foreground">
                  Mean Time To Repair
                </p>
              </CardContent>
            </Card>
          </div>

          {report?.assetBreakdown?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Downtime by Asset</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.assetBreakdown.map((item: any) => (
                    <div
                      key={item.assetId}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div>
                        <span className="font-medium">{item.assetName}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {item.eventCount} events
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">
                          {item.totalHours?.toFixed(1)}h total
                        </Badge>
                        {item.mttr && (
                          <Badge variant="outline">
                            MTTR: {item.mttr.toFixed(1)}h
                          </Badge>
                        )}
                        {item.mtbf && (
                          <Badge variant="outline">
                            MTBF: {item.mtbf.toFixed(1)}h
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(!report?.assetBreakdown || report.assetBreakdown.length === 0) && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-lg font-medium">
                  No downtime data found
                </p>
                <p className="text-sm text-muted-foreground">
                  Downtime is tracked automatically when work orders are created
                  for assets
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
