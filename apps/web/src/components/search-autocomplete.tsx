'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useDebounce } from '@/hooks/use-debounce'
import { Input } from '@/components/ui/input'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Search, Box, Wrench, Package, Loader2, SearchX } from 'lucide-react'

export function SearchAutocomplete() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebounce(query, 300)

  const { data: assets, isFetching: fetchingAssets } = useQuery({
    queryKey: ['autocomplete-assets', debouncedQuery],
    queryFn: async () => {
      const res = await api.getAssets({ search: debouncedQuery, limit: 5 })
      return res.data?.data || res.data || []
    },
    enabled: debouncedQuery.length >= 2,
  })

  const { data: workOrders, isFetching: fetchingWOs } = useQuery({
    queryKey: ['autocomplete-work-orders', debouncedQuery],
    queryFn: async () => {
      const res = await api.getWorkOrders({ search: debouncedQuery, limit: 5 })
      return res.data?.data || res.data || []
    },
    enabled: debouncedQuery.length >= 2,
  })

  const { data: parts, isFetching: fetchingParts } = useQuery({
    queryKey: ['autocomplete-parts', debouncedQuery],
    queryFn: async () => {
      const res = await api.getParts({ search: debouncedQuery, limit: 5 })
      return res.data?.data || res.data || []
    },
    enabled: debouncedQuery.length >= 2,
  })

  const assetList = Array.isArray(assets) ? assets : []
  const woList = Array.isArray(workOrders) ? workOrders : []
  const partList = Array.isArray(parts) ? parts : []
  const isFetching = fetchingAssets || fetchingWOs || fetchingParts
  const hasResults = assetList.length > 0 || woList.length > 0 || partList.length > 0

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }, [debouncedQuery])

  const handleSelect = () => {
    setIsOpen(false)
    setQuery('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (q) {
      router.push(`/dashboard/search?q=${encodeURIComponent(q)}`)
      setIsOpen(false)
      setQuery('')
      inputRef.current?.blur()
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverAnchor asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search assets, work orders..."
              className="pl-10 bg-muted/50 border-none focus-visible:ring-1"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsOpen(false)
                  inputRef.current?.blur()
                }
              }}
              onFocus={() => {
                if (debouncedQuery.length >= 2) setIsOpen(true)
              }}
            />
          </div>
        </PopoverAnchor>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0 shadow-lg"
          align="start"
          sideOffset={8}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {isFetching && !hasResults ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm">Searching...</span>
            </div>
          ) : !hasResults && debouncedQuery.length >= 2 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <SearchX className="h-5 w-5 mb-2 opacity-50" />
              <span className="text-sm">No results found</span>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              {assetList.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30 border-b">
                    <Box className="h-3.5 w-3.5" />
                    Assets
                  </div>
                  {assetList.map((asset: any) => (
                    <Link
                      key={asset.id}
                      href={`/dashboard/assets/${asset.id}`}
                      onClick={handleSelect}
                      className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{asset.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {asset.assetNumber}{asset.location?.name ? ` · ${asset.location.name}` : ''}
                        </p>
                      </div>
                      {asset.status && (
                        <Badge variant="secondary" className="ml-2 text-[10px] shrink-0">
                          {asset.status.replace('_', ' ')}
                        </Badge>
                      )}
                    </Link>
                  ))}
                </div>
              )}

              {woList.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30 border-b">
                    <Wrench className="h-3.5 w-3.5" />
                    Work Orders
                  </div>
                  {woList.map((wo: any) => (
                    <Link
                      key={wo.id}
                      href={`/dashboard/work-orders/${wo.id}`}
                      onClick={handleSelect}
                      className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{wo.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {wo.woNumber}{wo.priority ? ` · ${wo.priority}` : ''}
                        </p>
                      </div>
                      {wo.status && (
                        <Badge variant="secondary" className="ml-2 text-[10px] shrink-0">
                          {wo.status.replace('_', ' ')}
                        </Badge>
                      )}
                    </Link>
                  ))}
                </div>
              )}

              {partList.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30 border-b">
                    <Package className="h-3.5 w-3.5" />
                    Parts
                  </div>
                  {partList.map((part: any) => (
                    <Link
                      key={part.id}
                      href={`/dashboard/inventory/parts/${part.id}`}
                      onClick={handleSelect}
                      className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{part.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {part.sku || 'No SKU'}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              <Link
                href={`/dashboard/search?q=${encodeURIComponent(query)}`}
                onClick={handleSelect}
                className="block px-3 py-2.5 text-center text-xs font-medium text-primary hover:bg-muted/50 transition-colors border-t"
              >
                View all results for "{query}"
              </Link>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </form>
  )
}
