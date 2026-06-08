'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

export interface ChartTheme {
  /** Series colors (--chart-1..5), as `hsl(...)` strings. */
  colors: string[]
  /** Grid + tooltip border (--border). */
  grid: string
  /** Axis text/ticks (--muted-foreground). */
  axis: string
  /** Tooltip surface (--popover). */
  tooltipBg: string
  /** Tooltip border (--border). */
  tooltipBorder: string
  /** Tooltip text (--popover-foreground). */
  tooltipText: string
  /** Hover-cursor highlight fill (--muted). */
  cursor: string
}

// SSR-safe fallback (neutral light theme). Used until the first client-side
// resolve runs in an effect — keeps server and client markup identical so there
// is no hydration mismatch, then swaps to the live theme values on mount.
const FALLBACK: ChartTheme = {
  colors: [
    'hsl(12 76% 61%)',
    'hsl(173 58% 39%)',
    'hsl(197 37% 24%)',
    'hsl(43 74% 66%)',
    'hsl(27 87% 67%)',
  ],
  grid: 'hsl(240 5.9% 90%)',
  axis: 'hsl(240 3.8% 46.1%)',
  tooltipBg: 'hsl(0 0% 100%)',
  tooltipBorder: 'hsl(240 5.9% 90%)',
  tooltipText: 'hsl(240 10% 3.9%)',
  cursor: 'hsl(240 4.8% 95.9%)',
}

function readVar(name: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v ? `hsl(${v})` : ''
}

function resolveTheme(): ChartTheme {
  const colors = [1, 2, 3, 4, 5].map((i) => readVar(`--chart-${i}`)).filter(Boolean)
  return {
    colors: colors.length ? colors : FALLBACK.colors,
    grid: readVar('--border') || FALLBACK.grid,
    axis: readVar('--muted-foreground') || FALLBACK.axis,
    tooltipBg: readVar('--popover') || FALLBACK.tooltipBg,
    tooltipBorder: readVar('--border') || FALLBACK.tooltipBorder,
    tooltipText: readVar('--popover-foreground') || FALLBACK.tooltipText,
    cursor: readVar('--muted') || FALLBACK.cursor,
  }
}

/**
 * Resolves recharts colors from the active CSS theme variables so charts honor
 * dark mode AND all 6 color themes. Re-resolves on light/dark switch (next-themes)
 * and on `data-theme` colorway switch (MutationObserver on <html>).
 */
export function useChartTheme(): ChartTheme {
  const { resolvedTheme } = useTheme()
  const [theme, setTheme] = useState<ChartTheme>(FALLBACK)

  useEffect(() => {
    setTheme(resolveTheme())

    const observer = new MutationObserver(() => setTheme(resolveTheme()))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class', 'style'],
    })
    return () => observer.disconnect()
  }, [resolvedTheme])

  return theme
}
