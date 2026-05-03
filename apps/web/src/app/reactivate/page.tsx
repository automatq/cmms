'use client'

import { useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { CreditCard, AlertTriangle, LogOut } from 'lucide-react'

export default function ReactivatePage() {
  const { user, logout } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canManageBilling = user?.permissions?.includes('*') || user?.permissions?.includes('billing:write')

  async function handleAddPayment() {
    setSubmitting(true)
    setError(null)
    try {
      const successUrl = `${window.location.origin}/dashboard`
      const cancelUrl = `${window.location.origin}/reactivate`
      const res = await api.createCheckoutSession({ plan: 'pro', successUrl, cancelUrl })
      const url = (res.data as any)?.url
      if (!url) throw new Error('Could not start checkout')
      window.location.href = url
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to start checkout')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
          </div>
          <CardTitle>Your trial has ended</CardTitle>
          <CardDescription>
            {canManageBilling
              ? 'Add a payment method to reactivate your workspace and keep your data.'
              : 'Ask the workspace owner to add a payment method to reactivate access.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardFooter className="flex-col gap-2">
          {canManageBilling && (
            <Button onClick={handleAddPayment} disabled={submitting} className="w-full">
              <CreditCard className="mr-2 h-4 w-4" />
              {submitting ? 'Starting checkout…' : 'Add payment method'}
            </Button>
          )}
          <Button variant="outline" className="w-full" asChild>
            <Link href="/pricing">View plans</Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={logout} className="w-full">
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Sign out
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
