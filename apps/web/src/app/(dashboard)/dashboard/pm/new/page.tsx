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

export default function NewPmPlanPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    triggerType: 'time',
    intervalDays: '',
    intervalMeter: '',
    meterType: '',
    assetId: '',
    isActive: true,
    skipBlackouts: true,
    // Condition (sensor) trigger config
    conditionMetric: '',
    conditionOperator: 'gt',
    conditionWarning: '',
    conditionCritical: '',
    conditionDebounce: '60',
  })

  const { data: assets } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const res = await api.getAssets({ limit: 100 })
      return res.data
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createPmPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-plans'] })
      router.push('/dashboard/pm')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Condition (sensor) trigger: send a clean payload with the rule in metadata.
    if (formData.triggerType === 'condition') {
      if (!formData.assetId) {
        toast.error('Condition-based PM requires an asset')
        return
      }
      if (!formData.conditionMetric.trim() || formData.conditionCritical === '') {
        toast.error('Set a metric and a critical threshold')
        return
      }
      createMutation.mutate({
        name: formData.name,
        description: formData.description || undefined,
        assetId: formData.assetId,
        triggerType: 'condition',
        ignoreBlackouts: !formData.skipBlackouts,
        metadata: {
          condition: {
            metric: formData.conditionMetric.trim(),
            operator: formData.conditionOperator,
            criticalThreshold: Number(formData.conditionCritical),
            ...(formData.conditionWarning !== '' ? { warningThreshold: Number(formData.conditionWarning) } : {}),
            ...(formData.conditionDebounce !== '' ? { debounceMinutes: Number(formData.conditionDebounce) } : {}),
          },
        },
      })
      return
    }

    const { skipBlackouts, ...rest } = formData
    const data = {
      ...rest,
      intervalDays: formData.intervalDays ? parseInt(formData.intervalDays) : undefined,
      intervalMeter: formData.intervalMeter ? parseInt(formData.intervalMeter) : undefined,
      ignoreBlackouts: !skipBlackouts,
    }
    createMutation.mutate(data)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/pm">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New PM Plan</h1>
          <p className="text-muted-foreground">Create a preventive maintenance plan</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                placeholder="PM Plan name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description of maintenance tasks"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 rounded border border-primary"
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trigger</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="triggerType">Trigger Type</Label>
              <Select
                id="triggerType"
                value={formData.triggerType}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, triggerType: e.target.value })}
              >
                <option value="time">Time Based</option>
                <option value="meter">Meter Based</option>
                <option value="both">Time or Meter</option>
                <option value="condition">Condition (sensor)</option>
              </Select>
            </div>
            {formData.triggerType === 'condition' && (
              <div className="space-y-4 rounded-lg border border-dashed p-4">
                <p className="text-sm text-muted-foreground">
                  Auto-create a work order when an ingested sensor reading for this asset crosses a threshold.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="conditionMetric">Metric *</Label>
                    <Input
                      id="conditionMetric"
                      value={formData.conditionMetric}
                      onChange={(e) => setFormData({ ...formData, conditionMetric: e.target.value })}
                      placeholder="e.g. temperature"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="conditionOperator">Trigger when</Label>
                    <Select
                      id="conditionOperator"
                      value={formData.conditionOperator}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, conditionOperator: e.target.value })}
                    >
                      <option value="gt">Reading is at or above</option>
                      <option value="lt">Reading is at or below</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="conditionWarning">Warning threshold</Label>
                    <Input
                      id="conditionWarning"
                      type="number"
                      value={formData.conditionWarning}
                      onChange={(e) => setFormData({ ...formData, conditionWarning: e.target.value })}
                      placeholder="optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="conditionCritical">Critical threshold *</Label>
                    <Input
                      id="conditionCritical"
                      type="number"
                      value={formData.conditionCritical}
                      onChange={(e) => setFormData({ ...formData, conditionCritical: e.target.value })}
                      placeholder="e.g. 80"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="conditionDebounce">Debounce (minutes)</Label>
                    <Input
                      id="conditionDebounce"
                      type="number"
                      value={formData.conditionDebounce}
                      onChange={(e) => setFormData({ ...formData, conditionDebounce: e.target.value })}
                      placeholder="60"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Select the asset below — required for condition triggers.</p>
              </div>
            )}
            {(formData.triggerType === 'time' || formData.triggerType === 'both') && (
              <div className="space-y-2">
                <Label htmlFor="intervalDays">Interval (Days)</Label>
                <Input
                  id="intervalDays"
                  type="number"
                  value={formData.intervalDays}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, intervalDays: e.target.value })}
                  placeholder="30"
                />
              </div>
            )}
            {(formData.triggerType === 'meter' || formData.triggerType === 'both') && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="meterType">Meter Type</Label>
                  <Input
                    id="meterType"
                    value={formData.meterType}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, meterType: e.target.value })}
                    placeholder="e.g., Hours, Miles, Cycles"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="intervalMeter">Interval (Meter Units)</Label>
                  <Input
                    id="intervalMeter"
                    type="number"
                    value={formData.intervalMeter}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, intervalMeter: e.target.value })}
                    placeholder="500"
                  />
                </div>
              </>
            )}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="skipBlackouts"
                checked={formData.skipBlackouts}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, skipBlackouts: e.target.checked })}
                className="h-4 w-4 rounded border border-primary"
              />
              <Label htmlFor="skipBlackouts">Skip company blackout days</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Asset Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={createMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {createMutation.isPending ? 'Saving...' : 'Create PM Plan'}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/pm">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
