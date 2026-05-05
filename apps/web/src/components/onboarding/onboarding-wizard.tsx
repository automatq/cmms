'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import {
  Building2,
  Package,
  Calendar,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  MapPin,
  Wrench,
} from 'lucide-react'

interface OnboardingWizardProps {
  onComplete: () => void
  onSkip: () => void
}

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to MainTek',
    icon: Building2,
  },
  {
    id: 'location',
    title: 'Create your first location',
    icon: MapPin,
  },
  {
    id: 'asset',
    title: 'Add your first asset',
    icon: Package,
  },
  {
    id: 'done',
    title: "You're all set!",
    icon: CheckCircle2,
  },
]

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const queryClient = useQueryClient()
  const [currentStep, setCurrentStep] = useState(0)
  const [locationName, setLocationName] = useState('')
  const [locationAddress, setLocationAddress] = useState('')
  const [createdLocationId, setCreatedLocationId] = useState<string | null>(null)
  const [assetName, setAssetName] = useState('')
  const [assetDescription, setAssetDescription] = useState('')

  const createLocationMutation = useMutation({
    mutationFn: (data: any) => api.createLocation(data),
    onSuccess: (res) => {
      setCreatedLocationId(res.data.id)
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast.success('Location created!')
      setCurrentStep(2)
    },
    onError: () => {
      toast.error('Failed to create location')
    },
  })

  const createAssetMutation = useMutation({
    mutationFn: (data: any) => api.createAsset(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      toast.success('Asset created!')
      setCurrentStep(3)
    },
    onError: () => {
      toast.error('Failed to create asset')
    },
  })

  const completeMutation = useMutation({
    mutationFn: () => api.completeOnboarding(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] })
      onComplete()
    },
  })

  const progress = ((currentStep) / (STEPS.length - 1)) * 100

  const handleCreateLocation = () => {
    if (!locationName.trim()) return
    createLocationMutation.mutate({
      name: locationName.trim(),
      address: locationAddress.trim() || undefined,
    })
  }

  const handleCreateAsset = () => {
    if (!assetName.trim()) return
    createAssetMutation.mutate({
      name: assetName.trim(),
      description: assetDescription.trim() || undefined,
      locationId: createdLocationId || undefined,
    })
  }

  const handleSkip = () => {
    completeMutation.mutate()
    onSkip()
  }

  const handleFinish = () => {
    completeMutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Skip button */}
        <div className="flex justify-end mb-4">
          <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
            Skip setup
            <X className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {/* Progress */}
        <Progress value={progress} className="mb-8 h-1.5" />

        {/* Step Content */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-8">
            {/* Step 0: Welcome */}
            {currentStep === 0 && (
              <div className="text-center space-y-6">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">Welcome to MainTek</h2>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    Let's get you started with a quick setup. We'll create your first location and asset in under a minute.
                  </p>
                </div>
                <Button size="lg" onClick={() => setCurrentStep(1)} className="w-full max-w-xs">
                  Get Started
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Step 1: Create Location */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Create a location</h2>
                    <p className="text-sm text-muted-foreground">Where are your assets located?</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="location-name">Location name</Label>
                    <Input
                      id="location-name"
                      placeholder="e.g. Main Building, Warehouse A, Plant Floor"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location-address">Address (optional)</Label>
                    <Input
                      id="location-address"
                      placeholder="e.g. 123 Main Street"
                      value={locationAddress}
                      onChange={(e) => setLocationAddress(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setCurrentStep(0)}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                  <Button
                    onClick={handleCreateLocation}
                    disabled={!locationName.trim() || createLocationMutation.isPending}
                    className="flex-1"
                  >
                    {createLocationMutation.isPending ? 'Creating...' : 'Create Location'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setCurrentStep(2)} className="w-full text-muted-foreground">
                  Skip this step
                </Button>
              </div>
            )}

            {/* Step 2: Create Asset */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Add your first asset</h2>
                    <p className="text-sm text-muted-foreground">What equipment do you maintain?</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="asset-name">Asset name</Label>
                    <Input
                      id="asset-name"
                      placeholder="e.g. HVAC Unit #1, Conveyor Belt A, Forklift 01"
                      value={assetName}
                      onChange={(e) => setAssetName(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="asset-description">Description (optional)</Label>
                    <Input
                      id="asset-description"
                      placeholder="Brief description of the asset"
                      value={assetDescription}
                      onChange={(e) => setAssetDescription(e.target.value)}
                    />
                  </div>
                  {createdLocationId && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Will be assigned to the location you just created
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                  <Button
                    onClick={handleCreateAsset}
                    disabled={!assetName.trim() || createAssetMutation.isPending}
                    className="flex-1"
                  >
                    {createAssetMutation.isPending ? 'Creating...' : 'Create Asset'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setCurrentStep(3)} className="w-full text-muted-foreground">
                  Skip this step
                </Button>
              </div>
            )}

            {/* Step 3: Done */}
            {currentStep === 3 && (
              <div className="text-center space-y-6">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">You're all set!</h2>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    Your workspace is ready. You can now create work orders, set up PM plans, and manage your maintenance operations.
                  </p>
                </div>
                <div className="space-y-3 max-w-xs mx-auto">
                  <Button size="lg" onClick={handleFinish} className="w-full">
                    Go to Dashboard
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step indicators */}
        <div className="flex justify-center gap-2 mt-6">
          {STEPS.map((step, idx) => (
            <div
              key={step.id}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentStep
                  ? 'w-8 bg-primary'
                  : idx < currentStep
                  ? 'w-1.5 bg-primary/50'
                  : 'w-1.5 bg-muted-foreground/20'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
