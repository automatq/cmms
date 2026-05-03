'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/providers/auth-provider'
import { AlertTriangle, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function TrialBanner() {
  const { user } = useAuth()

  const { data: org } = useQuery({
    queryKey: ['organization'],
    queryFn: async () => {
      const res = await api.getOrganization()
      return res.data
    },
    enabled: !!user,
    refetchInterval: 60_000,
  })

  if (!org || org.status !== 'trial' || !org.trialEndsAt) {
    return null
  }

  const trialEnd = new Date(org.trialEndsAt)
  const msLeft = trialEnd.getTime() - Date.now()
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)))

  if (daysLeft <= 0) return null

  const canManageBilling = user?.permissions?.includes('*') || user?.permissions?.includes('billing:write')

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-2.5 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-700/60">
      <div className="flex items-center gap-2 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          <strong>{daysLeft} day{daysLeft === 1 ? '' : 's'}</strong> left in your trial.
          {canManageBilling
            ? ' Add a payment method to keep access after it ends.'
            : ' Ask the workspace owner to add a payment method.'}
        </span>
      </div>
      {canManageBilling && (
        <Button size="sm" variant="outline" onClick={() => api.startPolarCheckout()} className="bg-white">
          <CreditCard className="mr-1.5 h-3.5 w-3.5" />
          Add payment method
        </Button>
      )}
    </div>
  )
}
