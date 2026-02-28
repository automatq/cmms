'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'

const signupSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens'),
  adminEmail: z.string().email('Please enter a valid email'),
  adminFirstName: z.string().min(1, 'First name is required'),
  adminLastName: z.string().min(1, 'Last name is required'),
})

type SignupFormData = z.infer<typeof signupSchema>

const planDetails: Record<string, { name: string; price: string; features: string[] }> = {
  free: {
    name: 'Free',
    price: '$0/forever',
    features: ['3 users', '50 assets', '1 GB storage', 'Work orders', 'PM'],
  },
  pro: {
    name: 'Pro',
    price: '$49/month',
    features: ['25 users', '500 assets', '10 GB storage', 'Inventory', 'Reports', 'AI'],
  },
  enterprise: {
    name: 'Enterprise',
    price: '$149/month',
    features: ['Unlimited users', 'Unlimited assets', '100 GB storage', 'IoT sensors'],
  },
}

export default function SignupPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const selectedPlan = searchParams.get('plan') || 'free'
  const plan = planDetails[selectedPlan] || planDetails.free

  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [slugChecking, setSlugChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    trigger,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      companyName: '',
      slug: '',
      adminEmail: '',
      adminFirstName: '',
      adminLastName: '',
    },
  })

  const companyName = watch('companyName')
  const slug = watch('slug')

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    setValue('companyName', name)
    const generated = generateSlug(name)
    setValue('slug', generated)
    setSlugAvailable(null)
  }

  const checkSlugAvailability = async () => {
    if (!slug || slug.length < 3) return
    setSlugChecking(true)
    try {
      const res = await axios.get(`${API_URL}/tenants/check-slug`, {
        params: { slug },
      })
      setSlugAvailable(res.data.available)
    } catch {
      setSlugAvailable(null)
    } finally {
      setSlugChecking(false)
    }
  }

  const goToStep2 = async () => {
    const valid = await trigger(['companyName', 'slug'])
    if (valid) {
      await checkSlugAvailability()
      setStep(2)
    }
  }

  const goToStep3 = async () => {
    const valid = await trigger(['adminEmail', 'adminFirstName', 'adminLastName'])
    if (valid) setStep(3)
  }

  const onSubmit = async (data: SignupFormData) => {
    setIsSubmitting(true)
    setError(null)
    try {
      await axios.post(`${API_URL}/tenants/signup`, data)

      if (selectedPlan !== 'free') {
        // For paid plans, redirect to Stripe checkout after signup
        // The billing controller will handle creating the checkout session
        router.push(`/signup/success?plan=${selectedPlan}&email=${encodeURIComponent(data.adminEmail)}`)
      } else {
        router.push(`/signup/success?email=${encodeURIComponent(data.adminEmail)}`)
      }
    } catch (err: any) {
      const message =
        err.response?.data?.message || 'Something went wrong. Please try again.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-lg mx-auto">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  s < step
                    ? 'bg-primary text-primary-foreground'
                    : s === step
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {s < step ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-16 h-0.5 ${
                    s < step ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {step === 1 && 'Company Information'}
                  {step === 2 && 'Admin Account'}
                  {step === 3 && 'Review & Confirm'}
                </CardTitle>
                <CardDescription>
                  {step === 1 && 'Tell us about your organization'}
                  {step === 2 && 'Set up your administrator account'}
                  {step === 3 && 'Review your details and get started'}
                </CardDescription>
              </div>
              <Badge variant="outline">{plan.name} Plan</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Step 1: Company Info */}
              {step === 1 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      placeholder="Acme Manufacturing"
                      {...register('companyName')}
                      onChange={handleCompanyNameChange}
                      value={companyName}
                    />
                    {errors.companyName && (
                      <p className="text-sm text-destructive">{errors.companyName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">URL Slug</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">app.cmms.com/</span>
                      <Input
                        id="slug"
                        placeholder="acme-manufacturing"
                        {...register('slug')}
                        onBlur={checkSlugAvailability}
                      />
                    </div>
                    {slugChecking && (
                      <p className="text-sm text-muted-foreground">Checking availability...</p>
                    )}
                    {slugAvailable === true && (
                      <p className="text-sm text-green-600">Slug is available</p>
                    )}
                    {slugAvailable === false && (
                      <p className="text-sm text-destructive">Slug is already taken</p>
                    )}
                    {errors.slug && (
                      <p className="text-sm text-destructive">{errors.slug.message}</p>
                    )}
                  </div>
                  <Button type="button" className="w-full" onClick={goToStep2}>
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </>
              )}

              {/* Step 2: Admin Account */}
              {step === 2 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="adminFirstName">First Name</Label>
                      <Input
                        id="adminFirstName"
                        placeholder="John"
                        {...register('adminFirstName')}
                      />
                      {errors.adminFirstName && (
                        <p className="text-sm text-destructive">{errors.adminFirstName.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adminLastName">Last Name</Label>
                      <Input
                        id="adminLastName"
                        placeholder="Doe"
                        {...register('adminLastName')}
                      />
                      {errors.adminLastName && (
                        <p className="text-sm text-destructive">{errors.adminLastName.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">Email Address</Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      placeholder="john@acme.com"
                      {...register('adminEmail')}
                    />
                    {errors.adminEmail && (
                      <p className="text-sm text-destructive">{errors.adminEmail.message}</p>
                    )}
                  </div>
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setStep(1)}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button type="button" className="flex-1" onClick={goToStep3}>
                      Continue <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}

              {/* Step 3: Review */}
              {step === 3 && (
                <>
                  <div className="space-y-4">
                    <div className="rounded-lg border p-4 space-y-3">
                      <h3 className="font-medium">Company</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">Name</span>
                        <span>{companyName}</span>
                        <span className="text-muted-foreground">URL</span>
                        <span>app.cmms.com/{slug}</span>
                      </div>
                    </div>
                    <div className="rounded-lg border p-4 space-y-3">
                      <h3 className="font-medium">Admin Account</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">Name</span>
                        <span>{watch('adminFirstName')} {watch('adminLastName')}</span>
                        <span className="text-muted-foreground">Email</span>
                        <span>{watch('adminEmail')}</span>
                      </div>
                    </div>
                    <div className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Plan</h3>
                        <Badge>{plan.name} - {plan.price}</Badge>
                      </div>
                      <ul className="grid grid-cols-2 gap-1 text-sm">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-1">
                            <Check className="h-3 w-3 text-primary" /> {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setStep(2)}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button type="submit" className="flex-1" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                        </>
                      ) : (
                        'Create Account'
                      )}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
