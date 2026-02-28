'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import Link from 'next/link'
import { ArrowLeft, Plus, Warehouse, MapPin, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

const emptyForm = { name: '', description: '', locationId: '', isActive: true }

export default function StoreroomsPage() {
  const queryClient = useQueryClient()
  const [showDialog, setShowDialog] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const { data: storerooms, isLoading } = useQuery({
    queryKey: ['storerooms'],
    queryFn: async () => {
      const res = await api.getStorerooms()
      return res.data || []
    },
  })

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const res = await api.getLocations()
      return res.data || []
    },
  })

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      editingId ? api.updateStoreroom(editingId, data) : api.createStoreroom(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storerooms'] })
      setShowDialog(false)
      setEditingId(null)
      setForm(emptyForm)
      toast.success(editingId ? 'Storeroom updated' : 'Storeroom created')
    },
    onError: () => toast.error('Failed to save storeroom'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteStoreroom(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storerooms'] })
      toast.success('Storeroom deleted')
    },
    onError: () => toast.error('Failed to delete storeroom'),
  })

  const openEdit = (s: any) => {
    setEditingId(s.id)
    setForm({
      name: s.name || '',
      description: s.description || '',
      locationId: s.locationId || s.location?.id || '',
      isActive: s.isActive ?? true,
    })
    setShowDialog(true)
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowDialog(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate({
      ...form,
      locationId: form.locationId || undefined,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/inventory">
              <ArrowLeft className="h-4 w-4 mr-1" /> Inventory
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Storerooms</h1>
            <p className="text-muted-foreground">Manage storage locations for your parts</p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add Storeroom
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-[140px] w-full rounded-xl" />
          ))}
        </div>
      ) : !Array.isArray(storerooms) || storerooms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Warehouse className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No storerooms yet</h3>
            <p className="text-muted-foreground mb-4">Add a storeroom to manage stock locations.</p>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" /> Add Storeroom
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {storerooms.map((s: any) => (
            <Card key={s.id} className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Warehouse className="h-5 w-5 text-primary" />
                    {s.name}
                  </CardTitle>
                  <Badge variant={s.isActive !== false ? 'default' : 'secondary'}>
                    {s.isActive !== false ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {(s.location?.name || s.description) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {s.location?.name || s.description}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
                    <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(s.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Storeroom' : 'Add Storeroom'}</DialogTitle>
            <DialogDescription>Configure storeroom details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={form.locationId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, locationId: e.target.value })}>
                <option value="">Select location...</option>
                {(Array.isArray(locations) ? locations : []).map((l: any) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 rounded border-primary" />
              <Label htmlFor="isActive">Active</Label>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
