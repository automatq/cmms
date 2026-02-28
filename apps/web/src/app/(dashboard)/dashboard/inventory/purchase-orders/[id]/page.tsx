'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import Link from 'next/link'
import { ArrowLeft, Send, Package, XCircle, CheckCircle2 } from 'lucide-react'
import { useParams } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useState } from 'react'
import { toast } from 'sonner'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  partial: 'bg-amber-100 text-amber-700',
  received: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function PurchaseOrderDetailPage() {
  const params = useParams()
  const queryClient = useQueryClient()
  const id = params?.id as string

  const [showReceiveDialog, setShowReceiveDialog] = useState(false)
  const [receiveItems, setReceiveItems] = useState<Record<string, string>>({})

  const { data: po, isLoading } = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: async () => {
      const res = await api.getPurchaseOrder(id)
      return res.data
    },
    enabled: !!id,
  })

  const sendMutation = useMutation({
    mutationFn: () => api.sendPurchaseOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] })
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      toast.success('Purchase order sent')
    },
    onError: () => toast.error('Failed to send PO'),
  })

  const cancelMutation = useMutation({
    mutationFn: () => api.cancelPurchaseOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] })
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      toast.success('Purchase order cancelled')
    },
    onError: () => toast.error('Failed to cancel PO'),
  })

  const receiveMutation = useMutation({
    mutationFn: (data: any) => api.receivePurchaseOrder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] })
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({ queryKey: ['parts'] })
      setShowReceiveDialog(false)
      setReceiveItems({})
      toast.success('Items received and stock updated')
    },
    onError: () => toast.error('Failed to record receiving'),
  })

  const handleReceive = (e: React.FormEvent) => {
    e.preventDefault()
    const lineItems = Object.entries(receiveItems)
      .filter(([, qty]) => parseInt(qty) > 0)
      .map(([lineItemId, qtyReceived]) => ({
        lineItemId,
        qtyReceived: parseInt(qtyReceived),
      }))

    if (lineItems.length === 0) {
      toast.error('Enter at least one quantity to receive')
      return
    }
    receiveMutation.mutate({ lineItems })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="md:col-span-2 h-[400px] w-full rounded-xl" />
          <Skeleton className="h-[300px] w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (!po) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Purchase Order Not Found</h2>
        <Button asChild>
          <Link href="/dashboard/inventory/purchase-orders">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to POs
          </Link>
        </Button>
      </div>
    )
  }

  const lineItems = po.lineItems || []
  const totalCost = lineItems.reduce((sum: number, li: any) => sum + (Number(li.qtyOrdered) * Number(li.unitCost)), 0)

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/inventory/purchase-orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{po.poNumber || `PO-${po.id.slice(0, 8)}`}</h1>
              <Badge className={STATUS_COLORS[po.status] || ''}>
                {po.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {po.supplier?.name} {po.expectedDate && `| Expected: ${formatDate(po.expectedDate)}`}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Line Items */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
              <CardDescription>{lineItems.length} item(s) | Total: {formatCurrency(totalCost)}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-b-lg overflow-hidden">
                <div className="grid grid-cols-5 gap-4 p-3 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <span className="col-span-2">Part</span>
                  <span>Ordered</span>
                  <span>Received</span>
                  <span>Cost</span>
                </div>
                <div className="divide-y">
                  {lineItems.map((li: any) => (
                    <div key={li.id} className="grid grid-cols-5 gap-4 p-3 items-center">
                      <span className="col-span-2 text-sm font-medium">{li.part?.name || 'Part'}</span>
                      <span className="text-sm">{li.qtyOrdered}</span>
                      <span className="text-sm">
                        <span className={li.qtyReceived >= li.qtyOrdered ? 'text-green-600 font-medium' : ''}>
                          {li.qtyReceived || 0}
                        </span>
                        {li.qtyReceived >= li.qtyOrdered && <CheckCircle2 className="inline h-3.5 w-3.5 ml-1 text-green-600" />}
                      </span>
                      <span className="text-sm font-medium">{formatCurrency(Number(li.qtyOrdered) * Number(li.unitCost))}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {po.notes && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{po.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {po.status === 'draft' && (
                <Button className="w-full" onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending}>
                  <Send className="h-4 w-4 mr-2" />
                  {sendMutation.isPending ? 'Sending...' : 'Send to Supplier'}
                </Button>
              )}
              {(po.status === 'sent' || po.status === 'partial') && (
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={() => {
                  const items: Record<string, string> = {}
                  lineItems.forEach((li: any) => { items[li.id] = '' })
                  setReceiveItems(items)
                  setShowReceiveDialog(true)
                }}>
                  <Package className="h-4 w-4 mr-2" />
                  Record Receiving
                </Button>
              )}
              {po.status !== 'cancelled' && po.status !== 'received' && (
                <Button variant="destructive" className="w-full" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
                  <XCircle className="h-4 w-4 mr-2" />
                  {cancelMutation.isPending ? 'Cancelling...' : 'Cancel PO'}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Supplier</span>
                <span className="font-medium">{po.supplier?.name || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">{formatDate(po.createdAt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Expected</span>
                <span className="font-medium">{po.expectedDate ? formatDate(po.expectedDate) : '-'}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="font-medium">Total</span>
                <span className="font-bold text-lg">{formatCurrency(totalCost)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Receive Dialog */}
      <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Receiving</DialogTitle>
            <DialogDescription>Enter quantities received for each line item.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReceive} className="space-y-4">
            {lineItems.map((li: any) => (
              <div key={li.id} className="flex items-center justify-between gap-4 p-3 bg-muted/30 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{li.part?.name || 'Part'}</p>
                  <p className="text-xs text-muted-foreground">
                    Ordered: {li.qtyOrdered} | Already received: {li.qtyReceived || 0}
                  </p>
                </div>
                <div className="w-24">
                  <Input
                    type="number"
                    min="0"
                    max={li.qtyOrdered - (li.qtyReceived || 0)}
                    value={receiveItems[li.id] || ''}
                    onChange={(e) => setReceiveItems({ ...receiveItems, [li.id]: e.target.value })}
                    placeholder="0"
                    className="h-9"
                  />
                </div>
              </div>
            ))}
            <DialogFooter>
              <Button type="submit" disabled={receiveMutation.isPending}>
                {receiveMutation.isPending ? 'Processing...' : 'Confirm Receipt'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
