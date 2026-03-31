'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Image as ImageIcon, Upload, Loader2, X } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAuth } from '@/providers/auth-provider'
import { AssetQrCard } from '@/components/assets/asset-qr-card'

export default function EditAssetPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const params = useParams()
  const { user } = useAuth()
  const id = params?.id as string

  // State for form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    categoryId: '',
    locationId: '',
    parentAssetId: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    purchaseDate: '',
    purchaseCost: '',
    warrantyExpiry: '',
    isCritical: false,
    customFields: { imageUrl: '' },
  })

  // State for image handling
  const [imageError, setImageError] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Fetch existing asset data
  const { data: asset, isLoading } = useQuery({
    queryKey: ['asset', id],
    queryFn: async () => {
      const res = await api.getAsset(id)
      return res.data
    },
    enabled: !!id,
  })

  // Set form data when asset data is loaded
  useEffect(() => {
    if (asset) {
      setFormData({
        name: asset.name || '',
        description: asset.description || '',
        status: asset.status || 'active',
        categoryId: asset.categoryId || asset.category?.id || '',
        locationId: asset.locationId || asset.location?.id || '',
        parentAssetId: asset.parentAssetId || asset.parentAsset?.id || '',
        manufacturer: asset.manufacturer || '',
        model: asset.model || '',
        serialNumber: asset.serialNumber || '',
        purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().split('T')[0] : '',
        purchaseCost: asset.purchaseCost ? String(asset.purchaseCost) : '',
        warrantyExpiry: asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toISOString().split('T')[0] : '',
        isCritical: asset.isCritical || false,
        customFields: { imageUrl: asset.customFields?.imageUrl || '' },
      })
    }
  }, [asset])

  const canManageQr = !!user?.permissions?.includes('assets:write')

  // Fetch categories and locations
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

  const { data: allAssets } = useQuery({
    queryKey: ['assets-for-parent'],
    queryFn: async () => {
      const res = await api.getAssets({ limit: 100 })
      return res.data?.data || res.data || []
    },
  })

  // Mutation for updating asset
  const updateMutation = useMutation({
    mutationFn: (data: any) => api.updateAsset(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      queryClient.invalidateQueries({ queryKey: ['asset', id] }) // Invalidate the specific asset query
      router.push(`/dashboard/assets/${id}`)
      toast.success('Asset updated successfully')
    },
    onError: (error: any) => {
      console.error('Error updating asset:', error)
      // If it's an array of messages (validation error), join them
      const message = error.response?.data?.message
      const errorStr = Array.isArray(message) ? message.join(', ') : message || error.message
      toast.error(`Failed to update: ${errorStr}`)
    }
  })

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const res = await api.uploadAssetImage(id, file) // Use the new uploadAssetImage method
      const imageUrl = res.data.url || res.data
      setFormData(prev => ({ ...prev, customFields: { ...prev.customFields, imageUrl } }))
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

    // Structure data for API
    const submitData = {
      name: formData.name,
      description: formData.description,
      status: formData.status,
      categoryId: formData.categoryId || undefined,
      locationId: formData.locationId || undefined,
      parentAssetId: formData.parentAssetId || undefined,
      manufacturer: formData.manufacturer,
      model: formData.model,
      serialNumber: formData.serialNumber,
      purchaseDate: formData.purchaseDate || undefined,
      purchaseCost: formData.purchaseCost ? parseFloat(formData.purchaseCost) : undefined,
      warrantyExpiry: formData.warrantyExpiry || undefined,
      isCritical: formData.isCritical,
      customFields: formData.customFields?.imageUrl ? { imageUrl: formData.customFields.imageUrl } : undefined,
    }

    updateMutation.mutate(submitData)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/assets/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Asset</h1>
            <p className="text-muted-foreground">Loading asset data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/assets/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Asset</h1>
          <p className="text-muted-foreground">Update asset information</p>
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
                    <Label htmlFor="purchaseCost">Purchase Price</Label>
                    <Input
                      id="purchaseCost"
                      type="number"
                      step="0.01"
                      value={formData.purchaseCost}
                      onChange={(e) => setFormData({ ...formData, purchaseCost: e.target.value })}
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
                <CardDescription>Add or update the asset image</CardDescription>
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
                    {formData.customFields?.imageUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, customFields: { ...prev.customFields, imageUrl: '' } }))
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
                  {formData.customFields?.imageUrl && !imageError ? (
                    <img
                      src={formData.customFields.imageUrl}
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
                <div className="space-y-2">
                  <Label htmlFor="parentAsset">Parent Asset</Label>
                  <Select
                    id="parentAsset"
                    value={formData.parentAssetId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, parentAssetId: e.target.value })}
                  >
                    <option value="">None (Top Level)</option>
                    {Array.isArray(allAssets) && allAssets.filter((a: any) => a.id !== id).map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.assetNumber} - {a.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </CardContent>
            </Card>

            {asset && (
              <AssetQrCard
                assetId={id}
                assetName={asset.name}
                assetNumber={asset.assetNumber}
                canManage={canManageQr}
                showBulkPrintShortcut={false}
                note="Regenerating here invalidates every existing sticker tied to this asset."
              />
            )}
          </div>

        </div>

        <div className="flex items-center gap-4 pt-4 border-t">
          <Button type="submit" disabled={updateMutation.isPending} className="min-w-[150px]">
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? 'Updating...' : 'Update Asset'}
          </Button>
          <Button variant="ghost" asChild>
            <Link href={`/dashboard/assets/${id}`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
