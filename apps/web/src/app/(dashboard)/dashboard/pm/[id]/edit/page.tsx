'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function EditPmPlanPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const params = useParams()
  const id = params?.id as string

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true,
    priority: 'medium',
    estimatedHours: '',
    triggerType: 'time_based',
    frequencyValue: '',
    frequencyUnit: 'days',
    meterInterval: '',
    meterUnit: '',
    nextDueAt: '',
    assetId: '',
    assignedTo: '',
    checklistTemplateId: '',
  })

  const { data: pm, isLoading } = useQuery({
    queryKey: ['pm', id],
    queryFn: async () => {
      const res = await api.getPmPlan(id)
      return res.data
    },
    enabled: !!id,
  })

  const { data: assets } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const res = await api.getAssets({ limit: 200 })
      return res.data?.data || res.data || []
    },
  })

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.getUsers({ limit: 200 })
      return res.data?.data || res.data || []
    },
  })

  const { data: templates } = useQuery({
    queryKey: ['checklist-templates'],
    queryFn: async () => {
      const res = await api.getChecklistTemplates()
      return res.data || []
    },
  })

  useEffect(() => {
    if (pm) {
      setFormData({
        name: pm.name || '',
        description: pm.description || '',
        isActive: pm.isActive ?? true,
        priority: pm.priority || 'medium',
        estimatedHours: pm.estimatedHours ? String(pm.estimatedHours) : '',
        triggerType: pm.triggerType || 'time_based',
        frequencyValue: pm.frequencyValue ? String(pm.frequencyValue) : '',
        frequencyUnit: pm.frequencyUnit || 'days',
        meterInterval: pm.meterInterval ? String(pm.meterInterval) : '',
        meterUnit: pm.meterUnit || '',
        nextDueAt: pm.nextDueAt ? new Date(pm.nextDueAt).toISOString().split('T')[0] : '',
        assetId: pm.assetId || pm.asset?.id || '',
        assignedTo: pm.assignedTo?.[0]?.id || pm.assignedTo?.[0] || '',
        checklistTemplateId: pm.checklistTemplateId || pm.checklistTemplate?.id || '',
      })
    }
  }, [pm])

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.updatePmPlan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm'] })
      queryClient.invalidateQueries({ queryKey: ['pm', id] })
      queryClient.invalidateQueries({ queryKey: ['pm-plans'] })
      router.push(`/dashboard/pm/${id}`)
      toast.success('PM plan updated successfully')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message
      const errorStr = Array.isArray(message) ? message.join(', ') : message || error.message
      toast.error(`Failed to update: ${errorStr}`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data: any = {
      name: formData.name,
      description: formData.description || undefined,
      isActive: formData.isActive,
      priority: formData.priority,
      estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
      triggerType: formData.triggerType,
      nextDueAt: formData.nextDueAt || undefined,
      assetId: formData.assetId || undefined,
      assignedTo: formData.assignedTo ? [formData.assignedTo] : undefined,
      checklistTemplateId: formData.checklistTemplateId || undefined,
    }

    if (formData.triggerType === 'time_based') {
      data.frequencyValue = formData.frequencyValue ? parseInt(formData.frequencyValue) : undefined
      data.frequencyUnit = formData.frequencyUnit
    } else if (formData.triggerType === 'meter_based') {
      data.meterInterval = formData.meterInterval ? parseInt(formData.meterInterval) : undefined
      data.meterUnit = formData.meterUnit || undefined
    }

    updateMutation.mutate(data)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/pm/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit PM Plan</h1>
          <p className="text-muted-foreground">Update preventive maintenance plan</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="PM plan name"
                  required
                />
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
                  <option value="emergency">Emergency</option>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the maintenance tasks..."
                className="min-h-[100px]"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="estimatedHours">Estimated Hours</Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  step="0.5"
                  value={formData.estimatedHours}
                  onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked: boolean) => setFormData({ ...formData, isActive: checked })}
                  className="data-[state=checked]:bg-emerald-500"
                />
                <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="triggerType">Trigger Type</Label>
              <Select
                id="triggerType"
                value={formData.triggerType}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, triggerType: e.target.value })}
              >
                <option value="time_based">Time-Based</option>
                <option value="meter_based">Meter-Based</option>
                <option value="calendar_based">Calendar-Based</option>
              </Select>
            </div>

            {formData.triggerType === 'time_based' && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="frequencyValue">Every</Label>
                  <Input
                    id="frequencyValue"
                    type="number"
                    value={formData.frequencyValue}
                    onChange={(e) => setFormData({ ...formData, frequencyValue: e.target.value })}
                    placeholder="30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="frequencyUnit">Unit</Label>
                  <Select
                    id="frequencyUnit"
                    value={formData.frequencyUnit}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, frequencyUnit: e.target.value })}
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </Select>
                </div>
              </div>
            )}

            {formData.triggerType === 'meter_based' && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="meterInterval">Meter Interval</Label>
                  <Input
                    id="meterInterval"
                    type="number"
                    value={formData.meterInterval}
                    onChange={(e) => setFormData({ ...formData, meterInterval: e.target.value })}
                    placeholder="500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meterUnit">Unit</Label>
                  <Input
                    id="meterUnit"
                    value={formData.meterUnit}
                    onChange={(e) => setFormData({ ...formData, meterUnit: e.target.value })}
                    placeholder="e.g., hours, miles, cycles"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="nextDueAt">Next Due Date</Label>
              <Input
                id="nextDueAt"
                type="date"
                value={formData.nextDueAt}
                onChange={(e) => setFormData({ ...formData, nextDueAt: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assetId">Asset</Label>
              <Select
                id="assetId"
                value={formData.assetId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, assetId: e.target.value })}
              >
                <option value="">Select asset...</option>
                {(Array.isArray(assets) ? assets : []).map((a: any) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignedTo">Assigned To</Label>
              <Select
                id="assignedTo"
                value={formData.assignedTo}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, assignedTo: e.target.value })}
              >
                <option value="">Select technician...</option>
                {(Array.isArray(users) ? users : []).map((u: any) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="checklistTemplateId">Checklist Template</Label>
              <Select
                id="checklistTemplateId"
                value={formData.checklistTemplateId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, checklistTemplateId: e.target.value })}
              >
                <option value="">No template</option>
                {(Array.isArray(templates) ? templates : []).map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4 pt-4 border-t">
          <Button type="submit" disabled={updateMutation.isPending} className="min-w-[150px]">
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? 'Updating...' : 'Update PM Plan'}
          </Button>
          <Button variant="ghost" asChild>
            <Link href={`/dashboard/pm/${id}`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
