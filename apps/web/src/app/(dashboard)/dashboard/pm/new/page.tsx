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
    const data = {
      ...formData,
      intervalDays: formData.intervalDays ? parseInt(formData.intervalDays) : undefined,
      intervalMeter: formData.intervalMeter ? parseInt(formData.intervalMeter) : undefined,
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
              </Select>
            </div>
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
