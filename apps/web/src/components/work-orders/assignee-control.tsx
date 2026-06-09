'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Combobox } from '@/components/ui/combobox'
import { toast } from 'sonner'

function displayName(u: any): string {
  if (!u) return 'User'
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.email || 'User'
}

export function AssigneeControl({
  workOrderId,
  assignedTo,
}: {
  workOrderId: string
  assignedTo?: { id: string } | null
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

  const mutation = useMutation({
    mutationFn: (assignedToId: string) =>
      api.updateWorkOrder(workOrderId, { assignedToId: assignedToId || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId] })
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      toast.success('Assignee updated')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to update assignee'),
  })

  return (
    <Combobox
      options={options}
      value={assignedTo?.id ?? ''}
      onChange={(v) => mutation.mutate(v)}
      placeholder="Assign a technician…"
      searchPlaceholder="Search teammates…"
      disabled={mutation.isPending}
    />
  )
}
