'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function NewWorkOrderPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'corrective',
    priority: 'medium',
    assetId: '',
    locationId: '',
    assignedTo: '',
    checklistTemplateId: '',
    dueDate: '',
    estimatedHours: '',
  })

  const { data: assets } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const res = await api.getAssets({ limit: 100 })
      return res.data
    },
  })

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const res = await api.getLocations()
      return res.data?.data || res.data || []
    },
  })

  const { data: users } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const res = await api.getUsers({ limit: 200 })
      return res.data?.data || res.data || []
    },
  })

  const { data: checklistTemplates } = useQuery({
    queryKey: ['checklist-templates'],
    queryFn: async () => {
      const res = await api.getChecklistTemplates()
      return res.data?.data || res.data || []
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createWorkOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      toast.success('Work order created')
      router.push('/dashboard/work-orders')
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to create work order')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const data: any = {
      title: formData.title,
      description: formData.description || undefined,
      type: formData.type,
      priority: formData.priority,
      assetId: formData.assetId || undefined,
      locationId: formData.locationId || undefined,
      assignedTo: formData.assignedTo || undefined,
      checklistTemplateId: formData.checklistTemplateId || undefined,
      dueDate: formData.dueDate || undefined,
      estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
    }

    Object.keys(data).forEach(key => data[key] === undefined && delete data[key])

    createMutation.mutate(data)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/work-orders">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Work Order</h1>
          <p className="text-muted-foreground">Create a new work order</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Work order title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed description of the work required"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  id="type"
                  value={formData.type}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="corrective">Corrective</option>
                  <option value="preventive">Preventive</option>
                  <option value="emergency">Emergency</option>
                  <option value="project">Project</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  id="priority"
                  value={formData.priority}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="asset">Asset</Label>
                <Select
                  id="asset"
                  value={formData.assetId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, assetId: e.target.value })}
                >
                  <option value="">Select asset (optional)</option>
                  {assets?.data?.map((asset: any) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.assetNumber} - {asset.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Select
                  id="location"
                  value={formData.locationId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, locationId: e.target.value })}
                >
                  <option value="">Select location (optional)</option>
                  {Array.isArray(locations) && locations.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="assignedTo">Assign To</Label>
                <Select
                  id="assignedTo"
                  value={formData.assignedTo}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, assignedTo: e.target.value })}
                >
                  <option value="">Select technician (optional)</option>
                  {Array.isArray(users) && users.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName}{u.jobTitle ? ` — ${u.jobTitle}` : ''}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="checklistTemplate">Checklist Template</Label>
                <Select
                  id="checklistTemplate"
                  value={formData.checklistTemplateId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, checklistTemplateId: e.target.value })}
                >
                  <option value="">None</option>
                  {Array.isArray(checklistTemplates) && checklistTemplates.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedHours">Estimated Hours</Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  step="0.5"
                  value={formData.estimatedHours}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, estimatedHours: e.target.value })}
                  placeholder="0.0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={createMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {createMutation.isPending ? 'Saving...' : 'Create Work Order'}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/work-orders">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
