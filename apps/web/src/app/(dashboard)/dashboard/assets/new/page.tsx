'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, Save, Image as ImageIcon, Upload, Loader2, X } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function NewAssetPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    categoryId: '',
    locationId: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    purchaseDate: '',
    purchasePrice: '',
    warrantyExpiry: '',
    isCritical: false,
    imageUrl: '',
  })

  // Preview state for the image URL
  const [imageError, setImageError] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.getCategories()
      return res.data
    },
  })

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const res = await api.getLocations()
      return res.data
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createAsset(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      router.push('/dashboard/assets')
    },
    onError: (error: any) => {
      console.error('Error saving asset:', error)
      // If it's an array of messages (validation error), join them
      const message = error.response?.data?.message
      const errorStr = Array.isArray(message) ? message.join(', ') : message || error.message
      toast.error(`Failed to save: ${errorStr}`)
    }
  })

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      // For new assets, we'll temporarily store the URL until the asset is created
      // Then we'll update the asset with the image after creation
      const res = await api.uploadFile(file, 'temp-assets')
      const key = res.data.key
      // Build the public download URL
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'
      const imageUrl = `${API_URL}/files/${encodeURIComponent(key)}/download`

      setFormData({ ...formData, imageUrl })
      setImageError(false)
      toast.success('Image uploaded successfully')
    } catch (error) {
      console.error('Upload failed:', error)
      toast.error('Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Structure data for API, packing imageUrl into customFields
    const submitData = {
      name: formData.name,
      description: formData.description,
      status: formData.status,
      categoryId: formData.categoryId || undefined,
      locationId: formData.locationId || undefined,
      manufacturer: formData.manufacturer,
      model: formData.model,
      serialNumber: formData.serialNumber,
      purchaseDate: formData.purchaseDate || undefined,
      purchaseCost: formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined,
      warrantyExpiry: formData.warrantyExpiry || undefined,
      isCritical: formData.isCritical,
      customFields: formData.imageUrl ? { imageUrl: formData.imageUrl } : undefined,
    }

    createMutation.mutate(submitData)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/assets">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Add Asset</h1>
          <p className="text-muted-foreground">Create a new asset</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-3">

          <div className="md:col-span-2 space-y-6">
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
                      placeholder="Asset name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      id="status"
                      value={formData.status}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="under_repair">Under Repair</option>
                      <option value="retired">Retired</option>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Asset description"
                    className="min-h-[100px]"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isCritical"
                    checked={formData.isCritical}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, isCritical: e.target.checked })}
                    className="h-4 w-4 rounded border border-primary text-primary focus:ring-primary"
                  />
                  <Label htmlFor="isCritical" className="font-medium cursor-pointer">Mark as Critical Asset</Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Details & Specs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="manufacturer">Manufacturer</Label>
                    <Input
                      id="manufacturer"
                      value={formData.manufacturer}
                      onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                      placeholder="Manufacturer"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      placeholder="Model rules"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="serialNumber">Serial Number</Label>
                    <Input
                      id="serialNumber"
                      value={formData.serialNumber}
                      onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                      placeholder="Serial number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purchasePrice">Purchase Price</Label>
                    <Input
                      id="purchasePrice"
                      type="number"
                      step="0.01"
                      value={formData.purchasePrice}
                      onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="purchaseDate">Purchase Date</Label>
                    <Input
                      id="purchaseDate"
                      type="date"
                      value={formData.purchaseDate}
                      onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="warrantyExpiry">Warranty Expiry Date</Label>
                    <Input
                      id="warrantyExpiry"
                      type="date"
                      value={formData.warrantyExpiry}
                      onChange={(e) => setFormData({ ...formData, warrantyExpiry: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Asset Media</CardTitle>
                <CardDescription>Add a photo of the asset</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Asset Image</Label>
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('image-upload')?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                      {isUploading ? 'Uploading...' : 'Upload Image'}
                    </Button>
                    {formData.imageUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setFormData({ ...formData, imageUrl: '' })
                          setImageError(false)
                        }}
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload a photo of the asset to help with identification.
                  </p>
                </div>

                {/* Image Preview */}
                <div className="aspect-video w-full rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center overflow-hidden bg-muted/20 relative group">
                  {formData.imageUrl && !imageError ? (
                    <img
                      src={formData.imageUrl}
                      alt="Asset preview"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <>
                      <ImageIcon className="h-8 w-8 text-muted-foreground/50 mb-2" />
                      <span className="text-xs text-muted-foreground font-medium">No valid image to preview</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Classification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    id="category"
                    value={formData.categoryId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, categoryId: e.target.value })}
                  >
                    <option value="">Select category...</option>
                    {categories?.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Facility Location</Label>
                  <Select
                    id="location"
                    value={formData.locationId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, locationId: e.target.value })}
                  >
                    <option value="">Select location...</option>
                    {locations?.map((loc: any) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>

        <div className="flex items-center gap-4 pt-4 border-t">
          <Button type="submit" disabled={createMutation.isPending} className="min-w-[150px]">
            <Save className="h-4 w-4 mr-2" />
            {createMutation.isPending ? 'Saving Database...' : 'Save Asset'}
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/dashboard/assets">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
