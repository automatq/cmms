'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { ArrowLeft, Inbox, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
    pending: { label: 'Pending', variant: 'outline', icon: Clock },
    approved: { label: 'Approved', variant: 'default', icon: CheckCircle2 },
    rejected: { label: 'Rejected', variant: 'destructive', icon: XCircle },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
    low: { label: 'Low', color: 'text-blue-600 bg-blue-50' },
    medium: { label: 'Medium', color: 'text-amber-600 bg-amber-50' },
    high: { label: 'High', color: 'text-orange-600 bg-orange-50' },
    critical: { label: 'Critical', color: 'text-red-600 bg-red-50' },
}

export default function WorkRequestsPage() {
    const queryClient = useQueryClient()
    const [rejectDialogId, setRejectDialogId] = useState<string | null>(null)
    const [rejectReason, setRejectReason] = useState('')
    const [filter, setFilter] = useState<string>('pending')

    // Fetch all requests, filter client-side. The API's WorkOrderQueryDto only
    // accepts WorkOrderStatus enum values; work_requests use a different status enum
    // (pending/approved/rejected), so passing it as a query param gets rejected.
    const { data, isLoading } = useQuery({
        queryKey: ['work-requests'],
        queryFn: async () => {
            const res = await api.getWorkRequests()
            return res.data?.data || res.data || []
        },
    })

    const approveMutation = useMutation({
        mutationFn: (id: string) => api.approveWorkRequest(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-requests'] })
            toast.success('Work request approved — work order created')
        },
        onError: () => toast.error('Failed to approve work request'),
    })

    const rejectMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) => api.rejectWorkRequest(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-requests'] })
            setRejectDialogId(null)
            setRejectReason('')
            toast.success('Work request rejected')
        },
        onError: () => toast.error('Failed to reject work request'),
    })

    const allRequests = Array.isArray(data) ? data : []
    const requests = filter ? allRequests.filter((r: any) => r.status === filter) : allRequests

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/dashboard/work-orders">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Inbox className="h-8 w-8 text-primary" />
                            Work Requests
                        </h1>
                        <p className="text-muted-foreground">Review and process incoming maintenance requests.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {['pending', 'approved', 'rejected', ''].map(f => (
                        <Button
                            key={f || 'all'}
                            variant={filter === f ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilter(f)}
                        >
                            {f || 'All'}
                        </Button>
                    ))}
                </div>
            </div>

            {requests.length === 0 && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold">No work requests</h3>
                        <p className="text-muted-foreground text-sm">
                            {filter ? `No ${filter} requests found.` : 'No requests have been submitted yet.'}
                        </p>
                    </CardContent>
                </Card>
            )}

            <div className="space-y-3">
                {requests.map((req: any) => {
                    const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending
                    const priorityCfg = PRIORITY_CONFIG[req.priority] || PRIORITY_CONFIG.medium
                    const StatusIcon = statusCfg.icon

                    return (
                        <Card key={req.id} className="hover:border-primary/50 transition-colors">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-sm font-semibold truncate">{req.title}</h3>
                                            <Badge variant={statusCfg.variant} className="shrink-0">
                                                <StatusIcon className="h-3 w-3 mr-1" />
                                                {statusCfg.label}
                                            </Badge>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityCfg.color}`}>
                                                {priorityCfg.label}
                                            </span>
                                        </div>
                                        {req.description && (
                                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{req.description}</p>
                                        )}
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                            {req.submittedBy && <span>From: {req.submittedBy}</span>}
                                            {req.submitterEmail && <span>{req.submitterEmail}</span>}
                                            {req.createdAt && <span>{format(new Date(req.createdAt), 'MMM d, yyyy h:mm a')}</span>}
                                            {req.asset && <span>Asset: {req.asset.name}</span>}
                                            {req.location && <span>Location: {req.location.name}</span>}
                                        </div>
                                    </div>
                                    {req.status === 'pending' && (
                                        <div className="flex gap-2 shrink-0">
                                            <Button
                                                size="sm"
                                                onClick={() => approveMutation.mutate(req.id)}
                                                disabled={approveMutation.isPending}
                                            >
                                                <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => { setRejectDialogId(req.id); setRejectReason('') }}
                                            >
                                                <XCircle className="h-4 w-4 mr-1" /> Reject
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            <Dialog open={!!rejectDialogId} onOpenChange={(open: boolean) => { if (!open) setRejectDialogId(null) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Work Request</DialogTitle>
                        <DialogDescription>Provide a reason for rejecting this request.</DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault()
                            if (rejectDialogId && rejectReason.trim()) rejectMutation.mutate({ id: rejectDialogId, reason: rejectReason })
                        }}
                    >
                        <div className="space-y-2">
                            <Input
                                placeholder="Reason for rejection..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setRejectDialogId(null)}>Cancel</Button>
                            <Button
                                type="submit"
                                variant="destructive"
                                disabled={!rejectReason.trim() || rejectMutation.isPending}
                            >
                                {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
