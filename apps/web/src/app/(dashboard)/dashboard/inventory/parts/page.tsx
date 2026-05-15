'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import Link from 'next/link'
import { ArrowLeft, Plus, Package, Search } from 'lucide-react'

export default function PartsPage() {
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['parts', search],
    queryFn: async () => {
      const res = await api.getParts({ search: search || undefined, limit: 100 })
      // API may return { data: [...] } or [...] depending on the endpoint shape.
      return Array.isArray(res.data) ? res.data : res.data?.data || []
    },
  })

  const parts = Array.isArray(data) ? data : []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/inventory">
            <ArrowLeft className="h-4 w-4 mr-1" /> Inventory
          </Link>
        </Button>
      </div>

      <PageHeader
        title="Parts"
        description="Manage spare parts catalog"
        actions={
          <Button asChild>
            <Link href="/dashboard/inventory/parts/new">
              <Plus className="h-4 w-4 mr-2" /> New Part
            </Link>
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by SKU or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : parts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {search ? 'No parts match your search' : 'No parts yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {search ? 'Try a different search.' : 'Add a part to start tracking inventory.'}
            </p>
            {!search && (
              <Button asChild>
                <Link href="/dashboard/inventory/parts/new">
                  <Plus className="h-4 w-4 mr-2" /> New Part
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {parts.map((part: any) => (
            <Link
              key={part.id}
              href={`/dashboard/inventory/parts/${part.id}`}
              className="block"
            >
              <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 bg-primary/10">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-sm font-mono font-semibold text-muted-foreground">
                        {part.sku}
                      </span>
                      {part.category && (
                        <Badge variant="secondary" className="text-[10px]">
                          {part.category}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg truncate leading-tight">{part.name}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                      {part.unitCost != null && (
                        <span>
                          <span className="font-medium">Unit cost:</span> $
                          {Number(part.unitCost).toFixed(2)} / {part.unitOfMeasure || 'each'}
                        </span>
                      )}
                      {part.supplier?.name && (
                        <span>
                          <span className="font-medium">Supplier:</span> {part.supplier.name}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
