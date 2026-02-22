'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { Plus, Search, Package, AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

export default function InventoryPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [lowStockOnly, setLowStockOnly] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['parts', search, page, lowStockOnly],
    queryFn: async () => {
      const res = await api.getParts({ 
        search, 
        page, 
        limit: 20,
        lowStock: lowStockOnly || undefined
      })
      return res.data
    },
  })

  const parts = data?.data || []
  const total = data?.total || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground">
            Manage spare parts and supplies
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/inventory/purchase-orders">
              Purchase Orders
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/inventory/parts/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Part
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search parts by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button 
          variant={lowStockOnly ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setLowStockOnly(!lowStockOnly)}
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Low Stock Only
        </Button>
      </div>

      {/* Parts List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : parts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No parts found</h3>
            <p className="text-muted-foreground mb-4">
              {search || lowStockOnly ? 'Try different filters' : 'Add parts to your inventory'}
            </p>
            <Button asChild>
              <Link href="/dashboard/inventory/parts/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Part
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {parts.map((part: any) => (
              <Link key={part.id} href={`/dashboard/inventory/parts/${part.id}`}>
                <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{part.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">SKU: {part.sku}</p>
                      </div>
                      {part.isCritical && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          Critical
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {part.category && (
                        <p className="text-muted-foreground">Category: {part.category}</p>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Unit Cost:</span>
                        <span>{formatCurrency(part.unitCost)}</span>
                      </div>
                      {part.supplier && (
                        <p className="text-muted-foreground">Supplier: {part.supplier.name}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {Math.ceil(total / 20)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(total / 20)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
