'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PlayCircle, PauseCircle, CheckCircle2, Trash2, ArrowRight } from 'lucide-react'
import {
  getNextStatuses,
  getWorkOrderStatusMeta,
  WO_STATUS_META,
  type WorkOrderStatus,
} from '@/lib/status'

// The single forward action emphasised per status (others become secondary).
const PRIMARY_TARGET: Partial<Record<WorkOrderStatus, WorkOrderStatus>> = {
  requested: 'open',
  pending_approval: 'open',
  open: 'in_progress',
  in_progress: 'completed',
  on_hold: 'in_progress',
  completed: 'in_progress',
}

function transitionLabel(from: string, to: WorkOrderStatus): string {
  const key = `${from}->${to}`
  const map: Record<string, string> = {
    'requested->open': 'Open Work Order',
    'pending_approval->open': 'Approve & Open',
    'open->in_progress': 'Start Work',
    'in_progress->completed': 'Mark Completed',
    'in_progress->on_hold': 'Put on Hold',
    'on_hold->in_progress': 'Resume Work',
    'completed->in_progress': 'Reopen',
  }
  if (map[key]) return map[key]
  if (to === 'cancelled') return 'Cancel Work Order'
  if (to === 'on_hold') return 'Put on Hold'
  if (to === 'pending_approval') return 'Submit for Approval'
  if (to === 'requested') return 'Send Back'
  return `Move to ${WO_STATUS_META[to].label}`
}

function iconFor(to: WorkOrderStatus) {
  if (to === 'completed') return CheckCircle2
  if (to === 'on_hold') return PauseCircle
  if (to === 'in_progress' || to === 'open') return PlayCircle
  if (to === 'cancelled') return Trash2
  return ArrowRight
}

export function StatusTransitionControl({
  status,
  onSelect,
  disabled,
}: {
  status: string
  onSelect: (target: WorkOrderStatus) => void
  disabled?: boolean
}) {
  const next = getNextStatuses(status)

  if (next.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No further actions — this work order is {getWorkOrderStatusMeta(status).label.toLowerCase()}.
      </p>
    )
  }

  const primary = PRIMARY_TARGET[status as WorkOrderStatus]
  const hasPrimary = primary && next.includes(primary)
  const secondary = next.filter((s) => s !== 'cancelled' && s !== (hasPrimary ? primary : undefined))
  const canCancel = next.includes('cancelled')

  return (
    <div className="space-y-2">
      {hasPrimary && (
        <Button
          className={cn(
            'w-full justify-start',
            primary === 'completed' && 'bg-emerald-600 text-white hover:bg-emerald-700',
          )}
          disabled={disabled}
          onClick={() => onSelect(primary!)}
        >
          {(() => {
            const Icon = iconFor(primary!)
            return <Icon className="mr-2 h-4 w-4" />
          })()}
          {transitionLabel(status, primary!)}
        </Button>
      )}

      {secondary.map((s) => {
        const Icon = iconFor(s)
        return (
          <Button
            key={s}
            variant="secondary"
            className="w-full justify-start"
            disabled={disabled}
            onClick={() => onSelect(s)}
          >
            <Icon className="mr-2 h-4 w-4" />
            {transitionLabel(status, s)}
          </Button>
        )
      })}

      {canCancel && (
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive"
          disabled={disabled}
          onClick={() => onSelect('cancelled')}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Cancel Work Order
        </Button>
      )}
    </div>
  )
}
