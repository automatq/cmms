import * as React from 'react'
import { cn } from '@/lib/utils'
import type { StatusMeta } from '@/lib/status'

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  meta: StatusMeta
  /** Show a leading solid dot. */
  dot?: boolean
  /** Show the meta's icon. */
  icon?: boolean
  /** Render label in ALL CAPS with wider tracking (compact list style). */
  uppercase?: boolean
}

/**
 * Consistent status/priority pill driven by the central meta in `lib/status.ts`.
 * Pass a meta from `getWorkOrderStatusMeta` / `getWorkOrderPriorityMeta` /
 * `getAssetStatusMeta`.
 */
export function StatusBadge({
  meta,
  dot = false,
  icon = false,
  uppercase = false,
  className,
  ...props
}: StatusBadgeProps) {
  const Icon = meta.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        uppercase && 'text-[10px] font-bold uppercase tracking-wider',
        meta.badgeClass,
        className,
      )}
      {...props}
    >
      {dot && <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', meta.dotClass)} />}
      {icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      {meta.label}
    </span>
  )
}
