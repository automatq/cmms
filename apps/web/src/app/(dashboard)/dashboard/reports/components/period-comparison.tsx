'use client'

import { subDays, differenceInCalendarDays, format } from 'date-fns'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DateRange } from './date-range-picker'

/**
 * Given the user-selected DateRange, return a DateRange of identical
 * length ending the day before the original `startDate`. Used to fetch
 * "previous period" alongside the active one.
 *
 *   active   = { 2026-04-01 → 2026-04-30 }  (30 days)
 *   previous = { 2026-03-02 → 2026-03-31 }  (30 days, ending day-before)
 */
export function previousPeriod(range: DateRange): DateRange {
  const start = new Date(range.startDate)
  const end = new Date(range.endDate)
  const lengthDays = differenceInCalendarDays(end, start)
  const prevEnd = subDays(start, 1)
  const prevStart = subDays(prevEnd, lengthDays)
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd')
  return { startDate: fmt(prevStart), endDate: fmt(prevEnd) }
}

interface PeriodComparisonToggleProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
  className?: string
}

/**
 * Simple toggle the user clicks to opt into "show me how this compares
 * to the previous equal-length period." Kept tiny so it slots next to
 * the DateRangePicker in the page header.
 */
export function PeriodComparisonToggle({
  enabled,
  onChange,
  className,
}: PeriodComparisonToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={cn(
        'inline-flex items-center gap-2 h-9 px-3 rounded-md border text-sm transition-colors',
        enabled
          ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
          : 'bg-background hover:bg-accent border-input',
        className,
      )}
      aria-pressed={enabled}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-sm border',
          enabled
            ? 'bg-primary-foreground border-primary-foreground'
            : 'bg-background border-input',
        )}
      />
      Compare to previous period
    </button>
  )
}

interface DeltaIndicatorProps {
  current: number | null | undefined
  previous: number | null | undefined
  /**
   * For metrics where higher is bad (e.g. avg completion time, downtime),
   * pass `inverse: true` so up-arrows render red and down-arrows green.
   */
  inverse?: boolean
  /** Format suffix shown after the percent, e.g. ' vs prev. period'. Optional. */
  suffix?: string
  /** Show absolute delta instead of percent when previous is zero. */
  className?: string
}

/**
 * Renders a small "+12.3%" / "−4.1%" pill with an up/down/no-change
 * arrow. Returns null when either value is missing (so the rest of the
 * card's layout doesn't shift around).
 */
export function DeltaIndicator({
  current,
  previous,
  inverse = false,
  suffix,
  className,
}: DeltaIndicatorProps) {
  if (current == null || previous == null) return null

  const delta = current - previous
  // Percent calc — guard against /0. When previous is 0 we just show
  // the absolute delta with no percent suffix.
  const percent = previous !== 0 ? (delta / Math.abs(previous)) * 100 : null

  const isUp = delta > 0.0001
  const isDown = delta < -0.0001
  const isFlat = !isUp && !isDown

  const goodWhenUp = !inverse
  const goodColor = 'text-emerald-600 dark:text-emerald-400'
  const badColor = 'text-rose-600 dark:text-rose-400'
  const flatColor = 'text-muted-foreground'

  const color = isFlat
    ? flatColor
    : (isUp ? goodWhenUp : !goodWhenUp)
      ? goodColor
      : badColor

  const Arrow = isFlat ? Minus : isUp ? ArrowUp : ArrowDown

  const label =
    percent != null
      ? `${delta >= 0 ? '+' : ''}${percent.toFixed(1)}%`
      : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}`

  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', color, className)}>
      <Arrow className="h-3 w-3" />
      <span>{label}</span>
      {suffix && <span className="font-normal text-muted-foreground ml-1">{suffix}</span>}
    </span>
  )
}
