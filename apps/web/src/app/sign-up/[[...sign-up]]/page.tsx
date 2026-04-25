'use client'

import { useEffect } from 'react'

export default function SignUpPage() {
  useEffect(() => {
    window.location.href = '/auth/login?screen_hint=signup'
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Redirecting to sign up...</p>
    </div>
  )
}
