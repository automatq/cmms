'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { Plus, Search, Package, MapPin, Tag, Image as ImageIcon, GitBranch, LayoutGrid, ChevronRight, ChevronDown, Download, Upload } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { CsvImportDialog } from '@/components/csv-import-dialog'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/providers/auth-provider'

export default function AssetsPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<'grid' | 'hierarchy'>('grid')
  const [showImport, setShowImport] = useState(false)
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([])

  const { data, isLoading } = useQuery({
    queryKey: ['assets', search, page],
    queryFn: async () => {
      const res = await api.getAssets({ search, page, limit: 20 })
      return res.data
    },
  })

  const { data: hierarchyData } = useQuery({
    queryKey: ['asset-hierarchy'],
    queryFn: async () => {
      const res = await api.getAssetHierarchy()
      return res.data
    },
    enabled: viewMode === 'hierarchy',
  })

  const assets = data?.data || []
  const total = data?.total || 0
  const canManageQr = !!user?.permissions?.includes('assets:write')
  const visibleAssetIds = useMemo(() => assets.map((asset: any) => asset.id), [assets])
  const allVisibleSelected = visibleAssetIds.length > 0 && visibleAssetIds.every((id: string) => selectedAssetIds.includes(id))

  useEffect(() => {
    setSelectedAssetIds((current) => current.filter((id) => visibleAssetIds.includes(id)))
  }, [visibleAssetIds])

  const handleExportCsv = async () => {
    try {
      const res = await api.exportAssetsCsv()
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url; a.download = 'assets.csv'; a.click()
      URL.revokeObjectURL(url)
      toast.success('Assets exported')
    } catch {
      toast.error('Failed to export assets')
    }
  }

  const toggleAssetSelection = (assetId: string, checked: boolean) => {
    setSelectedAssetIds((current) => {
      if (checked) {
        return current.includes(assetId) ? current : [...current, assetId]
      }
      return current.filter((id) => id !== assetId)
    })
  }

  const toggleSelectVisible = (checked: boolean) => {
    setSelectedAssetIds(checked ? visibleAssetIds : [])
  }

  const handleBulkPrint = async () => {
    if (!selectedAssetIds.length) {
      toast.error('Select at least one asset to print')
      return
    }

    try {
      const response = await api.bulkPrintAssetQrs(selectedAssetIds)
      const url = URL.createObjectURL(response.data)
      const printWindow = window.open(url, '_blank')
      if (printWindow) {
        setTimeout(() => {
          printWindow.focus()
          printWindow.print()
        }, 500)
      }
      toast.success('Printable QR labels opened')
    } catch {
      toast.error('Failed to generate printable QR labels')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Assets</h1>
          <p className="text-muted-foreground">
            Manage your equipment, machinery, and facilities
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <div className="flex border rounded-md">
            <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="rounded-r-none">
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === 'hierarchy' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('hierarchy')} className="rounded-l-none">
              <GitBranch className="h-4 w-4" />
            </Button>
          </div>
          <Button asChild>
            <Link href="/dashboard/assets/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Asset
            </Link>
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {viewMode === 'grid' && canManageQr && (
        <Card>
          <CardContent className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={allVisibleSelected}
                onChange={(event) => toggleSelectVisible(event.target.checked)}
                aria-label="Select visible assets"
              />
              <div>
                <p className="text-sm font-medium">QR label print queue</p>
                <p className="text-sm text-muted-foreground">
                  {selectedAssetIds.length} asset{selectedAssetIds.length === 1 ? '' : 's'} selected on this page.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedAssetIds([])} disabled={!selectedAssetIds.length}>
                Clear
              </Button>
              <Button size="sm" onClick={handleBulkPrint} disabled={!selectedAssetIds.length}>
                Print QR Labels
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hierarchy View */}
      {viewMode === 'hierarchy' && (
        <Card>
          <CardHeader>
            <CardTitle>Asset Hierarchy</CardTitle>
          </CardHeader>
          <CardContent>
            {!hierarchyData ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <AssetTree nodes={Array.isArray(hierarchyData) ? hierarchyData : []} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Assets Grid */}
      {viewMode === 'grid' && isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-[280px] w-full rounded-xl" />
          ))}
        </div>
      ) : viewMode === 'grid' && assets.length === 0 ? (
        <Card className="border-dashed mb-8">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-medium mb-2">{search ? 'No assets found' : 'No assets yet'}</h3>
            <p className="text-muted-foreground text-center max-w-sm mb-6">
              {search ? 'Try adjusting your search filters to find what you are looking for.' : 'Get started by creating your first piece of equipment, machinery, or facility.'}
            </p>
            <Button asChild size="lg">
              <Link href="/dashboard/assets/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Asset
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {assets.map((asset: any) => {
              const imageUrl = asset.customFields?.imageUrl

              return (
                <Link key={asset.id} href={`/dashboard/assets/${asset.id}`} className="group h-full block cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
                  <Card className="relative flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-md hover:border-primary/50 group-hover:-translate-y-1">
                    {canManageQr && (
                      <div
                        className="absolute left-3 top-3 z-10 rounded-md bg-background/95 p-1 shadow-sm"
                        onClick={(event) => event.preventDefault()}
                      >
                        <Checkbox
                          checked={selectedAssetIds.includes(asset.id)}
                          onChange={(event) => toggleAssetSelection(asset.id, event.target.checked)}
                          aria-label={`Select ${asset.name} for QR printing`}
                        />
                      </div>
                    )}

                    {/* Media Header */}
                    <div className="h-40 bg-muted/30 border-b relative overflow-hidden flex-shrink-0">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={asset.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          onError={(e) => {
                            // Fallback if image fails to load
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`absolute inset-0 flex items-center justify-center flex-col gap-2 ${imageUrl ? 'hidden' : ''}`}>
                        <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                      </div>

                      {/* Status Badge */}
                      <div className="absolute top-3 right-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-sm backdrop-blur-md ${asset.status === 'active' ? 'bg-green-500/90 text-white' :
                          asset.status === 'under_repair' ? 'bg-amber-500/90 text-white' :
                            asset.status === 'retired' ? 'bg-red-500/90 text-white' :
                              'bg-gray-500/90 text-white'
                          }`}>
                          {asset.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <CardHeader className="p-4 pb-2 flex-grow">
                      <div className="flex flex-col h-full">
                        <CardTitle className="text-lg line-clamp-1 mb-1 group-hover:text-primary transition-colors">
                          {asset.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground font-mono bg-muted/50 w-fit px-1.5 py-0.5 rounded">
                          {asset.assetNumber}
                        </p>

                        <div className="space-y-2 mt-4 text-sm text-muted-foreground">
                          {asset.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" />
                              <span className="truncate">{asset.location.name}</span>
                            </div>
                          )}
                          {asset.category && (
                            <div className="flex items-center gap-2">
                              <Tag className="h-3.5 w-3.5 shrink-0 opacity-70" />
                              <span className="truncate">{asset.category.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    {asset.manufacturer && (
                      <CardFooter className="p-4 pt-0 text-xs text-muted-foreground/80 mt-auto">
                        <p className="truncate w-full line-clamp-1">Mfr: {asset.manufacturer} {asset.model}</p>
                      </CardFooter>
                    )}
                  </Card>
                </Link>
              )
            })}
          </div>

          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{(page - 1) * 20 + 1}</span> to <span className="font-medium">{Math.min(page * 20, total)}</span> of <span className="font-medium">{total}</span> results
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <div className="flex gap-1">
                  {[...Array(Math.ceil(total / 20))].map((_, i) => (
                    <Button
                      key={i}
                      variant={page === i + 1 ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8 text-xs"
                      onClick={() => setPage(i + 1)}
                    >
                      {i + 1}
                    </Button>
                  )).slice(Math.max(0, page - 3), Math.min(Math.ceil(total / 20), page + 2))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= Math.ceil(total / 20)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      ) : null}

      <CsvImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        title="Import Assets"
        onImport={(file) => api.importAssetsCsv(file)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['assets'] })}
      />
    </div>
  )
}

function AssetTree({ nodes }: { nodes: any[] }) {
  if (nodes.length === 0) {
    return <p className="text-muted-foreground text-sm">No asset hierarchy data available. Assets with parent relationships will appear here.</p>
  }
  return (
    <div className="space-y-1">
      {nodes.map((node: any) => (
        <AssetTreeNode key={node.id} node={node} depth={0} />
      ))}
    </div>
  )
}

function AssetTreeNode({ node, depth }: { node: any; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2)
  const children = node.children || []
  const hasChildren = children.length > 0

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer group"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        {hasChildren ? (
          <button onClick={() => setExpanded(!expanded)} className="shrink-0">
            {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
        <Link href={`/dashboard/assets/${node.id}`} className="flex-1 flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">{node.name}</span>
          {node.assetNumber && (
            <span className="text-xs text-muted-foreground font-mono">{node.assetNumber}</span>
          )}
        </Link>
        {node.status && (
          <Badge variant={node.status === 'active' ? 'default' : 'secondary'} className="text-xs shrink-0">
            {node.status.replace('_', ' ')}
          </Badge>
        )}
        {hasChildren && (
          <span className="text-xs text-muted-foreground">{children.length}</span>
        )}
      </div>
      {expanded && hasChildren && (
        <div>
          {children.map((child: any) => (
            <AssetTreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
