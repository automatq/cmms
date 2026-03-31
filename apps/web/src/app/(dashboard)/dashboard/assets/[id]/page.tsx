'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import Link from 'next/link'
import {
  ArrowLeft, Edit, MapPin, Tag, Image as ImageIcon, ClipboardList, Clock, Activity,
  Calendar, Gauge, FileText, Upload, Download, Trash2, Archive, Plus,
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { formatCurrency, formatTimeAgo, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { useAuth } from '@/providers/auth-provider'
import { AssetQrCard } from '@/components/assets/asset-qr-card'

export default function AssetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const id = params?.id as string

  const [showMeterDialog, setShowMeterDialog] = useState(false)
  const [meterForm, setMeterForm] = useState({ reading: '', notes: '' })
  const [showDocDialog, setShowDocDialog] = useState(false)
  const [docFile, setDocFile] = useState<File | null>(null)
  const [docName, setDocName] = useState('')

  const { data: asset, isLoading: assetLoading } = useQuery({
    queryKey: ['asset', id],
    queryFn: async () => {
      const res = await api.getAsset(id)
      return res.data
    },
    enabled: !!id,
  })

  // Real WO history for this asset
  const { data: woData } = useQuery({
    queryKey: ['asset-work-orders', id],
    queryFn: async () => {
      const res = await api.getWorkOrders({ assetId: id, limit: 5 })
      return res.data
    },
    enabled: !!id,
  })

  // Real PM plans for this asset
  const { data: pmData } = useQuery({
    queryKey: ['asset-pm-plans', id],
    queryFn: async () => {
      const res = await api.getPmPlans({ assetId: id })
      return res.data
    },
    enabled: !!id,
  })

  // Meter readings
  const { data: metersData } = useQuery({
    queryKey: ['asset-meters', id],
    queryFn: async () => {
      const res = await api.getAssetMeters(id)
      return res.data
    },
    enabled: !!id,
  })

  const retireMutation = useMutation({
    mutationFn: () => api.retireAsset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset', id] })
      toast.success('Asset retired')
    },
    onError: () => toast.error('Failed to retire asset'),
  })

  const meterMutation = useMutation({
    mutationFn: (data: { reading: number; notes?: string }) => api.recordMeterReading(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-meters', id] })
      setShowMeterDialog(false)
      setMeterForm({ reading: '', notes: '' })
      toast.success('Meter reading recorded')
    },
    onError: () => toast.error('Failed to record reading'),
  })

  const docUploadMutation = useMutation({
    mutationFn: ({ file, name }: { file: File; name: string }) =>
      api.uploadAssetDocument(id, file, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset', id] })
      setShowDocDialog(false)
      setDocFile(null)
      setDocName('')
      toast.success('Document uploaded')
    },
    onError: () => toast.error('Failed to upload document'),
  })

  const docDeleteMutation = useMutation({
    mutationFn: (docId: string) => api.deleteAssetDocument(id, docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset', id] })
      toast.success('Document deleted')
    },
    onError: () => toast.error('Failed to delete document'),
  })

  const workOrders = Array.isArray(woData?.data) ? woData.data : Array.isArray(woData) ? woData : []
  const pmPlans = Array.isArray(pmData?.data) ? pmData.data : Array.isArray(pmData) ? pmData : []
  const meters = Array.isArray(metersData) ? metersData : Array.isArray(metersData?.data) ? metersData.data : []
  const documents = Array.isArray(asset?.documents) ? asset.documents : []

  const WO_STATUS_COLORS: Record<string, string> = {
    open: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-amber-100 text-amber-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }

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
  const canManageQr = !!user?.permissions?.includes('assets:write')

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
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider ${asset.status === 'active' || asset.status === 'operational' ? 'bg-green-500/10 text-green-600' :
                asset.status === 'under_repair' || asset.status === 'needs_repair' ? 'bg-amber-500/10 text-amber-600' :
                  asset.status === 'retired' || asset.status === 'out_of_service' ? 'bg-red-500/10 text-red-600' :
                    'bg-gray-500/10 text-gray-600'
                }`}>
                {asset.status?.replace('_', ' ')}
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
          {asset.status !== 'retired' && (
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm('Are you sure you want to retire this asset? This action cannot be undone.')) {
                  retireMutation.mutate()
                }
              }}
              disabled={retireMutation.isPending}
            >
              <Archive className="h-4 w-4 mr-2" />
              Retire
            </Button>
          )}
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

          {/* Meter Readings */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-primary" />
                  Meter Readings
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => setShowMeterDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Record Reading
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {meters.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No meter readings recorded.</p>
              ) : (
                <div className="space-y-2">
                  {meters.slice(0, 5).map((m: any, i: number) => (
                    <div key={m.id || i} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{m.reading} {m.unit || ''}</p>
                        {m.notes && <p className="text-xs text-muted-foreground">{m.notes}</p>}
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(m.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Documents
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => setShowDocDialog(true)}>
                  <Upload className="h-4 w-4 mr-1" /> Upload
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No documents attached.</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{doc.name || doc.fileName}</p>
                        <p className="text-xs text-muted-foreground">{doc.type || 'Document'}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={async () => {
                            const res = await api.getAssetDocumentUrl(id, doc.id)
                            const url = res.data?.url || res.data
                            if (url) window.open(url, '_blank')
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => docDeleteMutation.mutate(doc.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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

          {/* Work Order History - real data */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Recent Work Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No work orders for this asset.</p>
              ) : (
                <div className="space-y-3">
                  {workOrders.map((wo: any) => (
                    <Link
                      key={wo.id}
                      href={`/dashboard/work-orders/${wo.id}`}
                      className="block p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate flex-1">{wo.title}</p>
                        <Badge className={`ml-2 ${WO_STATUS_COLORS[wo.status] || 'bg-gray-100 text-gray-700'}`}>
                          {wo.status?.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {wo.woNumber && `${wo.woNumber} · `}{formatTimeAgo(new Date(wo.createdAt))}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
              <Button variant="outline" className="w-full mt-4 text-xs" asChild>
                <Link href={`/dashboard/work-orders?assetId=${asset.id}`}>
                  View all Work Orders
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* PM Plans - real data */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-emerald-500" />
                PM Plans
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pmPlans.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No PM plans linked.</p>
              ) : (
                <div className="space-y-3">
                  {pmPlans.map((pm: any) => (
                    <Link
                      key={pm.id}
                      href={`/dashboard/pm/${pm.id}`}
                      className="block p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">{pm.name}</p>
                        <Badge variant={pm.isActive ? 'default' : 'secondary'}>
                          {pm.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {pm.triggerType === 'time_based' ? `Every ${pm.frequencyValue} ${pm.frequencyUnit}` :
                          pm.triggerType === 'meter_based' ? `Every ${pm.meterInterval} ${pm.meterUnit || 'units'}` :
                            pm.triggerType}
                        {pm.nextDueAt && ` · Next: ${formatDate(pm.nextDueAt)}`}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
              <Button variant="outline" className="w-full mt-4 text-xs" asChild>
                <Link href={`/dashboard/pm/new?assetId=${asset.id}`}>
                  Create PM Plan
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* QR Code */}
          <AssetQrCard
            assetId={id}
            assetName={asset.name}
            assetNumber={asset.assetNumber}
            canManage={canManageQr}
          />
        </div>
      </div>

      {/* Meter Reading Dialog */}
      <Dialog open={showMeterDialog} onOpenChange={setShowMeterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Meter Reading</DialogTitle>
            <DialogDescription>Enter the current meter value for this asset.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault()
            meterMutation.mutate({
              reading: parseFloat(meterForm.reading),
              notes: meterForm.notes || undefined,
            })
          }} className="space-y-4">
            <div className="space-y-2">
              <Label>Reading *</Label>
              <Input
                type="number"
                step="0.01"
                value={meterForm.reading}
                onChange={(e) => setMeterForm({ ...meterForm, reading: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={meterForm.notes}
                onChange={(e) => setMeterForm({ ...meterForm, notes: e.target.value })}
                placeholder="Optional notes..."
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={meterMutation.isPending}>
                {meterMutation.isPending ? 'Saving...' : 'Record Reading'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Document Upload Dialog */}
      <Dialog open={showDocDialog} onOpenChange={setShowDocDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Attach a document to this asset.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault()
            if (!docFile) return
            docUploadMutation.mutate({ file: docFile, name: docName || docFile.name })
          }} className="space-y-4">
            <div className="space-y-2">
              <Label>Document Name *</Label>
              <Input
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g. Operating Manual"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>File *</Label>
              <Input
                type="file"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) {
                    setDocFile(f)
                    if (!docName) setDocName(f.name.replace(/\.[^.]+$/, ''))
                  }
                }}
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={docUploadMutation.isPending || !docFile}>
                {docUploadMutation.isPending ? 'Uploading...' : 'Upload'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
