'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface FilterOption {
  id: string
  label: string
}

interface FilterChipsProps {
  label: string
  options: FilterOption[]
  value: string[]
  onChange: (next: string[]) => void
  /** Optional placeholder for the search box inside the popover. */
  searchPlaceholder?: string
  className?: string
}

/**
 * Generic multi-select control rendered as a Popover button. Used by
 * report pages to filter by location / asset category / technician.
 * Visible state on the trigger is "Label: All", "Label: Foo", or
 * "Label: 3 selected". Clearing all selections returns the trigger to
 * "All."
 */
export function FilterChips({
  label,
  options,
  value,
  onChange,
  searchPlaceholder = 'Search…',
  className,
}: FilterChipsProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  const selectedSet = new Set(value)
  const toggle = (id: string) => {
    const next = selectedSet.has(id) ? value.filter((v) => v !== id) : [...value, id]
    onChange(next)
  }
  const clear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange([])
  }

  const triggerText =
    value.length === 0
      ? 'All'
      : value.length === 1
        ? (options.find((o) => o.id === value[0])?.label ?? '1 selected')
        : `${value.length} selected`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn('h-9 gap-2 px-3', value.length > 0 && 'border-primary', className)}
        >
          <span className="text-xs text-muted-foreground">{label}:</span>
          <span className="text-sm font-medium">{triggerText}</span>
          {value.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={clear}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && clear(e as unknown as React.MouseEvent)}
              className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-sm hover:bg-muted"
              aria-label={`Clear ${label} filter`}
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <div className="border-b p-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 text-sm"
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">No matches</p>
          ) : (
            filtered.map((o) => {
              const selected = selectedSet.has(o.id)
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggle(o.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent',
                    selected && 'bg-accent/50',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 items-center justify-center rounded-sm border',
                      selected ? 'bg-primary border-primary text-primary-foreground' : 'border-input',
                    )}
                  >
                    {selected && <Check className="h-3 w-3" />}
                  </span>
                  <span className="truncate">{o.label}</span>
                </button>
              )
            })
          )}
        </div>
        {value.length > 0 && (
          <div className="border-t p-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{value.length} selected</span>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onChange([])}>
              Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
