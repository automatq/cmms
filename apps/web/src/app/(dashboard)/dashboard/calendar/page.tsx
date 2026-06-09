'use client'

import * as React from 'react'
import { useMemo, useState } from 'react'
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Clock, Trash2, Wrench } from 'lucide-react'
import { toast } from 'sonner'

type Blackout = {
  id: string
  startDate: string
  endDate: string
  name: string | null
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toISODate(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

function dateInRange(day: Date, startISO: string, endISO: string): boolean {
  const iso = toISODate(day)
  return iso >= startISO && iso <= endISO
}

export default function CalendarPage() {
  const queryClient = useQueryClient()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [rangeEndInput, setRangeEndInput] = useState('')
  const [rangeNameInput, setRangeNameInput] = useState('')

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const gridStart = startOfWeek(monthStart)
  const gridEnd = endOfWeek(monthEnd)

  const { data: workingDaysData } = useQuery({
    queryKey: ['working-days'],
    queryFn: async () => {
      const res = await api.getWorkingDays()
      return res.data as { workingDays: number[] }
    },
  })
  const workingDays = workingDaysData?.workingDays ?? [1, 2, 3, 4, 5]

  const { data: blackoutsData, isLoading: isLoadingBlackouts } = useQuery({
    queryKey: ['blackouts', toISODate(gridStart), toISODate(gridEnd)],
    queryFn: async () => {
      const res = await api.getBlackouts({ from: toISODate(gridStart), to: toISODate(gridEnd) })
      return res.data as Blackout[]
    },
  })
  const blackouts = blackoutsData ?? []

  const { data: upcomingBlackoutsData } = useQuery({
    queryKey: ['blackouts', 'upcoming', toISODate(new Date())],
    queryFn: async () => {
      const res = await api.getBlackouts({ from: toISODate(new Date()) })
      return res.data as Blackout[]
    },
  })
  const upcomingBlackouts = upcomingBlackoutsData ?? []

  const { data: workOrdersData } = useQuery({
    queryKey: ['work-orders', 'calendar'],
    queryFn: async () => (await api.getWorkOrders({ limit: 100 })).data,
  })

  const { data: pmPlansData } = useQuery({
    queryKey: ['pm-plans', 'calendar'],
    queryFn: async () => (await api.getPmPlans({ limit: 100 })).data,
  })

  const eventsByDay = useMemo(() => {
    const map = new Map<string, { id: string; type: 'wo' | 'pm'; title: string; status?: string }[]>()
    const push = (day: Date, ev: { id: string; type: 'wo' | 'pm'; title: string; status?: string }) => {
      const key = toISODate(day)
      const list = map.get(key) ?? []
      list.push(ev)
      map.set(key, list)
    }
    workOrdersData?.data?.forEach((wo: any) => {
      const d = wo.scheduledStart || wo.createdAt
      if (d) push(new Date(d), { id: wo.id, type: 'wo', title: wo.title, status: wo.status })
    })
    pmPlansData?.data?.forEach((pm: any) => {
      if (pm.nextDueAt) push(new Date(pm.nextDueAt), { id: pm.id, type: 'pm', title: pm.name })
    })
    return map
  }, [workOrdersData, pmPlansData])

  const createBlackout = useMutation({
    mutationFn: (body: { startDate: string; endDate?: string; name?: string }) => api.createBlackout(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blackouts'] })
      toast.success('Blackout added')
    },
    onError: () => toast.error('Failed to add blackout'),
  })

  const deleteBlackout = useMutation({
    mutationFn: (id: string) => api.deleteBlackout(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blackouts'] })
      toast.success('Blackout removed')
    },
    onError: () => toast.error('Failed to remove blackout'),
  })

  const setWorkingDaysMutation = useMutation({
    mutationFn: (days: number[]) => api.setWorkingDays(days),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['working-days'] })
      toast.success('Working days updated')
    },
    onError: () => toast.error('Failed to update working days'),
  })

  // Reschedule a work order (scheduledStart) or PM plan (nextDueAt) to a new day.
  // Time is pinned to local noon to avoid timezone day-shift at midnight.
  const reschedule = useMutation({
    mutationFn: ({ event, date }: { event: { id: string; type: 'wo' | 'pm' }; date: string }) => {
      const iso = new Date(`${date}T12:00:00`).toISOString()
      return event.type === 'wo'
        ? api.updateWorkOrder(event.id, { scheduledStart: iso })
        : api.updatePmPlan(event.id, { nextDueAt: iso })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      queryClient.invalidateQueries({ queryKey: ['pm-plans'] })
      queryClient.invalidateQueries({ queryKey: ['pm'] })
      toast.success('Rescheduled')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to reschedule'),
  })

  const toggleWorkingDay = (dow: number) => {
    const next = workingDays.includes(dow)
      ? workingDays.filter((d) => d !== dow)
      : [...workingDays, dow].sort()
    setWorkingDaysMutation.mutate(next)
  }

  const blackoutsForDay = (day: Date): Blackout[] =>
    blackouts.filter((b) => dateInRange(day, b.startDate, b.endDate))

  const rows: Date[][] = []
  {
    let d = gridStart
    while (d <= gridEnd) {
      const week: Date[] = []
      for (let i = 0; i < 7; i++) {
        week.push(d)
        d = addDays(d, 1)
      }
      rows.push(week)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="Manage working days and blackout periods — PMs won't run on blacked-out days."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>{format(currentDate, 'MMMM yyyy')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground border-b pb-2">
              {DAY_LABELS.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 border-l border-t mt-2">
              {rows.flat().map((day) => {
                const dow = day.getDay()
                const isWorking = workingDays.includes(dow)
                const dayBlackouts = blackoutsForDay(day)
                const isBlackout = dayBlackouts.length > 0
                const inMonth = isSameMonth(day, monthStart)
                const isToday = isSameDay(day, new Date())
                const iso = toISODate(day)
                const events = eventsByDay.get(iso) ?? []

                return (
                  <Popover
                    key={iso}
                    onOpenChange={(open) => {
                      if (open) {
                        setRangeEndInput(iso)
                        setRangeNameInput('')
                      }
                    }}
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          'min-h-[96px] border-b border-r p-1.5 text-left transition-colors flex flex-col gap-1 overflow-hidden',
                          !inMonth && 'opacity-40',
                          !isWorking && !isBlackout && 'bg-muted/40',
                          isBlackout && 'bg-red-500/15',
                          'hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-primary/40',
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              'text-sm font-medium h-6 w-6 flex items-center justify-center rounded-full',
                              isToday && 'bg-primary text-primary-foreground',
                            )}
                          >
                            {format(day, 'd')}
                          </span>
                          {isBlackout && (
                            <span className="text-[10px] font-bold uppercase text-red-600">Off</span>
                          )}
                        </div>
                        {dayBlackouts[0]?.name && (
                          <div className="text-[10px] text-red-700 truncate">{dayBlackouts[0].name}</div>
                        )}
                        <div className="flex-1 space-y-0.5 overflow-hidden">
                          {events.slice(0, 2).map((e) => (
                            <div
                              key={`${e.type}-${e.id}`}
                              className={cn(
                                'text-[11px] px-1.5 py-0.5 rounded truncate flex items-center gap-1',
                                e.type === 'pm'
                                  ? 'bg-emerald-500/15 text-emerald-700'
                                  : 'bg-blue-500/15 text-blue-700',
                              )}
                            >
                              {e.type === 'pm' ? <Clock className="h-3 w-3 shrink-0" /> : <Wrench className="h-3 w-3 shrink-0" />}
                              <span className="truncate">{e.title}</span>
                            </div>
                          ))}
                          {events.length > 2 && (
                            <div className="text-[10px] text-muted-foreground">+{events.length - 2} more</div>
                          )}
                        </div>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-80">
                      <div className="space-y-3">
                        <div>
                          <div className="font-semibold">{format(day, 'EEEE, MMM d, yyyy')}</div>
                          <div className="text-xs text-muted-foreground">
                            {isWorking ? 'Working day' : 'Non-working day (weekly)'}
                            {isBlackout && ' — blackout active'}
                          </div>
                        </div>

                        {events.length > 0 && (
                          <div className="space-y-2 border-b pb-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Scheduled here
                            </p>
                            {events.map((e) => (
                              <div key={`resch-${e.type}-${e.id}`} className="flex items-center gap-2">
                                {e.type === 'pm' ? (
                                  <Clock className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                ) : (
                                  <Wrench className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                                )}
                                <span className="flex-1 truncate text-sm" title={e.title}>{e.title}</span>
                                <Input
                                  type="date"
                                  defaultValue={iso}
                                  aria-label={`Reschedule ${e.title}`}
                                  className="h-7 w-[8.5rem] text-xs"
                                  disabled={reschedule.isPending}
                                  onChange={(ev) => {
                                    const d = ev.target.value
                                    if (d && d !== iso) reschedule.mutate({ event: { id: e.id, type: e.type }, date: d })
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {dayBlackouts.length > 0 ? (
                          <div className="space-y-2">
                            {dayBlackouts.map((b) => (
                              <div key={b.id} className="flex items-center justify-between gap-2 rounded border p-2">
                                <div className="min-w-0">
                                  <div className="text-sm font-medium truncate">{b.name || 'Blackout'}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {b.startDate === b.endDate ? b.startDate : `${b.startDate} → ${b.endDate}`}
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteBlackout.mutate(b.id)}
                                  disabled={deleteBlackout.isPending}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <>
                            <Button
                              className="w-full"
                              size="sm"
                              onClick={() => createBlackout.mutate({ startDate: iso })}
                              disabled={createBlackout.isPending}
                            >
                              Block this day
                            </Button>

                            <div className="rounded border p-2 space-y-2">
                              <div className="text-xs font-medium">Block a range</div>
                              <div className="space-y-1">
                                <Label className="text-xs" htmlFor={`end-${iso}`}>
                                  End date
                                </Label>
                                <Input
                                  id={`end-${iso}`}
                                  type="date"
                                  value={rangeEndInput}
                                  min={iso}
                                  onChange={(e) => setRangeEndInput(e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs" htmlFor={`name-${iso}`}>
                                  Label (optional)
                                </Label>
                                <Input
                                  id={`name-${iso}`}
                                  placeholder="e.g. Plant shutdown"
                                  value={rangeNameInput}
                                  onChange={(e) => setRangeNameInput(e.target.value)}
                                />
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() =>
                                  createBlackout.mutate({
                                    startDate: iso,
                                    endDate: rangeEndInput || iso,
                                    name: rangeNameInput || undefined,
                                  })
                                }
                                disabled={createBlackout.isPending}
                              >
                                Block range
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Working days</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                PMs won't fire on days that aren't checked below.
              </p>
              <div className="flex flex-wrap gap-2">
                {DAY_LABELS.map((label, i) => {
                  const active = workingDays.includes(i)
                  return (
                    <Button
                      key={label}
                      size="sm"
                      variant={active ? 'default' : 'outline'}
                      onClick={() => toggleWorkingDay(i)}
                      disabled={setWorkingDaysMutation.isPending}
                    >
                      {label}
                    </Button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming blackouts</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingBlackouts ? (
                <Skeleton className="h-20 w-full" />
              ) : upcomingBlackouts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming blackouts.</p>
              ) : (
                <ul className="space-y-2">
                  {upcomingBlackouts.map((b) => (
                    <li key={b.id} className="flex items-start justify-between gap-2 border-b last:border-0 pb-2 last:pb-0">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{b.name || 'Blackout'}</div>
                        <div className="text-xs text-muted-foreground">
                          {b.startDate === b.endDate
                            ? format(parseISO(b.startDate), 'MMM d, yyyy')
                            : `${format(parseISO(b.startDate), 'MMM d')} → ${format(parseISO(b.endDate), 'MMM d, yyyy')}`}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteBlackout.mutate(b.id)}
                        disabled={deleteBlackout.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
