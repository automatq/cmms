'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/page-header'
import { Plus, Search, Package, AlertTriangle, Download, Upload } from 'lucide-react'
import { useState } from 'react'
import { formatCurrency, cn } from '@/lib/utils'
import { getStockMeta } from '@/lib/status'
import { CsvImportDialog } from '@/components/csv-import-dialog'
import { toast } from 'sonner'

export default function InventoryPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [showImport, setShowImport] = useState(false)

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

  const handleExportCsv = async () => {
    try {
      const res = await api.exportPartsCsv()
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url; a.download = 'parts.csv'; a.click()
      URL.revokeObjectURL(url)
      toast.success('Parts exported')
    } catch {
      toast.error('Failed to export parts')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Manage spare parts and supplies"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/inventory/suppliers">
                Suppliers
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/inventory/storerooms">
                Storerooms
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/inventory/transactions">
                Transactions
              </Link>
            </Button>
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
          </>
        }
      />

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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-[200px] w-full rounded-xl" />
          ))}
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
            {parts.map((part: any) => {
              const stock = getStockMeta(part.qtyOnHand ?? 0, part.reorderPoint ?? 0)
              return (
              <Link key={part.id} href={`/dashboard/inventory/parts/${part.id}`} className="block h-full">
                <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full flex flex-col">
                  <CardContent className="p-5 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg leading-tight line-clamp-1">{part.name}</h3>
                          <p className="text-sm text-muted-foreground font-mono mt-0.5">{part.sku}</p>
                        </div>
                      </div>
                      {part.isCritical && (
                        <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/20">
                          Critical
                        </span>
                      )}
                    </div>

                    {/* Stock level */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          <span className="text-foreground">{part.qtyOnHand ?? 0}</span>
                          <span className="text-muted-foreground"> in stock</span>
                        </span>
                        <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', stock.badgeClass)}>
                          {stock.label}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className={cn('h-full rounded-full transition-all', stock.barClass)} style={{ width: `${stock.percent}%` }} />
                      </div>
                      {part.reorderPoint > 0 && (
                        <p className="text-[11px] text-muted-foreground">Reorder at {part.reorderPoint}</p>
                      )}
                    </div>

                    <div className="mt-auto space-y-3 pt-4 border-t">
                      {part.category && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground font-medium">Category</span>
                          <span className="font-medium text-foreground">{part.category}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-medium">Unit Cost</span>
                        <span className="font-semibold text-foreground">{formatCurrency(part.unitCost)}</span>
                      </div>

                      {part.supplier && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground font-medium">Supplier</span>
                          <span className="truncate max-w-[120px] font-medium text-foreground" title={part.supplier.name}>
                            {part.supplier.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
              )
            })}
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

      <CsvImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        title="Import Parts"
        onImport={(file) => api.importPartsCsv(file)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['parts'] })}
      />
    </div>
  )
}
