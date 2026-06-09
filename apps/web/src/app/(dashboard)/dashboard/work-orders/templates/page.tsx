'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, ClipboardList } from 'lucide-react'
import { toast } from 'sonner'

type WoTemplate = {
  id: string
  name: string
  description?: string
  type: string
  defaultPriority: string
  checklistTemplateId?: string
  estimatedHours?: number
}

const EMPTY = {
  name: '',
  description: '',
  type: 'corrective',
  defaultPriority: 'medium',
  checklistTemplateId: '',
  estimatedHours: '',
}

export default function WoTemplatesPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<WoTemplate | null>(null)
  const [form, setForm] = useState<typeof EMPTY>(EMPTY)

  const { data: templates, isLoading } = useQuery({
    queryKey: ['wo-templates'],
    queryFn: async () => (await api.getWoTemplates()).data as WoTemplate[],
  })

  const { data: checklistTemplates } = useQuery({
    queryKey: ['checklist-templates'],
    queryFn: async () => (await api.getChecklistTemplates()).data,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['wo-templates'] })

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      editing ? api.updateWoTemplate(editing.id, payload) : api.createWoTemplate(payload),
    onSuccess: () => {
      invalidate()
      toast.success(editing ? 'Template updated' : 'Template created')
      setOpen(false)
    },
    onError: () => toast.error('Failed to save template'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteWoTemplate(id),
    onSuccess: () => {
      invalidate()
      toast.success('Template deleted')
    },
    onError: () => toast.error('Failed to delete template'),
  })

  const openNew = () => {
    setEditing(null)
    setForm(EMPTY)
    setOpen(true)
  }

  const openEdit = (t: WoTemplate) => {
    setEditing(t)
    setForm({
      name: t.name,
      description: t.description || '',
      type: t.type,
      defaultPriority: t.defaultPriority,
      checklistTemplateId: t.checklistTemplateId || '',
      estimatedHours: t.estimatedHours != null ? String(t.estimatedHours) : '',
    })
    setOpen(true)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    saveMutation.mutate({
      name: form.name,
      description: form.description || undefined,
      type: form.type,
      defaultPriority: form.defaultPriority,
      checklistTemplateId: form.checklistTemplateId || undefined,
      estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work Order Templates"
        description="Reusable templates for ad-hoc corrective and inspection jobs."
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : !templates || templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center border border-dashed rounded-lg">
          <ClipboardList className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No templates yet. Create one to speed up new work orders.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {t.type} · {t.defaultPriority}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => deleteMutation.mutate(t.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {t.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{t.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Template' : 'New Template'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Quarterly safety inspection"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select id="type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="corrective">Corrective</option>
                  <option value="preventive">Preventive</option>
                  <option value="inspection">Inspection</option>
                  <option value="emergency">Emergency</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  id="priority"
                  value={form.defaultPriority}
                  onChange={(e) => setForm({ ...form, defaultPriority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="checklist">Checklist template</Label>
                <Select
                  id="checklist"
                  value={form.checklistTemplateId}
                  onChange={(e) => setForm({ ...form, checklistTemplateId: e.target.value })}
                >
                  <option value="">None</option>
                  {(checklistTemplates || []).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hours">Estimated hours</Label>
                <Input
                  id="hours"
                  type="number"
                  step="0.25"
                  min="0"
                  value={form.estimatedHours}
                  onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
