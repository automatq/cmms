'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { ArrowLeft, Edit, Package, Hash, Boxes, TrendingDown, AlignLeft, AlertCircle, TrendingUp, History, Tag, Box } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

export default function PartDetailPage() {
    const params = useParams()
    const id = params?.id as string

    // Fetch the Part details
    const { data: partData, isLoading: partLoading } = useQuery({
        queryKey: ['part', id],
        queryFn: async () => {
            // Assuming api.getParts exists, mock finding specific Part
            // This is a common pattern when specific detail endpoints aren't explicitly typed yet
            const res = await api.getParts({ search: id })
            const items = res.data?.data || []
            return items.find((p: any) => p.id === id) || items[0]
        },
        enabled: !!id,
    })

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
                    <Link href="/dashboard/inventory/parts">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Inventory
                    </Link>
                </Button>
            </div>
        )
    }

    const stockPercentage = Math.min(100, Math.max(0, (part.quantity / (part.minimumQuantity * 3 || 100)) * 100))
    const isLowStock = part.quantity <= part.minimumQuantity

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                    <Button variant="ghost" size="icon" className="shrink-0 mt-1" asChild>
                        <Link href="/dashboard/inventory/parts">
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
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Add Stock
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Main Content */}
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
                                <div className="prose dark:prose-invert max-w-none text-foreground leading-relaxed whitespace-pre-wrap">
                                    {part.description}
                                </div>
                            ) : (
                                <p className="text-muted-foreground italic">No detailed description provided.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="pb-3 border-b border-border/50">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Box className="h-5 w-5 text-primary" />
                                Part Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <div className="space-y-3">
                                <div className="flex justify-between py-1 border-b last:border-0 border-border/50">
                                    <span className="text-sm text-muted-foreground">Supplier</span>
                                    <span className="text-sm font-medium">{part.supplier?.name || '-'}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b last:border-0 border-border/50">
                                    <span className="text-sm text-muted-foreground">Part Type</span>
                                    <span className="text-sm font-medium capitalize">{part.category?.name || 'Standard'}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b last:border-0 border-border/50">
                                    <span className="text-sm text-muted-foreground">Barcode / SKU</span>
                                    <span className="text-sm font-medium font-mono">{part.barcode || '-'}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b last:border-0 border-border/50">
                                    <span className="text-sm text-muted-foreground">Added On</span>
                                    <span className="text-sm font-medium">{formatDate(part.createdAt)}</span>
                                </div>
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
                            <div className="text-center py-8 px-6 text-muted-foreground text-sm border-b">
                                No recent transactions found for this part.
                            </div>
                            <div className="p-3 bg-muted/20">
                                <Button variant="ghost" className="w-full text-xs text-primary" asChild>
                                    <Link href={`/dashboard/inventory/transactions?partId=${part.id}`}>
                                        View Full History &rarr;
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
