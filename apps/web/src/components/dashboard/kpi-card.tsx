'use client'

import { useEffect, useState } from 'react'
import { animate } from 'framer-motion'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { ArrowDown, ArrowUp, type LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useChartTheme } from '@/hooks/use-chart-theme'

type Tint = 'primary' | 'emerald' | 'destructive' | 'blue'

const TINT: Record<Tint, { tile: string; icon: string }> = {
  primary: { tile: 'bg-primary/10', icon: 'text-primary' },
  emerald: { tile: 'bg-emerald-500/10', icon: 'text-emerald-500' },
  destructive: { tile: 'bg-destructive/10', icon: 'text-destructive' },
  blue: { tile: 'bg-blue-500/10', icon: 'text-blue-500' },
}

function useCountUp(value: number) {
  const [display, setDisplay] = useState(value)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value)
      return
    }
    const controls = animate(0, value, {
      duration: 0.7,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(v),
    })
    return () => controls.stop()
  }, [value])
  return Number.isInteger(value) ? Math.round(display).toString() : display.toFixed(1)
}

interface KpiCardProps {
  title: string
  value: number
  unit?: string
  icon: LucideIcon
  tint?: Tint
  subtitle?: string
  trend?: number
  trendDirection?: 'up' | 'down' | 'neutral'
  /** Sparkline series (raw values). */
  sparkline?: number[]
  valueClassName?: string
}

export function KpiCard({
  title,
  value,
  unit,
  icon: Icon,
  tint = 'primary',
  subtitle,
  trend,
  trendDirection,
  sparkline,
  valueClassName,
}: KpiCardProps) {
  const shown = useCountUp(value)
  const theme = useChartTheme()
  const t = TINT[tint]
  const hasDelta = trendDirection && trendDirection !== 'neutral' && typeof trend === 'number'
  const sparkData = (sparkline ?? []).map((v, i) => ({ i, v }))

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-soft-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-full', t.tile)}>
          <Icon className={cn('h-4 w-4', t.icon)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-2">
          <div>
            <div className={cn('text-2xl font-bold tnum', valueClassName)}>
              {shown}
              {unit ? <span className="ml-0.5 text-lg">{unit}</span> : null}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              {hasDelta && (
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 text-xs font-semibold',
                    trendDirection === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                  )}
                >
                  {trendDirection === 'up' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {Math.abs(trend!)}%
                </span>
              )}
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          {sparkData.length > 1 && (
            <div className="h-10 w-24 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
                  <defs>
                    <linearGradient id={`spark-${tint}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={theme.colors[0]} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={theme.colors[0]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke={theme.colors[0]}
                    strokeWidth={2}
                    fill={`url(#spark-${tint})`}
                    isAnimationActive={false}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
