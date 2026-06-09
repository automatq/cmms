'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { celebrate } from '@/lib/confetti'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  WO_STATUS_ORDER,
  WO_STATUS_META,
  getWorkOrderPriorityMeta,
  canTransition,
  type WorkOrderStatus,
} from '@/lib/status'

interface WorkOrder {
  id: string
  woNumber?: string
  title?: string
  status: string
  priority: string
  asset?: { name?: string }
}

/** Pure presentational card — shared by the draggable card and the drag overlay. */
function CardFace({ wo, overlay }: { wo: WorkOrder; overlay?: boolean }) {
  const priority = getWorkOrderPriorityMeta(wo.priority)
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-3 shadow-soft',
        overlay ? 'rotate-2 cursor-grabbing shadow-soft-lg' : 'transition-shadow hover:shadow-soft-md',
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-muted-foreground">{wo.woNumber}</span>
        <StatusBadge meta={priority} />
      </div>
      <p className="line-clamp-2 text-sm font-medium leading-snug">{wo.title || 'Untitled'}</p>
      {wo.asset?.name && <p className="mt-1.5 truncate text-xs text-muted-foreground">{wo.asset.name}</p>}
    </div>
  )
}

function DraggableCard({ wo }: { wo: WorkOrder }) {
  const router = useRouter()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: wo.id })
  // Record where the pointer went down (capture phase, before dnd-kit) so a
  // genuine click (no movement) navigates, while a drag does not.
  const downAt = React.useRef<{ x: number; y: number } | null>(null)

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onPointerDownCapture={(e) => {
        downAt.current = { x: e.clientX, y: e.clientY }
      }}
      onClick={(e) => {
        const s = downAt.current
        if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) < 5) {
          router.push(`/dashboard/work-orders/${wo.id}`)
        }
      }}
      className={cn('cursor-grab touch-none outline-none', isDragging && 'opacity-40')}
    >
      <CardFace wo={wo} />
    </div>
  )
}

function BoardColumn({
  status,
  items,
  activeStatus,
}: {
  status: WorkOrderStatus
  items: WorkOrder[]
  activeStatus: WorkOrderStatus | null
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const meta = WO_STATUS_META[status]
  // While a card is being dragged, a lane is a valid drop target only if the
  // state machine allows the move (or it's the card's current lane).
  const dragging = activeStatus !== null
  const isValidTarget = !dragging || activeStatus === status || canTransition(activeStatus!, status)

  return (
    <div className={cn('flex w-72 shrink-0 flex-col transition-opacity', dragging && !isValidTarget && 'opacity-40')}>
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className={cn('h-2 w-2 rounded-full', meta.dotClass)} />
        <span className="text-sm font-semibold">{meta.label}</span>
        <span className="ml-auto rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground">
          {items.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'min-h-[80px] flex-1 space-y-2 rounded-xl border border-dashed p-2 transition-colors',
          isOver && isValidTarget && 'border-primary bg-primary/10',
          isOver && !isValidTarget && 'border-destructive/50 bg-destructive/5',
          !isOver && 'border-border bg-muted/30',
        )}
      >
        {items.map((wo) => (
          <DraggableCard key={wo.id} wo={wo} />
        ))}
        {items.length === 0 && (
          <div className="flex h-20 items-center justify-center text-xs text-muted-foreground">
            {dragging && isValidTarget ? 'Drop here' : ''}
          </div>
        )}
      </div>
    </div>
  )
}

export function WorkOrdersBoard({ workOrders }: { workOrders: WorkOrder[] }) {
  const queryClient = useQueryClient()
  const [items, setItems] = React.useState<WorkOrder[]>(workOrders)
  const [activeId, setActiveId] = React.useState<string | null>(null)

  React.useEffect(() => setItems(workOrders), [workOrders])

  const sensors = useSensors(
    // 8px activation distance so a click still navigates rather than starts a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  )

  const activeWo = activeId ? items.find((w) => w.id === activeId) : null
  const activeStatus = (activeWo?.status as WorkOrderStatus | undefined) ?? null

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const woId = String(active.id)
    const target = String(over.id) as WorkOrderStatus
    const wo = items.find((w) => w.id === woId)
    if (!wo || wo.status === target) return

    if (!canTransition(wo.status, target)) {
      toast.error(
        `Can't move ${WO_STATUS_META[wo.status as WorkOrderStatus]?.label ?? wo.status} → ${WO_STATUS_META[target].label}`,
      )
      return
    }

    const prev = items
    setItems((cur) => cur.map((w) => (w.id === woId ? { ...w, status: target } : w)))

    api
      .updateWorkOrderStatus(woId, target)
      .then(() => {
        toast.success(`${wo.woNumber ?? 'Work order'} → ${WO_STATUS_META[target].label}`)
        if (target === 'completed') celebrate()
        queryClient.invalidateQueries({ queryKey: ['work-orders'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      })
      .catch((err: any) => {
        setItems(prev)
        toast.error(err?.response?.data?.message || 'Failed to update status')
      })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {WO_STATUS_ORDER.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            items={items.filter((w) => w.status === status)}
            activeStatus={activeStatus}
          />
        ))}
      </div>
      <DragOverlay>{activeWo ? <CardFace wo={activeWo} overlay /> : null}</DragOverlay>
    </DndContext>
  )
}
