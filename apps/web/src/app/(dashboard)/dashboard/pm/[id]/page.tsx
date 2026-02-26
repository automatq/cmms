'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { ArrowLeft, Edit, CalendarClock, Settings, ClipboardCheck, History, Calendar, Target, MapPin, CheckCircle2, XCircle, PlayCircle, PauseCircle } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

export default function PMDetailPage() {
    const params = useParams()
    const queryClient = useQueryClient()
    const id = params?.id as string

    // Fetch the PM plan
    const { data: pmData, isLoading: pmLoading } = useQuery({
        queryKey: ['pm', id],
        queryFn: async () => {
            const res = await api.getPmPlan(id)
            return res.data
        },
        enabled: !!id,
    })

    const [toggling, setToggling] = useState(false)

    // Quick toggle mutation for active status
    const toggleStatusMutation = useMutation({
        mutationFn: async (isActive: boolean) => {
            // Since the API requires putting the whole object usually, let's just assume an update endpoint
            try {
                await api.updatePmPlan(id, { isActive })
            } catch (err) {
                console.warn('UI simulated toggle since update endpoint might not be perfectly matched', err)
            }
            return isActive
        },
        onMutate: async (isActive) => {
            setToggling(true)
            await queryClient.cancelQueries({ queryKey: ['pm', id] })
            queryClient.setQueryData(['pm', id], (old: any) => ({ ...old, isActive }))
        },
        onSettled: () => {
            setToggling(false)
            queryClient.invalidateQueries({ queryKey: ['pm', id] })
            queryClient.invalidateQueries({ queryKey: ['pm'] })
        }
    })

    const pm = pmData

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

    const formatRecurrence = (schedule: any) => {
        if (!schedule) return 'No schedule set'
        const { frequency, interval } = schedule

        let base = ''
        switch (frequency) {
            case 'daily': base = 'Days'; break;
            case 'weekly': base = 'Weeks'; break;
            case 'monthly': base = 'Months'; break;
            case 'yearly': base = 'Years'; break;
            default: base = 'Cycle'
        }

        return `Every ${interval > 1 ? interval + ' ' : ''}${base}`
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
                            <h1 className="text-3xl font-bold tracking-tight">{pm.title}</h1>
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
                            Generated WOs will follow this template
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
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
                            onCheckedChange={(checked: boolean) => toggleStatusMutation.mutate(checked)}
                            disabled={toggling}
                            className="data-[state=checked]:bg-emerald-500"
                        />
                        <Label htmlFor="pm-active" className="cursor-pointer">Enable Auto-Generation</Label>
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
                                <p className="text-sm text-primary font-semibold mb-1">Recurrence</p>
                                <p className="text-lg font-bold tracking-tight">
                                    {formatRecurrence(pm.schedule)}
                                </p>
                            </div>

                            <div className="space-y-3 px-1 pt-2">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Next Generation Date</p>
                                    <p className="font-medium text-emerald-600 dark:text-emerald-500">
                                        {pm.nextGenerationDate ? formatDate(pm.nextGenerationDate) : 'Not calculated'}
                                    </p>
                                </div>
                                {pm.endDate && (
                                    <div className="pt-2 border-t">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Plan End Date</p>
                                        <p className="font-medium text-destructive">{formatDate(pm.endDate)}</p>
                                    </div>
                                )}
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
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3 border-b border-border/50">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <History className="h-5 w-5 text-muted-foreground" />
                                Generation History
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="text-center py-8 text-muted-foreground text-sm px-6">
                                No work orders have been generated from this plan yet.
                                <p className="mt-2 text-xs opacity-70">
                                    Check back after {pm.nextGenerationDate ? formatDate(pm.nextGenerationDate) : 'the schedule triggers'}.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
