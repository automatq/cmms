'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { Plus, Search, Package, MapPin, Tag } from 'lucide-react'
import { useState } from 'react'

export default function AssetsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['assets', search, page],
    queryFn: async () => {
      const res = await api.getAssets({ search, page, limit: 20 })
      return res.data
    },
  })

  const assets = data?.data || []
  const total = data?.total || 0

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
        <Button asChild>
          <Link href="/dashboard/assets/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Asset
          </Link>
        </Button>
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

      {/* Assets Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : assets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No assets found</h3>
            <p className="text-muted-foreground mb-4">
              {search ? 'Try a different search term' : 'Get started by adding your first asset'}
            </p>
            <Button asChild>
              <Link href="/dashboard/assets/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Asset
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assets.map((asset: any) => (
              <Link key={asset.id} href={`/dashboard/assets/${asset.id}`}>
                <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{asset.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{asset.assetNumber}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        asset.status === 'active' ? 'bg-green-100 text-green-700' :
                        asset.status === 'under_repair' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {asset.status}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {asset.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {asset.location.name}
                        </div>
                      )}
                      {asset.category && (
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          {asset.category.name}
                        </div>
                      )}
                      {asset.manufacturer && (
                        <p>{asset.manufacturer} {asset.model}</p>
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
