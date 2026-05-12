'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  ArrowLeft, Edit, CalendarClock, Settings, ClipboardCheck, History, Calendar,
  Target, MapPin, CheckCircle2, PauseCircle, Play, Trash2,
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

const WO_STATUS_COLORS: Record<string, string> = {
  requested: 'bg-gray-100 text-gray-700',
  pending_approval: 'bg-purple-100 text-purple-700',
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  on_hold: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function PMDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const id = params?.id as string

  const [toggling, setToggling] = useState(false)

  const { data: pm, isLoading: pmLoading } = useQuery({
    queryKey: ['pm', id],
    queryFn: async () => {
      const res = await api.getPmPlan(id)
      return res.data
    },
    enabled: !!id,
  })

  // Real generation history
  const { data: historyData } = useQuery({
    queryKey: ['pm-history', id],
    queryFn: async () => {
      const res = await api.getPmPlanHistory(id)
      return res.data
    },
    enabled: !!id,
  })

  const toggleMutation = useMutation({
    mutationFn: () => api.togglePmPlanActive(id),
    onMutate: async () => {
      setToggling(true)
      await queryClient.cancelQueries({ queryKey: ['pm', id] })
      queryClient.setQueryData(['pm', id], (old: any) => old ? { ...old, isActive: !old.isActive } : old)
    },
    onSettled: () => {
      setToggling(false)
      queryClient.invalidateQueries({ queryKey: ['pm', id] })
      queryClient.invalidateQueries({ queryKey: ['pm'] })
    },
    onError: () => toast.error('Failed to toggle plan status'),
  })

  const triggerMutation = useMutation({
    mutationFn: () => api.triggerPmPlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-history', id] })
      toast.success('Work order generated from PM plan')
    },
    onError: () => toast.error('Failed to trigger PM plan'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.deletePmPlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm'] })
      router.push('/dashboard/pm')
      toast.success('PM plan deleted')
    },
    onError: () => toast.error('Failed to delete PM plan'),
  })

  const history = Array.isArray(historyData) ? historyData : Array.isArray(historyData?.data) ? historyData.data : []

  if (pmLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="md:col-span-2 h-[450px] w-full rounded-xl" />
          <Skeleton className="h-[450px] w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (!pm) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
          <CalendarClock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2">PM Plan Not Found</h2>
        <p className="text-muted-foreground mb-6">The preventive maintenance plan you are looking for does not exist.</p>
        <Button asChild>
          <Link href="/dashboard/pm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to PM Plans
          </Link>
        </Button>
      </div>
    )
  }

  const formatTrigger = () => {
    if (pm.triggerType === 'time_based') {
      return `Every ${pm.frequencyValue || ''} ${pm.frequencyUnit || 'cycle'}`
    }
    if (pm.triggerType === 'meter_based') {
      return `Every ${pm.meterInterval || ''} ${pm.meterUnit || 'units'}`
    }
    if (pm.schedule) {
      const { frequency, interval } = pm.schedule
      const base = frequency === 'daily' ? 'Days' : frequency === 'weekly' ? 'Weeks' : frequency === 'monthly' ? 'Months' : frequency === 'yearly' ? 'Years' : 'Cycle'
      return `Every ${interval > 1 ? interval + ' ' : ''}${base}`
    }
    return 'No schedule set'
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/pm">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{pm.name || pm.title}</h1>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border bg-background shadow-sm">
                {pm.isActive ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <PauseCircle className="h-3.5 w-3.5 text-slate-400" />
                )}
                <span className={`text-xs font-semibold uppercase tracking-wider ${pm.isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {pm.isActive ? 'Active Plan' : 'Paused'}
                </span>
              </div>
            </div>
            <p className="text-muted-foreground font-mono mt-1 text-sm bg-muted/50 w-fit px-2 py-0.5 rounded">
              {pm.triggerType || 'time_based'} | Priority: {pm.priority || 'medium'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              if (confirm('Are you sure you want to delete this PM plan?')) {
                deleteMutation.mutate()
              }
            }}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/dashboard/pm/${pm.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Plan
            </Link>
          </Button>
          <div className="flex items-center space-x-2 pl-4 border-l">
            <Switch
              id="pm-active"
              checked={pm.isActive}
              onCheckedChange={() => toggleMutation.mutate()}
              disabled={toggling}
              className="data-[state=checked]:bg-emerald-500"
            />
            <Label htmlFor="pm-active" className="cursor-pointer">Active</Label>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5 text-muted-foreground" />
                Plan Description & Workflow
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="prose dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap leading-relaxed text-foreground">
                  {pm.description || 'No detailed instructions provided for this maintenance plan.'}
                </p>
              </div>

              {pm.estimatedHours && (
                <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm text-muted-foreground">Estimated Hours: </span>
                  <span className="text-sm font-medium">{pm.estimatedHours}h</span>
                </div>
              )}

              {pm.checklist && pm.checklist.length > 0 && (
                <div className="mt-8">
                  <h4 className="font-semibold mb-4 flex items-center gap-2 border-b pb-2">
                    <ClipboardCheck className="h-4 w-4 text-primary" />
                    Checklist Template
                  </h4>
                  <ul className="space-y-3">
                    {pm.checklist.map((item: any, idx: number) => (
                      <li key={idx} className="flex gap-3 items-start opacity-80">
                        <div className="h-5 w-5 rounded border-2 border-primary/50 shrink-0 mt-0.5" />
                        <span className="text-sm">{item.task || item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Linked Asset */}
          {pm.asset && (
            <Card>
              <CardHeader className="pb-3 border-b border-border/50 bg-secondary/10">
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Target Asset
                  </div>
                  <Button variant="outline" size="sm" asChild className="h-8 shadow-none bg-background">
                    <Link href={`/dashboard/assets/${pm.asset.id}`}>Asset Profile</Link>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 bg-muted rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                    {pm.asset.customFields?.imageUrl ? (
                      <img src={pm.asset.customFields.imageUrl} alt="Asset" className="h-full w-full object-cover" />
                    ) : (
                      <Target className="h-6 w-6 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-lg">{pm.asset.name}</h4>
                    <p className="text-sm font-mono text-muted-foreground bg-muted/30 w-fit px-1.5 rounded">{pm.asset.assetNumber}</p>
                    {pm.asset.location && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                        <MapPin className="h-3 w-3" />
                        {pm.asset.location.name}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="border-primary/20 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Calendar className="h-24 w-24" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-primary" />
                Schedule Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-2 relative z-10">
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                <p className="text-sm text-primary font-semibold mb-1">Trigger</p>
                <p className="text-lg font-bold tracking-tight">{formatTrigger()}</p>
              </div>

              <div className="space-y-3 px-1 pt-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Next Due</p>
                  <p className="font-medium text-emerald-600 dark:text-emerald-500">
                    {pm.nextDueAt ? formatDate(pm.nextDueAt) : pm.nextGenerationDate ? formatDate(pm.nextGenerationDate) : 'Not calculated'}
                  </p>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                  <p className="font-medium flex items-center gap-1.5">
                    {pm.isActive ? (
                      <><div className="h-2 w-2 rounded-full bg-emerald-500" /> Generating WOs</>
                    ) : (
                      <><div className="h-2 w-2 rounded-full bg-slate-400" /> Suspended</>
                    )}
                  </p>
                </div>
                {pm.assignedTo && (
                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Assigned To</p>
                    <p className="font-medium text-sm">
                      {pm.assignedToUser?.firstName ? `${pm.assignedToUser.firstName} ${pm.assignedToUser.lastName || ''}` : pm.assignedTo}
                    </p>
                  </div>
                )}
              </div>

              <Button
                className="w-full"
                onClick={() => triggerMutation.mutate()}
                disabled={triggerMutation.isPending}
              >
                <Play className="h-4 w-4 mr-2" />
                {triggerMutation.isPending ? 'Generating...' : 'Trigger Now'}
              </Button>
            </CardContent>
          </Card>

          {/* Real Generation History */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                Generation History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm px-6">
                  No work orders have been generated from this plan yet.
                </div>
              ) : (
                <div className="divide-y">
                  {history.slice(0, 10).map((item: any) => {
                    const wo = item.workOrder || item
                    return (
                      <Link
                        key={wo.id || item.id}
                        href={`/dashboard/work-orders/${wo.id || item.workOrderId}`}
                        className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium">{wo.title || wo.woNumber || 'Work Order'}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(wo.createdAt || item.triggeredAt)}</p>
                        </div>
                        <Badge className={WO_STATUS_COLORS[wo.status] || 'bg-gray-100 text-gray-700'}>
                          {wo.status?.replace('_', ' ') || 'generated'}
                        </Badge>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
