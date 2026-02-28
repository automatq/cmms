'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
    ArrowLeft, Edit, Package, Hash, Boxes, TrendingUp, AlignLeft,
    AlertCircle, History, Tag, Box, ChevronDown, ArrowDownToLine,
    ArrowUpFromLine, RefreshCcw, ArrowLeftRight,
} from 'lucide-react'
import { useParams } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useState } from 'react'
import { toast } from 'sonner'

type StockOp = 'receive' | 'issue' | 'adjust' | 'transfer' | null

export default function PartDetailPage() {
    const params = useParams()
    const queryClient = useQueryClient()
    const id = params?.id as string

    const [stockOp, setStockOp] = useState<StockOp>(null)
    const [showOpMenu, setShowOpMenu] = useState(false)
    const [stockForm, setStockForm] = useState({
        storeroomId: '', qty: '', unitCost: '', notes: '', reason: '',
        fromStoreroomId: '', toStoreroomId: '',
    })

    const { data: partData, isLoading: partLoading } = useQuery({
        queryKey: ['part', id],
        queryFn: async () => {
            const res = await api.getPart(id)
            return res.data
        },
        enabled: !!id,
    })

    const { data: transactions } = useQuery({
        queryKey: ['inventory-transactions', id],
        queryFn: async () => {
            const res = await api.getInventoryTransactions({ partId: id, limit: 5 })
            return res.data?.data || res.data || []
        },
        enabled: !!id,
    })

    const { data: storerooms } = useQuery({
        queryKey: ['storerooms'],
        queryFn: async () => {
            const res = await api.getStorerooms()
            return res.data || []
        },
    })

    const stockMutation = useMutation({
        mutationFn: async (data: { op: StockOp; payload: any }) => {
            switch (data.op) {
                case 'receive': return api.receiveStock(data.payload)
                case 'issue': return api.issueStock(data.payload)
                case 'adjust': return api.adjustStock(data.payload)
                case 'transfer': return api.transferStock(data.payload)
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['part', id] })
            queryClient.invalidateQueries({ queryKey: ['inventory-transactions', id] })
            queryClient.invalidateQueries({ queryKey: ['parts'] })
            setStockOp(null)
            setStockForm({ storeroomId: '', qty: '', unitCost: '', notes: '', reason: '', fromStoreroomId: '', toStoreroomId: '' })
            toast.success('Stock operation completed')
        },
        onError: (error: any) => {
            const msg = error.response?.data?.message
            toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Stock operation failed')
        },
    })

    const handleStockSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const base = { partId: id }
        switch (stockOp) {
            case 'receive':
                stockMutation.mutate({ op: 'receive', payload: { ...base, storeroomId: stockForm.storeroomId, qty: parseInt(stockForm.qty), unitCost: stockForm.unitCost ? parseFloat(stockForm.unitCost) : undefined, notes: stockForm.notes || undefined } })
                break
            case 'issue':
                stockMutation.mutate({ op: 'issue', payload: { ...base, storeroomId: stockForm.storeroomId, qty: parseInt(stockForm.qty), notes: stockForm.notes || undefined } })
                break
            case 'adjust':
                stockMutation.mutate({ op: 'adjust', payload: { ...base, storeroomId: stockForm.storeroomId, adjustmentQty: parseInt(stockForm.qty), reason: stockForm.reason } })
                break
            case 'transfer':
                stockMutation.mutate({ op: 'transfer', payload: { ...base, fromStoreroomId: stockForm.fromStoreroomId, toStoreroomId: stockForm.toStoreroomId, qty: parseInt(stockForm.qty), notes: stockForm.notes || undefined } })
                break
        }
    }

    const part = partData

    if (partLoading) {
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
                    <Skeleton className="md:col-span-2 h-[350px] w-full rounded-xl" />
                    <Skeleton className="h-[350px] w-full rounded-xl" />
                </div>
            </div>
        )
    }

    if (!part) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                    <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Part Not Found</h2>
                <p className="text-muted-foreground mb-6">The inventory item you are looking for does not exist.</p>
                <Button asChild>
                    <Link href="/dashboard/inventory">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Inventory
                    </Link>
                </Button>
            </div>
        )
    }

    const stockPercentage = Math.min(100, Math.max(0, (part.quantity / (part.minimumQuantity * 3 || 100)) * 100))
    const isLowStock = part.quantity <= part.minimumQuantity

    const getTransactionBadge = (type: string) => {
        switch (type) {
            case 'receive': return <Badge className="bg-green-100 text-green-700">Receive</Badge>
            case 'issue': return <Badge className="bg-blue-100 text-blue-700">Issue</Badge>
            case 'adjust': return <Badge className="bg-amber-100 text-amber-700">Adjust</Badge>
            case 'transfer': return <Badge className="bg-purple-100 text-purple-700">Transfer</Badge>
            case 'reserve': return <Badge className="bg-cyan-100 text-cyan-700">Reserve</Badge>
            case 'release': return <Badge className="bg-slate-100 text-slate-700">Release</Badge>
            default: return <Badge variant="secondary">{type}</Badge>
        }
    }

    const opLabels: Record<string, { title: string; icon: typeof ArrowDownToLine }> = {
        receive: { title: 'Receive Stock', icon: ArrowDownToLine },
        issue: { title: 'Issue Stock', icon: ArrowUpFromLine },
        adjust: { title: 'Adjust Stock', icon: RefreshCcw },
        transfer: { title: 'Transfer Stock', icon: ArrowLeftRight },
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                    <Button variant="ghost" size="icon" className="shrink-0 mt-1" asChild>
                        <Link href="/dashboard/inventory">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex flex-wrap items-center gap-3 mb-1">
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{part.name}</h1>
                            {isLowStock && (
                                <Badge variant="destructive" className="flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" /> Low Stock
                                </Badge>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <span className="font-mono bg-muted/50 px-2 py-0.5 rounded flex items-center gap-1">
                                <Hash className="h-3.5 w-3.5" />
                                {part.partNumber}
                            </span>
                            <span className="flex items-center gap-1 opacity-80">
                                <Tag className="h-3.5 w-3.5" />
                                {part.category?.name || 'Uncategorized'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 self-start sm:self-auto ml-12 sm:ml-0">
                    <Button variant="outline" asChild>
                        <Link href={`/dashboard/inventory/parts/${part.id}/edit`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Part
                        </Link>
                    </Button>
                    <div className="relative">
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowOpMenu(!showOpMenu)}>
                            <TrendingUp className="h-4 w-4 mr-2" />
                            Stock Operations
                            <ChevronDown className="h-4 w-4 ml-1" />
                        </Button>
                        {showOpMenu && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-background border rounded-lg shadow-lg z-50 py-1">
                                {(['receive', 'issue', 'adjust', 'transfer'] as const).map((op) => {
                                    const info = opLabels[op]
                                    const Icon = info.icon
                                    return (
                                        <button key={op} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left" onClick={() => { setStockOp(op); setShowOpMenu(false) }}>
                                            <Icon className="h-4 w-4" /> {info.title}
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">Current Stock</p>
                                        <p className="text-4xl font-bold">{part.quantity}</p>
                                    </div>
                                    <div className={`p-3 rounded-xl ${isLowStock ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                                        <Boxes className="h-6 w-6" />
                                    </div>
                                </div>
                                <div className="space-y-2 mt-6">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Status</span>
                                        <span className={isLowStock ? 'text-destructive font-medium' : 'text-emerald-500 font-medium'}>
                                            {isLowStock ? 'Reorder needed' : 'Healthy'}
                                        </span>
                                    </div>
                                    <Progress value={stockPercentage} className={`h-2 ${isLowStock ? '[&>div]:bg-destructive' : '[&>div]:bg-emerald-500'}`} />
                                    <div className="flex justify-between text-xs text-muted-foreground pt-1">
                                        <span>Min: {part.minimumQuantity}</span>
                                        <span>Target: {part.minimumQuantity * 3}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                                        <p className="text-4xl font-bold">{formatCurrency(Number(part.unitCost) * Number(part.quantity))}</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
                                        <TrendingUp className="h-6 w-6" />
                                    </div>
                                </div>
                                <div className="space-y-3 mt-6">
                                    <div className="flex justify-between text-sm py-1 border-b">
                                        <span className="text-muted-foreground">Unit Cost</span>
                                        <span className="font-medium">{formatCurrency(Number(part.unitCost))}</span>
                                    </div>
                                    <div className="flex justify-between text-sm py-1 border-b">
                                        <span className="text-muted-foreground">Location</span>
                                        <span className="font-medium">{part.location?.name || 'Unassigned'}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <Card>
                        <CardHeader className="pb-3 border-b border-border/50">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <AlignLeft className="h-5 w-5 text-muted-foreground/70" />
                                Details & Description
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            {part.description ? (
                                <div className="prose dark:prose-invert max-w-none text-foreground leading-relaxed whitespace-pre-wrap">{part.description}</div>
                            ) : (
                                <p className="text-muted-foreground italic">No detailed description provided.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader className="pb-3 border-b border-border/50">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Box className="h-5 w-5 text-primary" />
                                Part Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-3">
                            <div className="flex justify-between py-1 border-b border-border/50">
                                <span className="text-sm text-muted-foreground">Supplier</span>
                                <span className="text-sm font-medium">{part.supplier?.name || '-'}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-border/50">
                                <span className="text-sm text-muted-foreground">Part Type</span>
                                <span className="text-sm font-medium capitalize">{part.category?.name || 'Standard'}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-border/50">
                                <span className="text-sm text-muted-foreground">Barcode / SKU</span>
                                <span className="text-sm font-medium font-mono">{part.barcode || '-'}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-border/50">
                                <span className="text-sm text-muted-foreground">Added On</span>
                                <span className="text-sm font-medium">{formatDate(part.createdAt)}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3 border-b border-border/50">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <History className="h-5 w-5 text-muted-foreground" />
                                Recent Transactions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {Array.isArray(transactions) && transactions.length > 0 ? (
                                <div className="divide-y">
                                    {transactions.map((tx: any) => (
                                        <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                {getTransactionBadge(tx.transactionType || tx.type)}
                                                <p className="text-sm font-medium">{tx.qty > 0 ? '+' : ''}{tx.qty || tx.adjustmentQty}</p>
                                            </div>
                                            <span className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 px-6 text-muted-foreground text-sm border-b">
                                    No recent transactions found for this part.
                                </div>
                            )}
                            <div className="p-3 bg-muted/20">
                                <Button variant="ghost" className="w-full text-xs text-primary" asChild>
                                    <Link href={`/dashboard/inventory/transactions?partId=${part.id}`}>View Full History &rarr;</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Stock Operation Dialog */}
            <Dialog open={!!stockOp} onOpenChange={(open) => !open && setStockOp(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{stockOp ? opLabels[stockOp].title : ''}</DialogTitle>
                        <DialogDescription>
                            {stockOp === 'receive' && 'Add stock received from a supplier into a storeroom.'}
                            {stockOp === 'issue' && 'Issue stock out of a storeroom.'}
                            {stockOp === 'adjust' && 'Adjust stock levels with a positive or negative quantity.'}
                            {stockOp === 'transfer' && 'Transfer stock between storerooms.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleStockSubmit} className="space-y-4">
                        {stockOp === 'transfer' ? (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>From Storeroom *</Label>
                                    <Select value={stockForm.fromStoreroomId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStockForm({ ...stockForm, fromStoreroomId: e.target.value })} required>
                                        <option value="">Select...</option>
                                        {(Array.isArray(storerooms) ? storerooms : []).map((s: any) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>To Storeroom *</Label>
                                    <Select value={stockForm.toStoreroomId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStockForm({ ...stockForm, toStoreroomId: e.target.value })} required>
                                        <option value="">Select...</option>
                                        {(Array.isArray(storerooms) ? storerooms : []).map((s: any) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </Select>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label>Storeroom *</Label>
                                <Select value={stockForm.storeroomId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStockForm({ ...stockForm, storeroomId: e.target.value })} required>
                                    <option value="">Select storeroom...</option>
                                    {(Array.isArray(storerooms) ? storerooms : []).map((s: any) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </Select>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{stockOp === 'adjust' ? 'Adjustment Qty *' : 'Quantity *'}</Label>
                                <Input type="number" value={stockForm.qty} onChange={(e) => setStockForm({ ...stockForm, qty: e.target.value })} placeholder={stockOp === 'adjust' ? 'e.g. -5 or +10' : '0'} required />
                            </div>
                            {stockOp === 'receive' && (
                                <div className="space-y-2">
                                    <Label>Unit Cost</Label>
                                    <Input type="number" step="0.01" value={stockForm.unitCost} onChange={(e) => setStockForm({ ...stockForm, unitCost: e.target.value })} placeholder="0.00" />
                                </div>
                            )}
                        </div>
                        {stockOp === 'adjust' ? (
                            <div className="space-y-2">
                                <Label>Reason *</Label>
                                <Input value={stockForm.reason} onChange={(e) => setStockForm({ ...stockForm, reason: e.target.value })} placeholder="Reason for adjustment..." required />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <Input value={stockForm.notes} onChange={(e) => setStockForm({ ...stockForm, notes: e.target.value })} placeholder="Optional notes..." />
                            </div>
                        )}
                        <DialogFooter>
                            <Button type="submit" disabled={stockMutation.isPending}>
                                {stockMutation.isPending ? 'Processing...' : 'Submit'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
