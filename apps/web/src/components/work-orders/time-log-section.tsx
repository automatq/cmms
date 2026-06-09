'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatDate } from '@/lib/utils'
import { Clock, CheckCircle2, XCircle, Loader } from 'lucide-react'

function fmtDuration(mins?: number | null): string {
  if (mins == null || mins < 0) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}

function fmtTime(d?: string): string {
  if (!d) return ''
  try {
    return new Date(d).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function techName(u: any): string {
  if (!u) return 'Technician'
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.email || 'Technician'
}

function initialsOf(u: any): string {
  if (!u) return 'T'
  const a = u.firstName?.[0] || u.username?.[0] || u.email?.[0] || 'T'
  const b = u.lastName?.[0] || ''
  return (a + b).toUpperCase()
}

/** Minutes for a session — duration if recorded, else live elapsed for active ones. */
function sessionMinutes(a: any): number {
  if (typeof a.durationMinutes === 'number') return a.durationMinutes
  if (a.status === 'active' && a.startedAt) {
    return Math.max(0, Math.round((Date.now() - new Date(a.startedAt).getTime()) / 60000))
  }
  return 0
}

export function TimeLogSection({ workOrderId }: { workOrderId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['work-order', workOrderId, 'activities'],
    queryFn: async () => (await api.getWorkOrderActivities(workOrderId)).data,
  })
  const activities: any[] = Array.isArray(data) ? data : []

  const totalMins = activities.reduce((sum, a) => sum + sessionMinutes(a), 0)

  // Per-tech rollup: total time + session count.
  const byTech = new Map<string, { name: string; user: any; mins: number; sessions: number }>()
  for (const a of activities) {
    const key = a.userId || a.user?.id || 'unknown'
    const entry = byTech.get(key) || { name: techName(a.user), user: a.user, mins: 0, sessions: 0 }
    entry.mins += sessionMinutes(a)
    entry.sessions += 1
    byTech.set(key, entry)
  }
  const techs = Array.from(byTech.values()).sort((x, y) => y.mins - x.mins)

  return (
    <Card>
      <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary/70" />
          Time Log
        </CardTitle>
        {totalMins > 0 && (
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-semibold text-primary tnum">
            {fmtDuration(totalMins)} total
          </span>
        )}
      </CardHeader>
      <CardContent className="p-6 space-y-5">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No work sessions logged yet. Technicians clock time by scanning the asset QR code to start, and ending
            the session when done.
          </p>
        ) : (
          <>
            {/* Per-technician totals */}
            <div className="space-y-2">
              {techs.map((t) => (
                <div key={t.name} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {initialsOf(t.user)}
                  </div>
                  <span className="flex-1 truncate text-sm font-medium">{t.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.sessions} session{t.sessions === 1 ? '' : 's'}
                  </span>
                  <span className="w-16 text-right text-sm font-semibold tnum">{fmtDuration(t.mins)}</span>
                </div>
              ))}
            </div>

            {/* Session detail */}
            <div className="space-y-2 border-t pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sessions</p>
              {activities.map((a) => {
                const ended = a.completedAt || a.abandonedAt
                const Icon = a.status === 'active' ? Loader : a.status === 'abandoned' ? XCircle : CheckCircle2
                const iconColor =
                  a.status === 'active'
                    ? 'text-amber-500'
                    : a.status === 'abandoned'
                      ? 'text-rose-500'
                      : 'text-emerald-500'
                return (
                  <div key={a.id} className="flex items-center gap-3 text-sm">
                    <Icon className={cn('h-4 w-4 shrink-0', iconColor)} />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium">{techName(a.user)}</span>
                      <span className="text-muted-foreground">
                        {' · '}
                        {fmtTime(a.startedAt)}
                        {ended ? ` → ${fmtTime(ended)}` : a.status === 'active' ? ' → now' : ''}
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold tnum">
                      {a.status === 'active' ? `${fmtDuration(sessionMinutes(a))} (active)` : fmtDuration(a.durationMinutes)}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
