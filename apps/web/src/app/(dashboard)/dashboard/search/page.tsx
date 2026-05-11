'use client'

import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Search, Box, Wrench, Package } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const WO_STATUS_COLORS: Record<string, string> = {
  requested: 'bg-gray-100 text-gray-700',
  pending_approval: 'bg-purple-100 text-purple-700',
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  on_hold: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

const ASSET_STATUS_COLORS: Record<string, string> = {
  operational: 'bg-green-100 text-green-700',
  needs_repair: 'bg-amber-100 text-amber-700',
  out_of_service: 'bg-red-100 text-red-700',
  retired: 'bg-gray-100 text-gray-700',
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') || ''

  const { data: assets, isLoading: loadingAssets } = useQuery({
    queryKey: ['search-assets', q],
    queryFn: async () => {
      const res = await api.getAssets({ search: q, limit: 10 })
      return res.data?.data || res.data || []
    },
    enabled: !!q,
  })

  const { data: workOrders, isLoading: loadingWOs } = useQuery({
    queryKey: ['search-work-orders', q],
    queryFn: async () => {
      const res = await api.getWorkOrders({ search: q, limit: 10 })
      return res.data?.data || res.data || []
    },
    enabled: !!q,
  })

  const { data: parts, isLoading: loadingParts } = useQuery({
    queryKey: ['search-parts', q],
    queryFn: async () => {
      const res = await api.getParts({ search: q, limit: 10 })
      return res.data?.data || res.data || []
    },
    enabled: !!q,
  })

  const isLoading = loadingAssets || loadingWOs || loadingParts
  const assetList = Array.isArray(assets) ? assets : []
  const woList = Array.isArray(workOrders) ? workOrders : []
  const partList = Array.isArray(parts) ? parts : []
  const totalResults = assetList.length + woList.length + partList.length

  if (!q) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Search className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Search</h2>
        <p className="text-muted-foreground">Use the search bar above to find assets, work orders, and parts.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Search Results</h1>
        <p className="text-muted-foreground">
          {isLoading ? 'Searching...' : `${totalResults} result(s) for "${q}"`}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : totalResults === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No results found</h3>
            <p className="text-muted-foreground">Try a different search term.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Assets */}
          {assetList.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                <Box className="h-5 w-5 text-primary" />
                Assets ({assetList.length})
              </h2>
              <div className="rounded-lg border divide-y">
                {assetList.map((asset: any) => (
                  <Link
                    key={asset.id}
                    href={`/dashboard/assets/${asset.id}`}
                    className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{asset.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {asset.assetNumber && `#${asset.assetNumber} · `}{asset.location?.name || ''}
                      </p>
                    </div>
                    <Badge className={ASSET_STATUS_COLORS[asset.status] || ''}>
                      {asset.status?.replace('_', ' ')}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Work Orders */}
          {woList.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                <Wrench className="h-5 w-5 text-primary" />
                Work Orders ({woList.length})
              </h2>
              <div className="rounded-lg border divide-y">
                {woList.map((wo: any) => (
                  <Link
                    key={wo.id}
                    href={`/dashboard/work-orders/${wo.id}`}
                    className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{wo.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {wo.woNumber && `${wo.woNumber} · `}{wo.asset?.name || ''}{wo.dueDate ? ` · Due: ${formatDate(wo.dueDate)}` : ''}
                      </p>
                    </div>
                    <Badge className={WO_STATUS_COLORS[wo.status] || ''}>
                      {wo.status?.replace('_', ' ')}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Parts */}
          {partList.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                <Package className="h-5 w-5 text-primary" />
                Parts ({partList.length})
              </h2>
              <div className="rounded-lg border divide-y">
                {partList.map((part: any) => (
                  <Link
                    key={part.id}
                    href={`/dashboard/inventory/parts/${part.id}`}
                    className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{part.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {part.sku && `SKU: ${part.sku} · `}On hand: {part.qtyOnHand ?? 0}
                      </p>
                    </div>
                    {part.isCritical && (
                      <Badge variant="destructive">Critical</Badge>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
