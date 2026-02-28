'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, Plus, ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  partial: 'bg-amber-100 text-amber-700',
  received: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function PurchaseOrdersPage() {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', page],
    queryFn: async () => {
      const res = await api.getPurchaseOrders({ page, limit: 20 })
      return res.data
    },
  })

  const orders = data?.data || []
  const total = data?.total || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/inventory">
              <ArrowLeft className="h-4 w-4 mr-1" /> Inventory
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Purchase Orders</h1>
            <p className="text-muted-foreground">Manage procurement and receiving</p>
          </div>
        </div>
        <Button asChild>
          <Link href="/dashboard/inventory/purchase-orders/new">
            <Plus className="h-4 w-4 mr-2" /> Create PO
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No purchase orders</h3>
            <p className="text-muted-foreground mb-4">Create your first purchase order.</p>
            <Button asChild>
              <Link href="/dashboard/inventory/purchase-orders/new">
                <Plus className="h-4 w-4 mr-2" /> Create PO
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="rounded-lg border">
            <div className="grid grid-cols-5 gap-4 p-3 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span>PO Number</span>
              <span>Supplier</span>
              <span>Status</span>
              <span>Total</span>
              <span>Expected Date</span>
            </div>
            <div className="divide-y">
              {orders.map((po: any) => (
                <Link key={po.id} href={`/dashboard/inventory/purchase-orders/${po.id}`} className="grid grid-cols-5 gap-4 p-3 hover:bg-muted/30 transition-colors items-center">
                  <span className="font-mono text-sm font-medium">{po.poNumber || `PO-${po.id.slice(0, 8)}`}</span>
                  <span className="text-sm">{po.supplier?.name || '-'}</span>
                  <span>
                    <Badge className={STATUS_COLORS[po.status] || 'bg-gray-100 text-gray-700'}>
                      {po.status}
                    </Badge>
                  </span>
                  <span className="text-sm font-medium">{formatCurrency(Number(po.totalCost || 0))}</span>
                  <span className="text-sm text-muted-foreground">{po.expectedDate ? formatDate(po.expectedDate) : '-'}</span>
                </Link>
              ))}
            </div>
          </div>

          {total > 20 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page} of {Math.ceil(total / 20)}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
