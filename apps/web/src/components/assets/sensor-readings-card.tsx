'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { format } from 'date-fns'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useChartTheme } from '@/hooks/use-chart-theme'
import { Activity } from 'lucide-react'

type Reading = {
  id: string
  metric: string
  value: string | number
  unit?: string | null
  recordedAt: string
}

export function SensorReadingsCard({ assetId }: { assetId: string }) {
  const theme = useChartTheme()
  const [metric, setMetric] = React.useState<string>('')

  const { data, isLoading } = useQuery({
    queryKey: ['asset-sensor-readings', assetId],
    queryFn: async () => (await api.getSensorReadings(assetId)).data as Reading[],
  })

  const readings = React.useMemo(() => (Array.isArray(data) ? data : []), [data])
  const metrics = React.useMemo(
    () => [...new Set(readings.map((r) => r.metric))].sort(),
    [readings],
  )

  // Default to the first metric once data arrives.
  React.useEffect(() => {
    if (!metric && metrics.length > 0) setMetric(metrics[0])
  }, [metrics, metric])

  const chartData = React.useMemo(() => {
    const active = metric || metrics[0]
    return readings
      .filter((r) => r.metric === active)
      .slice()
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
      .map((r) => ({ label: format(new Date(r.recordedAt), 'MMM d HH:mm'), value: Number(r.value) }))
  }, [readings, metric, metrics])

  const unit = readings.find((r) => r.metric === (metric || metrics[0]))?.unit || ''

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Sensor Readings
          </CardTitle>
          {metrics.length > 0 && (
            <Select value={metric} onChange={(e) => setMetric(e.target.value)} className="h-8 w-40">
              {metrics.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-56 w-full" />
        ) : chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            No sensor readings yet. Ingest readings via <code className="text-xs">POST /sensors/readings</code>.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.grid} />
              <XAxis
                dataKey="label"
                stroke={theme.axis}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis
                stroke={theme.axis}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${v}${unit ? ` ${unit}` : ''}`}
                width={56}
              />
              <Tooltip
                contentStyle={{
                  background: theme.tooltipBg,
                  border: `1px solid ${theme.tooltipBorder}`,
                  borderRadius: 8,
                  color: theme.tooltipText,
                  fontSize: 12,
                }}
                formatter={(v: number) => [`${v}${unit ? ` ${unit}` : ''}`, metric || metrics[0]]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={theme.colors[0]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
