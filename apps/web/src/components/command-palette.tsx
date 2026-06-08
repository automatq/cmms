'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { primaryNav, settingsSubNav, reportSubNav, quickCreate } from '@/lib/nav'
import { api } from '@/lib/api'
import { useDebounce } from '@/hooks/use-debounce'
import { Package, ClipboardList, Wrench } from 'lucide-react'

/** Fire from anywhere (e.g. the header button) to open the palette. */
export function openCommandPalette() {
  window.dispatchEvent(new Event('open-command-palette'))
}

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const debounced = useDebounce(query, 250)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    const onOpen = () => setOpen(true)
    document.addEventListener('keydown', onKey)
    window.addEventListener('open-command-palette', onOpen)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('open-command-palette', onOpen)
    }
  }, [])

  const term = debounced.trim()
  const { data: results } = useQuery({
    queryKey: ['command-search', term],
    queryFn: async () => {
      const [assets, workOrders, parts] = await Promise.all([
        api.getAssets({ search: term, limit: 5 }),
        api.getWorkOrders({ search: term, limit: 5 }),
        api.getParts({ search: term, limit: 5 }),
      ])
      const unwrap = (r: any) => r?.data?.data ?? r?.data ?? []
      return {
        assets: unwrap(assets),
        workOrders: unwrap(workOrders),
        parts: unwrap(parts),
      }
    },
    enabled: open && term.length >= 2,
    staleTime: 10_000,
  })

  const go = (href: string) => {
    setOpen(false)
    setQuery('')
    router.push(href)
  }

  const navItems = [...primaryNav, ...settingsSubNav, ...reportSubNav]
  const hasSearchHits =
    !!results && (results.assets.length > 0 || results.workOrders.length > 0 || results.parts.length > 0)

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput value={query} onValueChange={setQuery} placeholder="Search or jump to…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {hasSearchHits && (
          <>
            {results!.workOrders.length > 0 && (
              <CommandGroup heading="Work Orders">
                {results!.workOrders.map((wo: any) => (
                  <CommandItem
                    key={`wo-${wo.id}`}
                    value={`wo ${wo.title ?? ''} ${wo.woNumber ?? ''}`}
                    onSelect={() => go(`/dashboard/work-orders/${wo.id}`)}
                  >
                    <ClipboardList />
                    <span className="truncate">{wo.title || 'Work Order'}</span>
                    {wo.woNumber && <CommandShortcut>{wo.woNumber}</CommandShortcut>}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {results!.assets.length > 0 && (
              <CommandGroup heading="Assets">
                {results!.assets.map((a: any) => (
                  <CommandItem
                    key={`asset-${a.id}`}
                    value={`asset ${a.name ?? ''} ${a.assetNumber ?? ''}`}
                    onSelect={() => go(`/dashboard/assets/${a.id}`)}
                  >
                    <Package />
                    <span className="truncate">{a.name}</span>
                    {a.assetNumber && <CommandShortcut>{a.assetNumber}</CommandShortcut>}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {results!.parts.length > 0 && (
              <CommandGroup heading="Parts">
                {results!.parts.map((p: any) => (
                  <CommandItem
                    key={`part-${p.id}`}
                    value={`part ${p.name ?? ''} ${p.sku ?? ''}`}
                    onSelect={() => go(`/dashboard/inventory/parts/${p.id}`)}
                  >
                    <Wrench />
                    <span className="truncate">{p.name}</span>
                    {p.sku && <CommandShortcut>{p.sku}</CommandShortcut>}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Quick Create">
          {quickCreate.map((item) => {
            const Icon = item.icon
            return (
              <CommandItem
                key={item.href}
                value={`create ${item.name} ${item.keywords ?? ''}`}
                onSelect={() => go(item.href)}
              >
                <Icon />
                {item.name}
              </CommandItem>
            )
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigate">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <CommandItem key={item.href} value={`go ${item.name}`} onSelect={() => go(item.href)}>
                <Icon />
                {item.name}
              </CommandItem>
            )
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
