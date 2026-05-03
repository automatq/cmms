'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
    assetId: '',
    description: '',
  })

  const { data: assets } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const res = await api.getAssets({ limit: 100 })
      return res.data
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createWorkOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      toast.success('Work order submitted')
      router.push('/dashboard/work-orders')
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to submit work order')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const asset = assets?.data?.find((a: any) => a.id === formData.assetId)
    if (!asset) {
      toast.error('Please select an asset')
      return
    }

    const data: any = {
      title: `${asset.assetNumber} - ${asset.name}`,
      description: formData.description || undefined,
      type: 'corrective',
      assetId: asset.id,
      locationId: asset.locationId || asset.location?.id || undefined,
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
          <h1 className="text-3xl font-bold">Submit Work Order</h1>
          <p className="text-muted-foreground">Submit a work order for an asset</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Work Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="asset">Asset Number *</Label>
              <Select
                id="asset"
                value={formData.assetId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, assetId: e.target.value })}
                required
              >
                <option value="">Select an asset</option>
                {assets?.data?.map((asset: any) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.assetNumber} - {asset.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the issue or work needed"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={createMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {createMutation.isPending ? 'Submitting...' : 'Submit Work Order'}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/work-orders">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
