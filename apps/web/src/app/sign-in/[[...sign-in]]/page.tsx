'use client'

import { useEffect } from 'react'

export default function SignInPage() {
  useEffect(() => {
    window.location.href = '/auth/login'
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Redirecting to login...</p>
    </div>
  )
}
