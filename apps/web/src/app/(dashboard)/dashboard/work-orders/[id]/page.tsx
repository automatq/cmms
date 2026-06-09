'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import Link from 'next/link'
import {
  ArrowLeft, Clock, Wrench, MapPin, Target, FileText,
  Settings2, Plus, Trash2, Upload, Download,
  DollarSign, Paperclip, ClipboardCheck, Users, File as FileIcon,
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'
import { getWorkOrderStatusMeta, getWorkOrderPriorityMeta, type WorkOrderStatus } from '@/lib/status'
import { StatusBadge } from '@/components/ui/status-badge'
import { StatusTransitionControl } from '@/components/work-orders/status-transition-control'
import { celebrate } from '@/lib/confetti'
import { CommentsSection } from '@/components/work-orders/comments-section'
import { TimeLogSection } from '@/components/work-orders/time-log-section'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { SignaturePad } from '@/components/work-orders/signature-pad'

export default function WorkOrderDetailPage() {
    const params = useParams()
    const router = useRouter()
    const queryClient = useQueryClient()
    const id = params?.id as string

    const { data: woData, isLoading: woLoading } = useQuery({
        queryKey: ['work-order', id],
        queryFn: async () => {
            const res = await api.getWorkOrder(id)
            return res.data
        },
        enabled: !!id,
    })

    const [statusUpdating, setStatusUpdating] = useState(false)
    const [activeTab, setActiveTab] = useState('labor')
    const [showLaborDialog, setShowLaborDialog] = useState(false)
    const [showPartDialog, setShowPartDialog] = useState(false)
    const [showSignatureDialog, setShowSignatureDialog] = useState(false)
    const [showCancelDialog, setShowCancelDialog] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Labor form state
    const [laborForm, setLaborForm] = useState({ userId: '', hours: '', hourlyRate: '', notes: '' })
    // Part form state
    const [partForm, setPartForm] = useState({ partId: '', qtyUsed: '', unitCost: '', storeroomId: '' })
    // Checklist state
    const [checklistItems, setChecklistItems] = useState<any[]>([])
    const [checklistInitialized, setChecklistInitialized] = useState(false)

    // Lookup data
    const { data: usersData } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const res = await api.getUsers({ limit: 200 })
            return res.data?.data || res.data || []
        },
    })

    const { data: partsData } = useQuery({
        queryKey: ['parts-lookup'],
        queryFn: async () => {
            const res = await api.getParts({ limit: 200 })
            return res.data?.data || res.data || []
        },
    })

    const { data: storeroomsData } = useQuery({
        queryKey: ['storerooms'],
        queryFn: async () => {
            const res = await api.getStorerooms()
            return res.data || []
        },
    })

    const updateMutation = useMutation({
        mutationFn: async (newStatus: string) => {
            await api.updateWorkOrderStatus(id, newStatus)
            return newStatus
        },
        onMutate: async (newStatus) => {
            setStatusUpdating(true)
            await queryClient.cancelQueries({ queryKey: ['work-order', id] })
            const previous = queryClient.getQueryData(['work-order', id])
            queryClient.setQueryData(['work-order', id], (old: any) => ({ ...old, status: newStatus }))
            return { previous }
        },
        onSuccess: (newStatus) => {
            if (newStatus === 'completed') celebrate()
        },
        onError: (err: any, _newStatus, context) => {
            // Roll back the optimistic badge immediately so the user doesn't
            // see it flicker to the new status and then snap back.
            if (context?.previous) {
                queryClient.setQueryData(['work-order', id], context.previous)
            }
            const msg = err.response?.data?.message || err.message || 'Failed to update status'
            toast.error(Array.isArray(msg) ? msg.join(', ') : msg)
        },
        onSettled: () => {
            setStatusUpdating(false)
            queryClient.invalidateQueries({ queryKey: ['work-order', id] })
            queryClient.invalidateQueries({ queryKey: ['work-orders'] })
        }
    })

    // Surface backend error messages instead of swallowing them behind a
    // generic toast. Mirrors the pattern used in csv-import-dialog.tsx.
    const errorToast = (fallback: string) => (err: any) => {
        const msg = err.response?.data?.message || err.message || fallback
        toast.error(Array.isArray(msg) ? msg.join(', ') : msg)
    }

    // Labor mutations
    const addLaborMutation = useMutation({
        mutationFn: (data: any) => api.addWorkOrderLabor(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-order', id] })
            setShowLaborDialog(false)
            setLaborForm({ userId: '', hours: '', hourlyRate: '', notes: '' })
            toast.success('Labor entry added')
        },
        onError: errorToast('Failed to add labor entry'),
    })

    const removeLaborMutation = useMutation({
        mutationFn: (laborId: string) => api.removeWorkOrderLabor(id, laborId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-order', id] })
            toast.success('Labor entry removed')
        },
        onError: errorToast('Failed to remove labor entry'),
    })

    // Part mutations
    const addPartMutation = useMutation({
        mutationFn: (data: any) => api.addWorkOrderPart(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-order', id] })
            setShowPartDialog(false)
            setPartForm({ partId: '', qtyUsed: '', unitCost: '', storeroomId: '' })
            toast.success('Part added')
        },
        onError: errorToast('Failed to add part'),
    })

    const removePartMutation = useMutation({
        mutationFn: (partId: string) => api.removeWorkOrderPart(id, partId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-order', id] })
            toast.success('Part removed')
        },
        onError: errorToast('Failed to remove part'),
    })

    // Attachment mutations
    const uploadAttachmentMutation = useMutation({
        mutationFn: (file: File) => api.addWorkOrderAttachment(id, file),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-order', id] })
            toast.success('File uploaded')
        },
        onError: errorToast('Failed to upload file'),
    })

    const removeAttachmentMutation = useMutation({
        mutationFn: (attachmentId: string) => api.removeWorkOrderAttachment(id, attachmentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-order', id] })
            toast.success('Attachment removed')
        },
        onError: errorToast('Failed to remove attachment'),
    })

    // Signature mutations
    const signatureMutation = useMutation({
        mutationFn: (base64png: string) => api.uploadSignature(id, base64png),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-order', id] })
            setShowSignatureDialog(false)
            toast.success('Signature saved')
        },
        onError: errorToast('Failed to save signature'),
    })

    const wo = woData

    const { data: signatureData } = useQuery({
        queryKey: ['work-order', id, 'signature'],
        queryFn: () => api.getSignature(id).then((r) => r.data),
        enabled: !!wo?.completionSignature,
    })

    // Checklist mutations
    const saveChecklistMutation = useMutation({
        mutationFn: (items: any[]) => api.saveWorkOrderChecklist(id, { items }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-order', id] })
            toast.success('Checklist saved')
        },
        onError: errorToast('Failed to save checklist'),
    })

    // Initialize checklist from WO data
    if (wo && !checklistInitialized && wo.checklistResults?.length > 0) {
        setChecklistItems(wo.checklistResults.map((item: any, idx: number) => ({
            stepIndex: item.stepIndex ?? idx,
            instruction: item.instruction || item.task || `Step ${idx + 1}`,
            isCompleted: item.isCompleted || false,
            value: item.value || '',
            passFail: item.passFail ?? null,
            notes: item.notes || '',
            requiresValue: item.requiresValue || false,
            hasPassFail: item.passFail !== undefined || item.hasPassFail,
            photoKey: item.photoKey || '',
        })))
        setChecklistInitialized(true)
    }

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
                <p className="text-muted-foreground mb-6">This work order does not exist or you don&apos;t have permission to view it.</p>
                <Button asChild>
                    <Link href="/dashboard/work-orders">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to List
                    </Link>
                </Button>
            </div>
        )
    }

    // Route a chosen transition: completion captures a signature, cancellation
    // confirms first; everything else applies directly.
    const onSelectStatus = (target: WorkOrderStatus) => {
        if (target === 'completed') {
            setShowSignatureDialog(true)
            return
        }
        if (target === 'cancelled') {
            setShowCancelDialog(true)
            return
        }
        updateMutation.mutate(target)
    }

    const handleAddLabor = (e: React.FormEvent) => {
        e.preventDefault()
        addLaborMutation.mutate({
            userId: laborForm.userId,
            hours: parseFloat(laborForm.hours),
            hourlyRate: laborForm.hourlyRate ? parseFloat(laborForm.hourlyRate) : undefined,
            notes: laborForm.notes || undefined,
        })
    }

    const handleAddPart = (e: React.FormEvent) => {
        e.preventDefault()
        addPartMutation.mutate({
            partId: partForm.partId,
            qtyUsed: parseFloat(partForm.qtyUsed),
            unitCost: partForm.unitCost ? parseFloat(partForm.unitCost) : undefined,
            storeroomId: partForm.storeroomId || undefined,
        })
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) uploadAttachmentMutation.mutate(file)
        e.target.value = ''
    }

    const handleDownloadAttachment = async (attachmentId: string) => {
        try {
            const res = await api.getWorkOrderAttachmentUrl(id, attachmentId)
            const url = res.data?.url || res.data
            if (url) window.open(url, '_blank')
        } catch {
            toast.error('Failed to get download link')
        }
    }

    // Labor totals
    const laborEntries = wo.labor || []
    const totalLaborHours = laborEntries.reduce((sum: number, l: any) => sum + Number(l.hours || 0), 0)
    const totalLaborCost = laborEntries.reduce((sum: number, l: any) => sum + (Number(l.hours || 0) * Number(l.hourlyRate || 0)), 0)

    // Parts totals
    const partEntries = wo.parts || []
    const totalPartsCost = partEntries.reduce((sum: number, p: any) => sum + (Number(p.qtyUsed || 0) * Number(p.unitCost || 0)), 0)

    // Attachments
    const attachments = wo.attachments || []

    // Checklist progress
    const completedSteps = checklistItems.filter((i: any) => i.isCompleted).length
    const totalSteps = checklistItems.length
    const checklistProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0

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
                            <StatusBadge meta={getWorkOrderStatusMeta(wo.status)} icon uppercase />
                            <StatusBadge meta={getWorkOrderPriorityMeta(wo.priority)} uppercase />
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
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Main Content */}
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader className="pb-3 border-b border-border/50">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary/70" />
                                Description
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                                {wo.description || 'No detailed description provided for this work request.'}
                            </p>
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
                                        <Settings2 className="h-5 w-5 text-primary/70" />
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
                                        <div className="flex gap-x-8 gap-y-1 mt-2 text-sm">
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

                    {/* Tabs: Labor, Parts, Attachments, Checklist */}
                    <Card>
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                            <CardHeader className="pb-0 border-b border-border/50">
                                <TabsList className="w-full justify-start bg-transparent p-0 h-auto gap-0">
                                    <TabsTrigger value="labor" className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3">
                                        <Users className="h-4 w-4" />
                                        Labor ({laborEntries.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="parts" className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3">
                                        <Wrench className="h-4 w-4" />
                                        Parts ({partEntries.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="attachments" className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3">
                                        <Paperclip className="h-4 w-4" />
                                        Files ({attachments.length})
                                    </TabsTrigger>
                                    {checklistItems.length > 0 && (
                                        <TabsTrigger value="checklist" className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3">
                                            <ClipboardCheck className="h-4 w-4" />
                                            Checklist ({completedSteps}/{totalSteps})
                                        </TabsTrigger>
                                    )}
                                </TabsList>
                            </CardHeader>

                            {/* Labor Tab */}
                            <TabsContent value="labor" className="m-0">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-sm text-muted-foreground">
                                            {totalLaborHours > 0 && (
                                                <span>{totalLaborHours.toFixed(1)} hrs total{totalLaborCost > 0 && ` | ${formatCurrency(totalLaborCost)} cost`}</span>
                                            )}
                                        </div>
                                        <Button size="sm" onClick={() => setShowLaborDialog(true)}>
                                            <Plus className="h-4 w-4 mr-1" /> Add Labor
                                        </Button>
                                    </div>

                                    {laborEntries.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
                                            No labor entries recorded yet
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {laborEntries.map((labor: any) => (
                                                <div key={labor.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary">
                                                            {labor.user?.firstName?.[0]}{labor.user?.lastName?.[0]}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium">{labor.user?.firstName} {labor.user?.lastName}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {labor.hours}h @ {formatCurrency(Number(labor.hourlyRate || 0))}/hr
                                                                {labor.notes && ` — ${labor.notes}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-semibold">{formatCurrency(Number(labor.hours || 0) * Number(labor.hourlyRate || 0))}</span>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLaborMutation.mutate(labor.id)}>
                                                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </TabsContent>

                            {/* Parts Tab */}
                            <TabsContent value="parts" className="m-0">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-sm text-muted-foreground">
                                            {totalPartsCost > 0 && <span>Total parts cost: {formatCurrency(totalPartsCost)}</span>}
                                        </div>
                                        <Button size="sm" onClick={() => setShowPartDialog(true)}>
                                            <Plus className="h-4 w-4 mr-1" /> Add Part
                                        </Button>
                                    </div>

                                    {partEntries.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
                                            No parts used yet
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {partEntries.map((part: any) => (
                                                <div key={part.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                                    <div>
                                                        <p className="text-sm font-medium">{part.part?.name || part.partName || 'Part'}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Qty: {part.qtyUsed} @ {formatCurrency(Number(part.unitCost || 0))}/ea
                                                            {part.storeroom && ` | ${part.storeroom.name}`}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-semibold">{formatCurrency(Number(part.qtyUsed || 0) * Number(part.unitCost || 0))}</span>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removePartMutation.mutate(part.id)}>
                                                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </TabsContent>

                            {/* Attachments Tab */}
                            <TabsContent value="attachments" className="m-0">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-sm text-muted-foreground">{attachments.length} file(s)</div>
                                        <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadAttachmentMutation.isPending}>
                                            <Upload className="h-4 w-4 mr-1" />
                                            {uploadAttachmentMutation.isPending ? 'Uploading...' : 'Upload'}
                                        </Button>
                                        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                                    </div>

                                    {attachments.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
                                            No attachments yet
                                        </div>
                                    ) : (
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            {attachments.map((att: any) => (
                                                <div key={att.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                                    <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                                                        <FileIcon className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{att.fileName || att.originalName || 'File'}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {att.fileSize ? `${(att.fileSize / 1024).toFixed(1)} KB` : ''} {att.createdAt && `| ${formatDate(att.createdAt)}`}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownloadAttachment(att.id)}>
                                                            <Download className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeAttachmentMutation.mutate(att.id)}>
                                                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </TabsContent>

                            {/* Checklist Tab */}
                            {checklistItems.length > 0 && (
                                <TabsContent value="checklist" className="m-0">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3 flex-1">
                                                <Progress value={checklistProgress} className="flex-1 h-2" />
                                                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                                                    {completedSteps}/{totalSteps}
                                                </span>
                                            </div>
                                            <Button
                                                size="sm"
                                                className="ml-4"
                                                onClick={() => saveChecklistMutation.mutate(checklistItems.map((item) => ({
                                                    stepIndex: item.stepIndex,
                                                    isCompleted: item.isCompleted,
                                                    value: item.value || undefined,
                                                    passFail: item.passFail ?? undefined,
                                                    notes: item.notes || undefined,
                                                    photoKey: item.photoKey || undefined,
                                                })))}
                                                disabled={saveChecklistMutation.isPending}
                                            >
                                                {saveChecklistMutation.isPending ? 'Saving...' : 'Save'}
                                            </Button>
                                        </div>

                                        <div className="space-y-3">
                                            {checklistItems.map((item, idx) => (
                                                <div key={idx} className={`p-3 rounded-lg border ${item.isCompleted ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800' : 'bg-muted/30'}`}>
                                                    <div className="flex items-start gap-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={item.isCompleted}
                                                            onChange={(e) => {
                                                                const updated = [...checklistItems]
                                                                updated[idx] = { ...updated[idx], isCompleted: e.target.checked }
                                                                setChecklistItems(updated)
                                                            }}
                                                            className="mt-1 h-4 w-4 rounded border-primary text-primary"
                                                        />
                                                        <div className="flex-1 space-y-2">
                                                            <p className={`text-sm font-medium ${item.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                                                {item.instruction}
                                                            </p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {item.requiresValue && (
                                                                    <Input
                                                                        placeholder="Enter value..."
                                                                        value={item.value}
                                                                        onChange={(e) => {
                                                                            const updated = [...checklistItems]
                                                                            updated[idx] = { ...updated[idx], value: e.target.value }
                                                                            setChecklistItems(updated)
                                                                        }}
                                                                        className="h-8 w-32 text-sm"
                                                                    />
                                                                )}
                                                                {item.hasPassFail && (
                                                                    <div className="flex gap-1">
                                                                        <Button
                                                                            type="button"
                                                                            variant={item.passFail === true ? 'default' : 'outline'}
                                                                            size="sm"
                                                                            className="h-7 text-xs"
                                                                            onClick={() => {
                                                                                const updated = [...checklistItems]
                                                                                updated[idx] = { ...updated[idx], passFail: true }
                                                                                setChecklistItems(updated)
                                                                            }}
                                                                        >
                                                                            Pass
                                                                        </Button>
                                                                        <Button
                                                                            type="button"
                                                                            variant={item.passFail === false ? 'destructive' : 'outline'}
                                                                            size="sm"
                                                                            className="h-7 text-xs"
                                                                            onClick={() => {
                                                                                const updated = [...checklistItems]
                                                                                updated[idx] = { ...updated[idx], passFail: false }
                                                                                setChecklistItems(updated)
                                                                            }}
                                                                        >
                                                                            Fail
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <Input
                                                                placeholder="Notes..."
                                                                value={item.notes}
                                                                onChange={(e) => {
                                                                    const updated = [...checklistItems]
                                                                    updated[idx] = { ...updated[idx], notes: e.target.value }
                                                                    setChecklistItems(updated)
                                                                }}
                                                                className="h-7 text-xs"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </TabsContent>
                            )}
                        </Tabs>
                    </Card>

                    <TimeLogSection workOrderId={id} />

                    <CommentsSection workOrderId={id} />
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {(totalLaborCost > 0 || totalPartsCost > 0) && (
                        <Card>
                            <CardHeader className="pb-3 border-b border-border/50">
                                <CardTitle className="text-lg">Cost</CardTitle>
                            </CardHeader>
                            <CardContent className="p-5 space-y-4">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Cost</p>
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4 text-emerald-500" />
                                        <span className="font-medium">{formatCurrency(totalLaborCost + totalPartsCost)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="p-5 space-y-3">
                            <h3 className="font-semibold text-primary mb-1">Status</h3>

                            {/* Single transition control — renders only valid next
                                states per apps/api/.../state-machine.ts (mirrored in
                                lib/status.ts). Completion routes through the signature
                                dialog; cancel through a confirm dialog. */}
                            <StatusTransitionControl
                                status={wo.status}
                                disabled={statusUpdating}
                                onSelect={onSelectStatus}
                            />

                            {wo.status === 'completed' && wo.completionSignature && signatureData?.signatureUrl && (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-muted-foreground">Completion Signature</p>
                                    <img src={signatureData.signatureUrl} alt="Completion signature" className="border rounded-lg w-full" />
                                    {wo.signedOffAt && (
                                        <p className="text-xs text-muted-foreground">
                                            Signed {new Date(wo.signedOffAt).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Add Labor Dialog */}
            <Dialog open={showLaborDialog} onOpenChange={setShowLaborDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Labor Entry</DialogTitle>
                        <DialogDescription>Record time spent by a technician on this work order.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddLabor} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Technician *</Label>
                            <Select value={laborForm.userId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLaborForm({ ...laborForm, userId: e.target.value })} required>
                                <option value="">Select technician...</option>
                                {(Array.isArray(usersData) ? usersData : []).map((u: any) => (
                                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                                ))}
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Hours *</Label>
                                <Input type="number" step="0.25" min="0.01" value={laborForm.hours} onChange={(e) => setLaborForm({ ...laborForm, hours: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Hourly Rate</Label>
                                <Input type="number" step="0.01" value={laborForm.hourlyRate} onChange={(e) => setLaborForm({ ...laborForm, hourlyRate: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Input value={laborForm.notes} onChange={(e) => setLaborForm({ ...laborForm, notes: e.target.value })} placeholder="Optional notes..." />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={addLaborMutation.isPending}>
                                {addLaborMutation.isPending ? 'Adding...' : 'Add Labor'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Add Part Dialog */}
            <Dialog open={showPartDialog} onOpenChange={setShowPartDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Part</DialogTitle>
                        <DialogDescription>Record a part used on this work order.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddPart} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Part *</Label>
                            <Select
                                value={partForm.partId}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                    const selectedPart = (Array.isArray(partsData) ? partsData : []).find((p: any) => p.id === e.target.value)
                                    setPartForm({
                                        ...partForm,
                                        partId: e.target.value,
                                        unitCost: selectedPart?.unitCost ? String(selectedPart.unitCost) : partForm.unitCost,
                                    })
                                }}
                                required
                            >
                                <option value="">Select part...</option>
                                {(Array.isArray(partsData) ? partsData : []).map((p: any) => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.sku || p.partNumber})</option>
                                ))}
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Quantity *</Label>
                                <Input type="number" step="0.01" min="0.01" value={partForm.qtyUsed} onChange={(e) => setPartForm({ ...partForm, qtyUsed: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Unit Cost</Label>
                                <Input type="number" step="0.01" value={partForm.unitCost} onChange={(e) => setPartForm({ ...partForm, unitCost: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Storeroom</Label>
                            <Select value={partForm.storeroomId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPartForm({ ...partForm, storeroomId: e.target.value })}>
                                <option value="">Select storeroom...</option>
                                {(Array.isArray(storeroomsData) ? storeroomsData : []).map((s: any) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={addPartMutation.isPending}>
                                {addPartMutation.isPending ? 'Adding...' : 'Add Part'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Signature Dialog */}
            <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Complete Work Order</DialogTitle>
                        <DialogDescription>Add your signature to confirm work order completion.</DialogDescription>
                    </DialogHeader>
                    <SignaturePad
                        onSave={(base64png) => {
                            signatureMutation.mutate(base64png, {
                                onSuccess: () => {
                                    updateMutation.mutate('completed')
                                },
                            })
                        }}
                        onCancel={() => setShowSignatureDialog(false)}
                        disabled={signatureMutation.isPending}
                    />
                    <div className="text-center">
                        <button
                            className="text-sm text-muted-foreground underline"
                            onClick={() => {
                                setShowSignatureDialog(false)
                                updateMutation.mutate('completed')
                            }}
                        >
                            Skip signature and complete
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Cancel confirmation */}
            <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel this work order?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Reserved inventory will be released. This can be reopened later if needed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep work order</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => updateMutation.mutate('cancelled')}
                        >
                            Cancel work order
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
