'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function EditPartPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const params = useParams()
  const id = params?.id as string

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    category: '',
    unitCost: '',
    unitOfMeasure: 'ea',
    reorderPoint: '',
    reorderQty: '',
    isCritical: false,
  })

  const { data: part, isLoading } = useQuery({
    queryKey: ['part', id],
    queryFn: async () => {
      const res = await api.getPart(id)
      return res.data
    },
    enabled: !!id,
  })

  useEffect(() => {
    if (part) {
      setFormData({
        name: part.name || '',
        sku: part.sku || part.partNumber || '',
        description: part.description || '',
        category: part.category?.name || part.category || '',
        unitCost: part.unitCost ? String(part.unitCost) : '',
        unitOfMeasure: part.unitOfMeasure || 'ea',
        reorderPoint: part.minimumQuantity ? String(part.minimumQuantity) : part.reorderPoint ? String(part.reorderPoint) : '',
        reorderQty: part.reorderQty ? String(part.reorderQty) : '',
        isCritical: part.isCritical || false,
      })
    }
  }, [part])

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.updatePart(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] })
      queryClient.invalidateQueries({ queryKey: ['part', id] })
      router.push(`/dashboard/inventory/parts/${id}`)
      toast.success('Part updated successfully')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message
      const errorStr = Array.isArray(message) ? message.join(', ') : message || error.message
      toast.error(`Failed to update: ${errorStr}`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      ...formData,
      unitCost: formData.unitCost ? parseFloat(formData.unitCost) : undefined,
      reorderPoint: formData.reorderPoint ? parseInt(formData.reorderPoint) : undefined,
      reorderQty: formData.reorderQty ? parseInt(formData.reorderQty) : undefined,
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
          <Link href={`/dashboard/inventory/parts/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Part</h1>
          <p className="text-muted-foreground">Update inventory part details</p>
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Part name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Stock keeping unit"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Part description"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Electrical, Mechanical"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitOfMeasure">Unit of Measure</Label>
                <Select
                  id="unitOfMeasure"
                  value={formData.unitOfMeasure}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
                >
                  <option value="ea">Each (ea)</option>
                  <option value="box">Box</option>
                  <option value="case">Case</option>
                  <option value="ft">Feet (ft)</option>
                  <option value="m">Meters (m)</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="lb">Pounds (lb)</option>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isCritical"
                checked={formData.isCritical}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, isCritical: e.target.checked })}
                className="h-4 w-4 rounded border border-primary"
              />
              <Label htmlFor="isCritical">Critical Part</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing & Stock</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="unitCost">Unit Cost</Label>
                <Input
                  id="unitCost"
                  type="number"
                  step="0.01"
                  value={formData.unitCost}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, unitCost: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reorderPoint">Reorder Point</Label>
                <Input
                  id="reorderPoint"
                  type="number"
                  value={formData.reorderPoint}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, reorderPoint: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reorderQty">Reorder Qty</Label>
                <Input
                  id="reorderQty"
                  type="number"
                  value={formData.reorderQty}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, reorderQty: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4 pt-4 border-t">
          <Button type="submit" disabled={updateMutation.isPending} className="min-w-[150px]">
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? 'Updating...' : 'Update Part'}
          </Button>
          <Button variant="ghost" asChild>
            <Link href={`/dashboard/inventory/parts/${id}`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
