'use client'

import { useState } from 'react'
import { format, subDays, startOfQuarter, startOfYear } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

// Extends Record<string, unknown> so the value is directly assignable to
// `params` on api.getXReport(dateRange) — those signatures take
// `Record<string, unknown>` after the type-tightening PR landed.
export interface DateRange extends Record<string, unknown> {
  startDate: string // yyyy-MM-dd
  endDate: string   // yyyy-MM-dd
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (value: DateRange) => void
  /** Override the default "Last 30 days" label. */
  defaultPresetLabel?: string
  className?: string
}

const fmt = (d: Date) => format(d, 'yyyy-MM-dd')
const today = () => fmt(new Date())

interface Preset {
  label: string
  range: () => DateRange
}

/**
 * The presets a user can pick. Each is calculated relative to "now"
 * at the moment it's clicked, so the active preset always reflects
 * a fresh range when the page is opened.
 */
const PRESETS: Preset[] = [
  {
    label: 'Last 7 days',
    range: () => ({ startDate: fmt(subDays(new Date(), 7)), endDate: today() }),
  },
  {
    label: 'Last 30 days',
    range: () => ({ startDate: fmt(subDays(new Date(), 30)), endDate: today() }),
  },
  {
    label: 'Last 90 days',
    range: () => ({ startDate: fmt(subDays(new Date(), 90)), endDate: today() }),
  },
  {
    label: 'This quarter',
    range: () => ({ startDate: fmt(startOfQuarter(new Date())), endDate: today() }),
  },
  {
    label: 'Year to date',
    range: () => ({ startDate: fmt(startOfYear(new Date())), endDate: today() }),
  },
]

/**
 * Detect which preset (if any) the current `value` matches, so the
 * matching button can render in `default` variant. Falls through to
 * `null` when the user has set a custom range.
 */
function matchPreset(value: DateRange): string | null {
  for (const p of PRESETS) {
    const r = p.range()
    if (r.startDate === value.startDate && r.endDate === value.endDate) {
      return p.label
    }
  }
  return null
}

/**
 * DateRangePicker — single shared control for the reports section.
 * Combines preset buttons with custom date inputs in a Popover, and
 * shows the active range as a Button trigger.
 *
 * Mirrors the API call shape every report page already uses
 * (`{ startDate, endDate }` in `yyyy-MM-dd`).
 */
export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const activePreset = matchPreset(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn('h-9 gap-2', className)}>
          <Calendar className="h-4 w-4" />
          <span className="text-sm">
            {activePreset ??
              `${format(new Date(value.startDate), 'MMM d, yyyy')} – ${format(new Date(value.endDate), 'MMM d, yyyy')}`}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-4">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Quick ranges</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESETS.map((p) => (
                <Button
                  key={p.label}
                  variant={activePreset === p.label ? 'default' : 'outline'}
                  size="sm"
                  className="justify-start text-xs"
                  onClick={() => {
                    onChange(p.range())
                    setOpen(false)
                  }}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 pt-1 border-t">
            <Label className="text-xs text-muted-foreground">Custom</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">From</Label>
                <Input
                  type="date"
                  value={value.startDate}
                  max={value.endDate}
                  onChange={(e) =>
                    onChange({ ...value, startDate: e.target.value })
                  }
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To</Label>
                <Input
                  type="date"
                  value={value.endDate}
                  min={value.startDate}
                  max={today()}
                  onChange={(e) =>
                    onChange({ ...value, endDate: e.target.value })
                  }
                  className="h-8"
                />
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Convenience: produce the default `Last 30 days` range. Pages can use
 * this in their `useState` initializer to match the picker's default.
 */
export function defaultDateRange(days = 30): DateRange {
  return {
    startDate: fmt(subDays(new Date(), days)),
    endDate: today(),
  }
}
