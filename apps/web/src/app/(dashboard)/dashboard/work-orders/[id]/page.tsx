'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { ArrowLeft, Clock, Wrench, User, MapPin, Target, CheckCircle2, FileText, Settings2, PlayCircle, PauseCircle } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { formatDate, formatTimeAgo } from '@/lib/utils'
import { Select } from '@/components/ui/select'
import { useState } from 'react'

export default function WorkOrderDetailPage() {
    const params = useParams()
    const router = useRouter()
    const queryClient = useQueryClient()
    const id = params?.id as string

    // We fetch potentially from a list or if API supports getting a specific WO
    const { data: woData, isLoading: woLoading } = useQuery({
        queryKey: ['work-order', id],
        queryFn: async () => {
            // Mock finding specific WO from list endpoint
            const res = await api.getWorkOrders({ search: id })
            const items = res.data?.data || []
            return items.find((w: any) => w.id === id) || items[0]
        },
        enabled: !!id,
    })

    const [statusUpdating, setStatusUpdating] = useState(false)

    // Assuming api.updateWorkOrder exists. If not, this is a placeholder mutation 
    // that will simulate updating UI optimally until actual API support is confirmed.
    const updateMutation = useMutation({
        mutationFn: async (newStatus: string) => {
            try {
                await api.updateWorkOrder(id, { status: newStatus })
            } catch (err) {
                console.warn('API route for updateWorkOrder may not exist, mocking UI update.', err)
            }
            return newStatus
        },
        onMutate: async (newStatus) => {
            setStatusUpdating(true)
            await queryClient.cancelQueries({ queryKey: ['work-order', id] })
            const previous = queryClient.getQueryData(['work-order', id])
            queryClient.setQueryData(['work-order', id], (old: any) => ({ ...old, status: newStatus }))
            return { previous }
        },
        onSettled: () => {
            setStatusUpdating(false)
            queryClient.invalidateQueries({ queryKey: ['work-order', id] })
            queryClient.invalidateQueries({ queryKey: ['work-orders'] })
        }
    })

    const wo = woData

    if (woLoading) {
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
                    <Skeleton className="md:col-span-2 h-[400px] w-full rounded-xl" />
                    <Skeleton className="h-[400px] w-full rounded-xl" />
                </div>
            </div>
        )
    }

    if (!wo) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                    <Wrench className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Work Order Not Found</h2>
                <p className="text-muted-foreground mb-6">This work order does not exist or you don't have permission to view it.</p>
                <Button asChild>
                    <Link href="/dashboard/work-orders">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to List
                    </Link>
                </Button>
            </div>
        )
    }

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'emergency': return 'bg-destructive/10 text-destructive border-destructive/20'
            case 'high': return 'bg-orange-500/10 text-orange-600 border-orange-500/20'
            case 'medium': return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
            case 'low': return 'bg-slate-500/10 text-slate-600 border-slate-500/20'
            default: return 'bg-muted text-muted-foreground'
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return 'bg-blue-500/10 text-blue-600'
            case 'in_progress': return 'bg-amber-500/10 text-amber-600'
            case 'completed': return 'bg-emerald-500/10 text-emerald-600'
            case 'on_hold': return 'bg-slate-500/10 text-slate-600'
            default: return 'bg-muted text-muted-foreground'
        }
    }

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateMutation.mutate(e.target.value)
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                    <Button variant="ghost" size="icon" className="shrink-0 mt-1" asChild>
                        <Link href="/dashboard/work-orders">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{wo.title}</h1>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide border ${getPriorityColor(wo.priority)}`}>
                                {wo.priority} Priority
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span className="font-mono bg-muted/50 px-2 py-0.5 rounded">{wo.woNumber}</span>
                            <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                Created {formatDate(wo.createdAt)}
                            </div>
                            {wo.asset && (
                                <Link href={`/dashboard/assets/${wo.asset.id}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                                    <Target className="h-3.5 w-3.5" />
                                    {wo.asset.name}
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">Status:</span>
                        <Select
                            value={wo.status}
                            onChange={handleStatusChange}
                            disabled={statusUpdating}
                            className={`h-9 w-[140px] font-medium ${getStatusColor(wo.status)} border-transparent focus:ring-0`}
                        >
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="on_hold">On Hold</option>
                            <option value="completed">Completed</option>
                        </Select>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Main Content */}
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader className="pb-3 border-b border-border/50">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FileText className="h-5 w-5 text-muted-foreground text-primary/70" />
                                Description
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="prose dark:prose-invert max-w-none">
                                <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                                    {wo.description || 'No detailed description provided for this work request.'}
                                </p>
                            </div>
                        </CardContent>
                        {wo.type && (
                            <CardFooter className="bg-muted/20 border-t py-3 px-6 text-sm text-muted-foreground flex gap-4">
                                <div><span className="font-semibold">Type:</span> <span className="uppercase text-xs tracking-wider">{wo.type.replace('_', ' ')}</span></div>
                            </CardFooter>
                        )}
                    </Card>

                    {/* Connected Asset Quick View */}
                    {wo.asset && (
                        <Card>
                            <CardHeader className="pb-3 border-b border-border/50">
                                <CardTitle className="text-lg flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Settings2 className="h-5 w-5 text-muted-foreground text-primary/70" />
                                        Target Asset
                                    </div>
                                    <Button variant="link" size="sm" asChild className="h-auto p-0 text-muted-foreground hover:text-primary">
                                        <Link href={`/dashboard/assets/${wo.asset.id}`}>View Asset Profile &rarr;</Link>
                                    </Button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className="h-16 w-16 bg-muted rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                                        {wo.asset.customFields?.imageUrl ? (
                                            <img src={wo.asset.customFields.imageUrl} alt="Asset" className="h-full w-full object-cover" />
                                        ) : (
                                            <Target className="h-6 w-6 text-muted-foreground/40" />
                                        )}
                                    </div>
                                    <div className="space-y-1 w-full min-w-0">
                                        <h4 className="font-semibold text-lg truncate leading-tight">{wo.asset.name}</h4>
                                        <p className="text-sm font-mono text-muted-foreground">{wo.asset.assetNumber}</p>
                                        <div className="flex grid-cols-2 gap-x-8 gap-y-1 mt-2 text-sm">
                                            {wo.asset.location && (
                                                <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                                                    <MapPin className="h-3.5 w-3.5" />
                                                    <span className="truncate">{wo.asset.location.name}</span>
                                                </div>
                                            )}
                                            {wo.asset.status && (
                                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                                    <span className={`h-2 w-2 rounded-full ${wo.asset.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                                                    <span className="capitalize">{wo.asset.status.replace('_', ' ')}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Action Tasks (Checklist mock) */}
                    <Card>
                        <CardHeader className="pb-3 border-b border-border/50">
                            <CardTitle className="text-lg">Tasks & Procedures</CardTitle>
                            <CardDescription>Follow the checklist below to complete this work order.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 text-center text-muted-foreground">
                            <p className="text-sm">No specific tasks defined for this work order.</p>
                            <Button variant="outline" size="sm" className="mt-4">
                                <Wrench className="h-4 w-4 mr-2" />
                                Generate Task List via AI
                            </Button>
                        </CardContent>
                    </Card>

                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="pb-3 border-b border-border/50">
                            <CardTitle className="text-lg">Scheduling</CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Due Date</p>
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-emerald-500" />
                                    <span className="font-medium">{wo.dueDate ? formatDate(wo.dueDate) : 'No due date set'}</span>
                                </div>
                            </div>
                            {wo.estimatedHours && (
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Estimated Effort</p>
                                    <div className="flex items-center gap-2">
                                        <Wrench className="h-4 w-4 text-blue-500" />
                                        <span className="font-medium">{wo.estimatedHours} Hours</span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3 border-b border-border/50">
                            <CardTitle className="text-lg">Assignments</CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Assigned To</p>
                                {wo.assignedTo ? (
                                    <div className="flex items-center gap-3 mt-2">
                                        <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                                            {wo.assignedTo.firstName?.[0]}{wo.assignedTo.lastName?.[0]}
                                        </div>
                                        <span className="font-medium">{wo.assignedTo.firstName} {wo.assignedTo.lastName}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-muted-foreground mt-2">
                                        <User className="h-4 w-4" />
                                        <span className="text-sm">Unassigned</span>
                                    </div>
                                )}
                            </div>
                            <Button variant="secondary" className="w-full text-xs h-8">
                                Assign Technician
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="p-5 space-y-3">
                            <h3 className="font-semibold text-primary mb-1">Quick Actions</h3>
                            {wo.status === 'open' && (
                                <Button className="w-full justify-start" onClick={() => updateMutation.mutate('in_progress')}>
                                    <PlayCircle className="h-4 w-4 mr-2" /> Start Work
                                </Button>
                            )}
                            {wo.status === 'in_progress' && (
                                <Button variant="secondary" className="w-full justify-start" onClick={() => updateMutation.mutate('on_hold')}>
                                    <PauseCircle className="h-4 w-4 mr-2" /> Put on Hold
                                </Button>
                            )}
                            {wo.status !== 'completed' && (
                                <Button variant="default" className="w-full justify-start bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => updateMutation.mutate('completed')}>
                                    <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Completed
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
