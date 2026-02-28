'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, ArrowDownCircle, ArrowUpCircle, RefreshCw, ArrowRightLeft, Lock, Unlock, FileText } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  receive: { label: 'Receive', color: 'bg-green-100 text-green-700', icon: ArrowDownCircle },
  issue: { label: 'Issue', color: 'bg-red-100 text-red-700', icon: ArrowUpCircle },
  adjust: { label: 'Adjust', color: 'bg-blue-100 text-blue-700', icon: RefreshCw },
  transfer: { label: 'Transfer', color: 'bg-purple-100 text-purple-700', icon: ArrowRightLeft },
  reserve: { label: 'Reserve', color: 'bg-amber-100 text-amber-700', icon: Lock },
  release: { label: 'Release', color: 'bg-teal-100 text-teal-700', icon: Unlock },
}

export default function TransactionsPage() {
  const searchParams = useSearchParams()
  const initialPartId = searchParams.get('partId') || ''

  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    partId: initialPartId,
    transactionType: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['inventory-transactions', page, filters],
    queryFn: async () => {
      const params: Record<string, any> = { page, limit: 25 }
      if (filters.partId) params.partId = filters.partId
      if (filters.transactionType) params.transactionType = filters.transactionType
      const res = await api.getInventoryTransactions(params)
      return res.data
    },
  })

  const { data: parts } = useQuery({
    queryKey: ['parts-lookup'],
    queryFn: async () => {
      const res = await api.getParts({ limit: 200 })
      return res.data?.data || res.data || []
    },
  })

  const transactions = data?.data || data || []
  const txList = Array.isArray(transactions) ? transactions : []
  const total = data?.total || txList.length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/inventory">
            <ArrowLeft className="h-4 w-4 mr-1" /> Inventory
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Transaction History</h1>
          <p className="text-muted-foreground">All inventory stock movements</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Part</Label>
              <Select
                value={filters.partId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  setFilters({ ...filters, partId: e.target.value })
                  setPage(1)
                }}
              >
                <option value="">All parts</option>
                {(Array.isArray(parts) ? parts : []).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select
                value={filters.transactionType}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  setFilters({ ...filters, transactionType: e.target.value })
                  setPage(1)
                }}
              >
                <option value="">All types</option>
                <option value="receive">Receive</option>
                <option value="issue">Issue</option>
                <option value="adjust">Adjust</option>
                <option value="transfer">Transfer</option>
                <option value="reserve">Reserve</option>
                <option value="release">Release</option>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilters({ partId: '', transactionType: '' })
                  setPage(1)
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : txList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No transactions found</h3>
            <p className="text-muted-foreground">Adjust your filters or perform stock operations.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="rounded-lg border">
            <div className="grid grid-cols-6 gap-4 p-3 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span>Type</span>
              <span className="col-span-2">Part</span>
              <span>Qty</span>
              <span>Storeroom</span>
              <span>Date</span>
            </div>
            <div className="divide-y">
              {txList.map((tx: any) => {
                const cfg = TYPE_CONFIG[tx.transactionType] || { label: tx.transactionType, color: 'bg-gray-100 text-gray-700', icon: FileText }
                const Icon = cfg.icon
                return (
                  <div key={tx.id} className="grid grid-cols-6 gap-4 p-3 items-center">
                    <span>
                      <Badge className={cfg.color}>
                        <Icon className="h-3 w-3 mr-1" />
                        {cfg.label}
                      </Badge>
                    </span>
                    <span className="col-span-2 text-sm">
                      <Link href={`/dashboard/inventory/parts/${tx.partId || tx.part?.id}`} className="font-medium hover:underline">
                        {tx.part?.name || 'Part'}
                      </Link>
                      {tx.notes && <p className="text-xs text-muted-foreground truncate">{tx.notes}</p>}
                    </span>
                    <span className={`text-sm font-medium ${tx.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.quantity > 0 ? '+' : ''}{tx.quantity}
                    </span>
                    <span className="text-sm text-muted-foreground">{tx.storeroom?.name || '-'}</span>
                    <span className="text-sm text-muted-foreground">{formatDate(tx.createdAt)}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {total > 25 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} of {Math.ceil(total / 25)}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 25)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
