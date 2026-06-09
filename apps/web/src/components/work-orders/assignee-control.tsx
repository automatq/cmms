'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Combobox } from '@/components/ui/combobox'
import { Button } from '@/components/ui/button'
import { X, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

function displayName(u: any): string {
  if (!u) return 'User'
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.email || 'User'
}

type Assignee = { id: string; userId: string; user?: any }

export function AssigneeControl({
  workOrderId,
  assignedTo,
  assignees = [],
}: {
  workOrderId: string
  assignedTo?: { id: string } | null
  assignees?: Assignee[]
}) {
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['members', 'assignee'],
    queryFn: async () => {
      const res = await api.getUsers({ limit: 100 })
      return res?.data?.data ?? res?.data ?? []
    },
  })
  const members: any[] = Array.isArray(data) ? data : []

  const options = [
    { value: '', label: 'Unassigned' },
    ...members.map((u) => ({ value: u.id, label: displayName(u) })),
  ]

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId] })
    queryClient.invalidateQueries({ queryKey: ['work-orders'] })
  }

  const primaryMutation = useMutation({
    mutationFn: (assignedToId: string) =>
      api.updateWorkOrder(workOrderId, { assignedToId: assignedToId || null }),
    onSuccess: () => {
      invalidate()
      toast.success('Assignee updated')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to update assignee'),
  })

  const addMutation = useMutation({
    mutationFn: (userId: string) => api.addWorkOrderAssignee(workOrderId, userId),
    onSuccess: () => {
      invalidate()
      toast.success('Technician added')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to add technician'),
  })

  const removeMutation = useMutation({
    mutationFn: (userId: string) => api.removeWorkOrderAssignee(workOrderId, userId),
    onSuccess: () => {
      invalidate()
      toast.success('Technician removed')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to remove technician'),
  })

  // Crew = additional assignees, excluding whoever is the primary assignee.
  const crew = assignees.filter((a) => a.userId !== (assignedTo?.id ?? ''))
  const assignedIds = new Set<string>([assignedTo?.id ?? '', ...assignees.map((a) => a.userId)])
  const addableOptions = [
    { value: '', label: 'Add technician…' },
    ...members.filter((u) => !assignedIds.has(u.id)).map((u) => ({ value: u.id, label: displayName(u) })),
  ]

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Primary technician</p>
        <Combobox
          options={options}
          value={assignedTo?.id ?? ''}
          onChange={(v) => primaryMutation.mutate(v)}
          placeholder="Assign a technician…"
          searchPlaceholder="Search teammates…"
          disabled={primaryMutation.isPending}
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <UserPlus className="h-3.5 w-3.5" />
          Additional technicians
        </p>
        {crew.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {crew.map((a) => (
              <span
                key={a.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium"
              >
                {displayName(a.user)}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4"
                  onClick={() => removeMutation.mutate(a.userId)}
                  disabled={removeMutation.isPending}
                  title="Remove"
                >
                  <X className="h-3 w-3" />
                </Button>
              </span>
            ))}
          </div>
        )}
        <Combobox
          options={addableOptions}
          value=""
          onChange={(v) => v && addMutation.mutate(v)}
          placeholder="Add technician…"
          searchPlaceholder="Search teammates…"
          disabled={addMutation.isPending}
        />
      </div>
    </div>
  )
}
