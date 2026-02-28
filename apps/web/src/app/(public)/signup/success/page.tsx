'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Mail } from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'

export default function SignupSuccessPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const plan = searchParams.get('plan')
  const { login } = useAuth()

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Account Created!</CardTitle>
            <CardDescription>
              Your organization has been set up successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4" />
                <span>Check your inbox</span>
              </div>
              <p className="text-sm text-muted-foreground">
                We&apos;ve sent an invitation to <strong>{email}</strong>.
                Click the link in the email to set up your password and sign in.
              </p>
            </div>

            {plan && plan !== 'free' && (
              <p className="text-sm text-muted-foreground text-center">
                After signing in, you&apos;ll be prompted to set up billing for your {plan} plan.
              </p>
            )}

            <div className="space-y-2">
              <Button className="w-full" onClick={login}>
                Sign In
              </Button>
              <Link href="/pricing" className="block">
                <Button variant="outline" className="w-full">
                  View Plans
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
