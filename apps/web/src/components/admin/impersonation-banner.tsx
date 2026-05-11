'use client'

import { useState } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { getStoredToken } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'
const AUTH_BASE = API_URL.replace(/\/api\/v1\/?$/, '') + '/api/auth'

export function ImpersonationBanner() {
  const { impersonatedBy, user } = useAuth()
  const router = useRouter()
  const [stopping, setStopping] = useState(false)

  if (!impersonatedBy) return null

  const stopImpersonating = async () => {
    setStopping(true)
    try {
      const token = getStoredToken()
      const res = await fetch(`${AUTH_BASE}/admin/stop-impersonating`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success('Stopped impersonating')
      router.refresh()
    } catch (err) {
      toast.error(`Could not stop impersonating: ${(err as Error).message}`)
    } finally {
      setStopping(false)
    }
  }

  return (
    <div className="sticky top-0 z-40 bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between text-sm shadow">
      <div>
        <strong>Impersonating</strong>
        {user ? ` ${user.firstName} ${user.lastName} (${user.email})` : ''}
        <span className="ml-2 opacity-75">— actions are recorded in the audit log</span>
      </div>
      <button
        onClick={stopImpersonating}
        disabled={stopping}
        className="rounded bg-amber-950 text-amber-50 px-3 py-1 hover:bg-amber-900 disabled:opacity-50"
      >
        {stopping ? 'Stopping…' : 'Stop impersonating'}
      </button>
    </div>
  )
}
