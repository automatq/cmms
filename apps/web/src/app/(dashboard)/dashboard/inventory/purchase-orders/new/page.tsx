'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import Link from 'next/link'
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

interface LineItem {
  partId: string
  qtyOrdered: string
  unitCost: string
  storeroomId: string
}

export default function NewPurchaseOrderPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [form, setForm] = useState({ supplierId: '', expectedDate: '', notes: '' })
  const [lineItems, setLineItems] = useState<LineItem[]>([{ partId: '', qtyOrdered: '', unitCost: '', storeroomId: '' }])

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res = await api.getSuppliers()
      return res.data || []
    },
  })

  const { data: parts } = useQuery({
    queryKey: ['parts-lookup'],
    queryFn: async () => {
      const res = await api.getParts({ limit: 200 })
      return res.data?.data || res.data || []
    },
  })

  const { data: storerooms } = useQuery({
    queryKey: ['storerooms'],
    queryFn: async () => {
      const res = await api.getStorerooms()
      return res.data || []
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createPurchaseOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      router.push('/dashboard/inventory/purchase-orders')
      toast.success('Purchase order created')
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to create PO')
    },
  })

  const addLine = () => {
    setLineItems([...lineItems, { partId: '', qtyOrdered: '', unitCost: '', storeroomId: '' }])
  }

  const removeLine = (idx: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== idx))
    }
  }

  const updateLine = (idx: number, field: keyof LineItem, value: string) => {
    const updated = [...lineItems]
    updated[idx] = { ...updated[idx], [field]: value }

    // Auto-fill unit cost from part
    if (field === 'partId' && value) {
      const selectedPart = (Array.isArray(parts) ? parts : []).find((p: any) => p.id === value)
      if (selectedPart?.unitCost) {
        updated[idx].unitCost = String(selectedPart.unitCost)
      }
    }

    setLineItems(updated)
  }

  const runningTotal = lineItems.reduce((sum, li) => {
    return sum + (parseFloat(li.qtyOrdered) || 0) * (parseFloat(li.unitCost) || 0)
  }, 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      supplierId: form.supplierId,
      expectedDate: form.expectedDate || undefined,
      notes: form.notes || undefined,
      lineItems: lineItems.map((li) => ({
        partId: li.partId,
        qtyOrdered: parseInt(li.qtyOrdered),
        unitCost: parseFloat(li.unitCost),
        storeroomId: li.storeroomId,
      })),
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/inventory/purchase-orders">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Purchase Order</h1>
          <p className="text-muted-foreground">Create a new purchase order for parts</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Supplier *</Label>
                <Select value={form.supplierId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, supplierId: e.target.value })} required>
                  <option value="">Select supplier...</option>
                  {(Array.isArray(suppliers) ? suppliers : []).map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expected Date</Label>
                <Input type="date" value={form.expectedDate} onChange={(e) => setForm({ ...form, expectedDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-4 w-4 mr-1" /> Add Line
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {lineItems.map((li, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-3 items-end p-3 bg-muted/30 rounded-lg">
                <div className="col-span-4 space-y-1">
                  {idx === 0 && <Label className="text-xs">Part *</Label>}
                  <Select value={li.partId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateLine(idx, 'partId', e.target.value)} required>
                    <option value="">Select part...</option>
                    {(Array.isArray(parts) ? parts : []).map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </Select>
                </div>
                <div className="col-span-2 space-y-1">
                  {idx === 0 && <Label className="text-xs">Qty *</Label>}
                  <Input type="number" min="1" value={li.qtyOrdered} onChange={(e) => updateLine(idx, 'qtyOrdered', e.target.value)} placeholder="0" required />
                </div>
                <div className="col-span-2 space-y-1">
                  {idx === 0 && <Label className="text-xs">Unit Cost *</Label>}
                  <Input type="number" step="0.01" value={li.unitCost} onChange={(e) => updateLine(idx, 'unitCost', e.target.value)} placeholder="0.00" required />
                </div>
                <div className="col-span-3 space-y-1">
                  {idx === 0 && <Label className="text-xs">Storeroom *</Label>}
                  <Select value={li.storeroomId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateLine(idx, 'storeroomId', e.target.value)} required>
                    <option value="">Select...</option>
                    {(Array.isArray(storerooms) ? storerooms : []).map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Select>
                </div>
                <div className="col-span-1">
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeLine(idx)} disabled={lineItems.length === 1}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}

            <div className="flex justify-end pt-2 border-t">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Estimated Total</p>
                <p className="text-2xl font-bold">{formatCurrency(runningTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4 pt-4 border-t">
          <Button type="submit" disabled={createMutation.isPending} className="min-w-[150px]">
            <Save className="h-4 w-4 mr-2" />
            {createMutation.isPending ? 'Creating...' : 'Create Purchase Order'}
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/dashboard/inventory/purchase-orders">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
