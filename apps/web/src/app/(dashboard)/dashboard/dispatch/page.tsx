'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { getWorkOrderPriorityMeta, getWorkOrderStatusMeta } from '@/lib/status'
import { User as UserIcon, Inbox } from 'lucide-react'

const UNASSIGNED = 'unassigned'

interface DispatchWo {
  id: string
  woNumber?: string
  title?: string
  status: string
  priority: string
  assignedToId?: string | null
  asset?: { name?: string }
}

interface Tech {
  id: string
  firstName?: string
  lastName?: string
  username?: string
  email?: string
}

function displayName(u: Tech): string {
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.email || 'User'
}

/** Pure presentational card — shared by the draggable card and the drag overlay. */
function CardFace({ wo, overlay }: { wo: DispatchWo; overlay?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-3 shadow-soft',
        overlay ? 'rotate-2 cursor-grabbing shadow-soft-lg' : 'transition-shadow hover:shadow-soft-md',
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-muted-foreground">{wo.woNumber}</span>
        <div className="flex items-center gap-1">
          <StatusBadge meta={getWorkOrderPriorityMeta(wo.priority)} />
          <StatusBadge meta={getWorkOrderStatusMeta(wo.status)} />
        </div>
      </div>
      <p className="line-clamp-2 text-sm font-medium leading-snug">{wo.title || 'Untitled'}</p>
      {wo.asset?.name && <p className="mt-1.5 truncate text-xs text-muted-foreground">{wo.asset.name}</p>}
    </div>
  )
}

function DraggableCard({ wo }: { wo: DispatchWo }) {
  const router = useRouter()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: wo.id })
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

function TechColumn({
  columnId,
  title,
  items,
  dragging,
}: {
  columnId: string
  title: string
  items: DispatchWo[]
  dragging: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId })
  const urgent = items.filter((w) => w.priority === 'critical' || w.priority === 'high').length

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        {columnId === UNASSIGNED ? (
          <Inbox className="h-4 w-4 text-muted-foreground" />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
            <UserIcon className="h-3.5 w-3.5 text-primary" />
          </div>
        )}
        <span className="truncate text-sm font-semibold">{title}</span>
        <span className="ml-auto flex items-center gap-1.5">
          {urgent > 0 && (
            <span className="rounded-full bg-destructive/10 px-2 text-xs font-medium text-destructive">
              {urgent} urgent
            </span>
          )}
          <span className="rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground">
            {items.length}
          </span>
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'min-h-[120px] flex-1 space-y-2 rounded-xl border border-dashed p-2 transition-colors',
          isOver ? 'border-primary bg-primary/10' : 'border-border bg-muted/30',
        )}
      >
        {items.map((wo) => (
          <DraggableCard key={wo.id} wo={wo} />
        ))}
        {items.length === 0 && (
          <div className="flex h-20 items-center justify-center text-xs text-muted-foreground">
            {dragging ? 'Drop to assign' : 'No work orders'}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DispatchPage() {
  const queryClient = useQueryClient()
  const [items, setItems] = React.useState<DispatchWo[]>([])
  const [activeId, setActiveId] = React.useState<string | null>(null)

  const { data: woData, isLoading: isLoadingWos } = useQuery({
    queryKey: ['work-orders', 'dispatch'],
    queryFn: async () =>
      (await api.getWorkOrders({ status: ['requested', 'open', 'in_progress'], limit: 200 })).data,
  })

  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['members', 'dispatch'],
    queryFn: async () => {
      const res = await api.getUsers({ limit: 100 })
      return res?.data?.data ?? res?.data ?? []
    },
  })

  React.useEffect(() => {
    if (woData?.data) setItems(woData.data as DispatchWo[])
  }, [woData])

  const techs: Tech[] = Array.isArray(usersData) ? usersData : []

  // Busiest technicians first so dispatchers see load imbalance immediately.
  const orderedTechs = React.useMemo(() => {
    const load = new Map<string, number>()
    for (const w of items) {
      if (w.assignedToId) load.set(w.assignedToId, (load.get(w.assignedToId) || 0) + 1)
    }
    return [...techs].sort((a, b) => (load.get(b.id) || 0) - (load.get(a.id) || 0))
  }, [techs, items])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  )

  const activeWo = activeId ? items.find((w) => w.id === activeId) : null

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const woId = String(active.id)
    const target = String(over.id)
    const wo = items.find((w) => w.id === woId)
    const current = wo?.assignedToId || UNASSIGNED
    if (!wo || current === target) return

    const newAssignee = target === UNASSIGNED ? null : target
    const prev = items
    setItems((cur) => cur.map((w) => (w.id === woId ? { ...w, assignedToId: newAssignee } : w)))

    api
      // '' is the API's explicit-unassign convention on assignedToId.
      .updateWorkOrder(woId, { assignedToId: newAssignee ?? '' })
      .then(() => {
        const tech = newAssignee ? techs.find((t) => t.id === newAssignee) : null
        toast.success(
          tech
            ? `${wo.woNumber ?? 'Work order'} → ${displayName(tech)}`
            : `${wo.woNumber ?? 'Work order'} unassigned`,
        )
        queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      })
      .catch((err: any) => {
        setItems(prev)
        toast.error(err?.response?.data?.message || 'Failed to reassign')
      })
  }

  if (isLoadingWos || isLoadingUsers) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-1/2" />
        <div className="flex gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-72 w-72 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dispatch"
        description="Drag work orders between technicians to balance the workload."
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          <TechColumn
            columnId={UNASSIGNED}
            title="Unassigned"
            items={items.filter((w) => !w.assignedToId)}
            dragging={activeId !== null}
          />
          {orderedTechs.map((tech) => (
            <TechColumn
              key={tech.id}
              columnId={tech.id}
              title={displayName(tech)}
              items={items.filter((w) => w.assignedToId === tech.id)}
              dragging={activeId !== null}
            />
          ))}
        </div>
        <DragOverlay>{activeWo ? <CardFace wo={activeWo} overlay /> : null}</DragOverlay>
      </DndContext>
    </div>
  )
}
