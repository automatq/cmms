'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { ArrowLeft, Edit, MapPin, Tag, Image as ImageIcon, ClipboardList, Clock, Activity, Calendar } from 'lucide-react'
import { useParams } from 'next/navigation'
import { formatCurrency, formatTimeAgo, formatDate } from '@/lib/utils'

export default function AssetDetailPage() {
    const params = useParams()
    const id = params?.id as string

    // Fetch single asset details
    const { data: assetData, isLoading: assetLoading } = useQuery({
        queryKey: ['asset', id],
        queryFn: async () => {
            const res = await api.getAsset(id)
            return res.data
        },
        enabled: !!id,
    })

    // To simulate a full page, if API doesn't return exact match easily via search:
    // We'll trust the component receives data.
    const asset = assetData

    if (assetLoading) {
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
                    <Skeleton className="md:col-span-2 h-[500px] w-full rounded-xl" />
                    <Skeleton className="h-[500px] w-full rounded-xl" />
                </div>
            </div>
        )
    }

    if (!asset) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                    <Activity className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Asset Not Found</h2>
                <p className="text-muted-foreground mb-6">The asset you are looking for does not exist or has been deleted.</p>
                <Button asChild>
                    <Link href="/dashboard/assets">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Assets
                    </Link>
                </Button>
            </div>
        )
    }

    const imageUrl = asset.customFields?.imageUrl

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/dashboard/assets">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold">{asset.name}</h1>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider ${asset.status === 'active' ? 'bg-green-500/10 text-green-600' :
                                asset.status === 'under_repair' ? 'bg-amber-500/10 text-amber-600' :
                                    asset.status === 'retired' ? 'bg-red-500/10 text-red-600' :
                                        'bg-gray-500/10 text-gray-600'
                                }`}>
                                {asset.status.replace('_', ' ')}
                            </span>
                            {asset.isCritical && (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider bg-destructive/10 text-destructive">
                                    Critical
                                </span>
                            )}
                        </div>
                        <p className="text-muted-foreground font-mono mt-1 text-sm bg-muted/50 w-fit px-2 py-0.5 rounded">
                            {asset.assetNumber}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <Link href={`/dashboard/assets/${asset.id}/edit`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Asset
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href={`/dashboard/work-orders/new?assetId=${asset.id}`}>
                            <ClipboardList className="h-4 w-4 mr-2" />
                            Create Work Order
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Main Content */}
                <div className="md:col-span-2 space-y-6">
                    <Card className="overflow-hidden">
                        {/* Large Image Header */}
                        <div className="w-full h-64 sm:h-80 md:h-96 bg-muted/20 relative flex items-center justify-center border-b inner-shadow">
                            {imageUrl ? (
                                <img
                                    src={imageUrl}
                                    alt={asset.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                    }}
                                />
                            ) : null}
                            <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground ${imageUrl ? 'hidden' : ''}`}>
                                <ImageIcon className="h-12 w-12 opacity-20" />
                                <p className="text-sm font-medium opacity-50">No media available</p>
                            </div>
                        </div>

                        <CardContent className="p-6">
                            <div className="prose dark:prose-invert max-w-none">
                                <h3 className="text-xl mt-0">Description</h3>
                                <p className="text-muted-foreground whitespace-pre-wrap">
                                    {asset.description || 'No description provided.'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-6 sm:grid-cols-2">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg">Location & Categorization</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium">Facility Location</p>
                                        <p className="text-sm text-muted-foreground">{asset.location?.name || 'Unassigned'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Tag className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium">Category</p>
                                        <p className="text-sm text-muted-foreground">{asset.category?.name || 'Uncategorized'}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg">Purchase Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Purchase Date</p>
                                        <p className="text-sm">{formatDate(asset.purchaseDate)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Purchase Cost</p>
                                        <p className="text-sm">{asset.purchaseCost ? formatCurrency(Number(asset.purchaseCost)) : 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Warranty Expiry</p>
                                        <p className="text-sm text-amber-600 dark:text-amber-500 font-medium">
                                            {asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toLocaleDateString() : 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Expected Life</p>
                                        <p className="text-sm">{asset.expectedLifeYears ? `${asset.expectedLifeYears} Years` : 'N/A'}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Specifications</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                <div className="flex justify-between py-1 border-b last:border-0 border-border/50">
                                    <span className="text-sm text-muted-foreground">Manufacturer</span>
                                    <span className="text-sm font-medium">{asset.manufacturer || '-'}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b last:border-0 border-border/50">
                                    <span className="text-sm text-muted-foreground">Model</span>
                                    <span className="text-sm font-medium">{asset.model || '-'}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b last:border-0 border-border/50">
                                    <span className="text-sm text-muted-foreground">Serial Number</span>
                                    <span className="text-sm font-medium font-mono">{asset.serialNumber || '-'}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b last:border-0 border-border/50">
                                    <span className="text-sm text-muted-foreground">Added On</span>
                                    <span className="text-sm font-medium">{formatDate(asset.createdAt)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Clock className="h-5 w-5 text-primary" />
                                Recent History
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {/* Fake history items since we don't have a direct WOs history endpoint for single asset yet */}
                                <div className="flex gap-3">
                                    <div className="w-2 bg-primary rounded-full shrink-0" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">Asset Created</p>
                                        <p className="text-xs text-muted-foreground">{formatTimeAgo(new Date(asset.createdAt))}</p>
                                    </div>
                                </div>
                            </div>
                            <Button variant="outline" className="w-full mt-4 text-xs" asChild>
                                <Link href={`/dashboard/work-orders?search=${asset.assetNumber}`}>
                                    View all Work Orders
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-emerald-500" />
                                PM Plans
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-6 text-muted-foreground text-sm">
                                No active PM plans linked.
                            </div>
                            <Button variant="outline" className="w-full mt-2 text-xs" asChild>
                                <Link href={`/dashboard/pm/new?assetId=${asset.id}`}>
                                    Create PM Plan
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
