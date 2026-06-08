/**
 * Single source of truth for domain status/priority/stock visuals + the
 * work-order state machine (mirrored from the API).
 *
 * Before this module, status/priority colors were duplicated across ~11 page
 * files with THREE different conventions and several disagreements (e.g.
 * `medium` priority was yellow in the list but blue on the detail page, and the
 * detail page mapped a non-existent `emergency` priority). Everything visual
 * for these domains should come from here.
 *
 * Convention: badges use the translucent `bg-X-500/10 text-X-600 dark:text-X-400`
 * style (legible in light + dark, theme-neutral so semantic meaning is stable
 * across all 6 colorways). `dotClass` is a solid swatch for compact indicators.
 *
 * Class strings are written out STATICALLY (via COLOR_CLASSES) rather than built
 * from template literals, so Tailwind's content scanner can see them and they
 * survive the production purge.
 */
import {
  Inbox,
  Hourglass,
  CircleDot,
  Loader,
  PauseCircle,
  CheckCircle2,
  XCircle,
  Flame,
  ArrowUp,
  Equal,
  ArrowDown,
  CircleSlash,
  Wrench,
  Archive,
  type LucideIcon,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

export type WorkOrderStatus =
  | 'requested'
  | 'pending_approval'
  | 'open'
  | 'in_progress'
  | 'on_hold'
  | 'completed'
  | 'cancelled'

export type WorkOrderPriority = 'critical' | 'high' | 'medium' | 'low'

export type AssetStatus = 'active' | 'inactive' | 'under_repair' | 'retired'

export interface StatusMeta {
  /** Human label, e.g. "In Progress". */
  label: string
  /** Translucent badge classes (light + dark safe). */
  badgeClass: string
  /** Solid dot/swatch classes for compact indicators. */
  dotClass: string
  /** Soft tinted surface for icon tiles, e.g. WO list avatar. */
  tileClass: string
  /** Foreground accent for an icon shown on a tinted/neutral surface. */
  iconClass: string
  /** Opaque/frosted pill for overlaying on imagery (white text). */
  overlayClass: string
  /** Representative icon. */
  icon: LucideIcon
}

type ColorName =
  | 'slate'
  | 'violet'
  | 'blue'
  | 'amber'
  | 'orange'
  | 'emerald'
  | 'rose'
  | 'red'

interface ColorClasses {
  badge: string
  dot: string
  tile: string
  icon: string
  overlay: string
}

// Static class table — every literal here is what Tailwind scans for.
const COLOR_CLASSES: Record<ColorName, ColorClasses> = {
  slate: {
    badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20',
    dot: 'bg-slate-500',
    tile: 'bg-slate-500/10',
    icon: 'text-slate-500',
    overlay: 'bg-slate-500/90 text-white',
  },
  violet: {
    badge: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
    dot: 'bg-violet-500',
    tile: 'bg-violet-500/10',
    icon: 'text-violet-500',
    overlay: 'bg-violet-500/90 text-white',
  },
  blue: {
    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    dot: 'bg-blue-500',
    tile: 'bg-blue-500/10',
    icon: 'text-blue-500',
    overlay: 'bg-blue-500/90 text-white',
  },
  amber: {
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    dot: 'bg-amber-500',
    tile: 'bg-amber-500/10',
    icon: 'text-amber-500',
    overlay: 'bg-amber-500/90 text-white',
  },
  orange: {
    badge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    dot: 'bg-orange-500',
    tile: 'bg-orange-500/10',
    icon: 'text-orange-500',
    overlay: 'bg-orange-500/90 text-white',
  },
  emerald: {
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    dot: 'bg-emerald-500',
    tile: 'bg-emerald-500/10',
    icon: 'text-emerald-500',
    overlay: 'bg-emerald-500/90 text-white',
  },
  rose: {
    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    dot: 'bg-rose-500',
    tile: 'bg-rose-500/10',
    icon: 'text-rose-500',
    overlay: 'bg-rose-500/90 text-white',
  },
  red: {
    badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    dot: 'bg-red-500',
    tile: 'bg-red-500/10',
    icon: 'text-red-500',
    overlay: 'bg-red-500/90 text-white',
  },
}

const FALLBACK_META: StatusMeta = {
  label: 'Unknown',
  badgeClass: 'bg-muted text-muted-foreground border-transparent',
  dotClass: 'bg-muted-foreground',
  tileClass: 'bg-muted',
  iconClass: 'text-muted-foreground',
  overlayClass: 'bg-slate-700/90 text-white',
  icon: CircleDot,
}

function meta(label: string, color: ColorName, icon: LucideIcon): StatusMeta {
  const c = COLOR_CLASSES[color]
  return {
    label,
    badgeClass: c.badge,
    dotClass: c.dot,
    tileClass: c.tile,
    iconClass: c.icon,
    overlayClass: c.overlay,
    icon,
  }
}

// ── Work-order status ────────────────────────────────────────────────────────

export const WO_STATUS_META: Record<WorkOrderStatus, StatusMeta> = {
  requested: meta('Requested', 'slate', Inbox),
  pending_approval: meta('Pending Approval', 'violet', Hourglass),
  open: meta('Open', 'blue', CircleDot),
  in_progress: meta('In Progress', 'amber', Loader),
  on_hold: meta('On Hold', 'orange', PauseCircle),
  completed: meta('Completed', 'emerald', CheckCircle2),
  cancelled: meta('Cancelled', 'rose', XCircle),
}

export const WO_STATUS_ORDER: WorkOrderStatus[] = [
  'requested',
  'pending_approval',
  'open',
  'in_progress',
  'on_hold',
  'completed',
  'cancelled',
]

export function getWorkOrderStatusMeta(status: string): StatusMeta {
  return WO_STATUS_META[status as WorkOrderStatus] ?? FALLBACK_META
}

// ── Work-order priority ──────────────────────────────────────────────────────

export const WO_PRIORITY_META: Record<WorkOrderPriority, StatusMeta> = {
  critical: meta('Critical', 'red', Flame),
  high: meta('High', 'orange', ArrowUp),
  medium: meta('Medium', 'amber', Equal),
  low: meta('Low', 'slate', ArrowDown),
}

export const WO_PRIORITY_ORDER: WorkOrderPriority[] = ['critical', 'high', 'medium', 'low']

export function getWorkOrderPriorityMeta(priority: string): StatusMeta {
  return WO_PRIORITY_META[priority as WorkOrderPriority] ?? FALLBACK_META
}

// ── Asset status ─────────────────────────────────────────────────────────────

export const ASSET_STATUS_META: Record<AssetStatus, StatusMeta> = {
  active: meta('Active', 'emerald', CheckCircle2),
  inactive: meta('Inactive', 'slate', CircleSlash),
  under_repair: meta('Under Repair', 'amber', Wrench),
  retired: meta('Retired', 'rose', Archive),
}

export function getAssetStatusMeta(status: string): StatusMeta {
  return ASSET_STATUS_META[status as AssetStatus] ?? FALLBACK_META
}

// ── Stock level ──────────────────────────────────────────────────────────────

export type StockLevel = 'out' | 'low' | 'ok'

export interface StockMeta {
  level: StockLevel
  label: string
  badgeClass: string
  /** Progress-bar fill class. */
  barClass: string
  /** 0–100 fill, with the reorder point sitting at ~50% when defined. */
  percent: number
}

export function getStockMeta(qtyOnHand: number, reorderPoint = 0): StockMeta {
  const qty = Number(qtyOnHand) || 0
  const reorder = Number(reorderPoint) || 0

  let percent: number
  if (reorder > 0) {
    percent = Math.max(0, Math.min(100, (qty / (reorder * 2)) * 100))
  } else {
    percent = qty > 0 ? 100 : 0
  }

  if (qty <= 0) {
    return {
      level: 'out',
      label: 'Out of stock',
      badgeClass: COLOR_CLASSES.red.badge,
      barClass: COLOR_CLASSES.red.dot,
      percent,
    }
  }
  if (reorder > 0 && qty <= reorder) {
    return {
      level: 'low',
      label: 'Low stock',
      badgeClass: COLOR_CLASSES.amber.badge,
      barClass: COLOR_CLASSES.amber.dot,
      percent,
    }
  }
  return {
    level: 'ok',
    label: 'In stock',
    badgeClass: COLOR_CLASSES.emerald.badge,
    barClass: COLOR_CLASSES.emerald.dot,
    percent,
  }
}

// ── Work-order state machine (mirror of apps/api/.../state-machine.ts) ────────
// Keep in sync with the authoritative server-side transitions. The board and the
// status-transition control consume this; they must never invent transitions.

export const WO_STATUS_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  requested: ['open', 'pending_approval', 'cancelled'],
  pending_approval: ['open', 'requested', 'cancelled'],
  open: ['in_progress', 'on_hold', 'cancelled'],
  in_progress: ['on_hold', 'completed', 'cancelled'],
  on_hold: ['open', 'in_progress', 'cancelled'],
  completed: ['in_progress'],
  cancelled: [],
}

export function getNextStatuses(status: string): WorkOrderStatus[] {
  return WO_STATUS_TRANSITIONS[status as WorkOrderStatus] ?? []
}

export function canTransition(from: string, to: string): boolean {
  return getNextStatuses(from).includes(to as WorkOrderStatus)
}

export function isTerminal(status: string): boolean {
  return getNextStatuses(status).length === 0
}
