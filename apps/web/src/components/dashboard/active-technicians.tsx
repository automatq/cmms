'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Radio } from 'lucide-react'
import Link from 'next/link'

interface ActiveActivity {
  id: string
  userId: string
  user: { firstName: string; lastName: string }
  assetId: string
  asset: { name: string; assetNumber: string }
  workOrder: { id: string; woNumber: string; title: string }
  startedAt: string
}

export function ActiveTechnicians() {
  const { data: activities = [] } = useQuery<ActiveActivity[]>({
    queryKey: ['active-activities'],
    queryFn: async () => {
      const res = await api.getActiveActivities()
      return res.data
    },
    refetchInterval: 60000,
  })

  // Tick every 30s to update elapsed times
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(interval)
  }, [])

  const formatElapsed = (startedAt: string) => {
    const ms = Date.now() - new Date(startedAt).getTime()
    const minutes = Math.floor(ms / 60000)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Active Technicians
          {activities.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activities.length}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Technicians currently working on assets</CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="h-24 flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded-lg">
            No active work sessions
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <Link
                key={activity.id}
                href={`/dashboard/work-orders/${activity.workOrder.id}`}
                className="block"
              >
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  {/* Pulsing indicator */}
                  <div className="relative shrink-0">
                    <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Radio className="h-5 w-5 text-green-500" />
                    </div>
                    <span className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full animate-pulse" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {activity.user.firstName} {activity.user.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {activity.asset.name} ({activity.asset.assetNumber})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      WO: {activity.workOrder.woNumber}
                    </p>
                  </div>

                  {/* Elapsed time */}
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center rounded-md bg-green-500/10 px-2 py-1 text-xs font-medium text-green-600 ring-1 ring-inset ring-green-500/20">
                      {formatElapsed(activity.startedAt)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
