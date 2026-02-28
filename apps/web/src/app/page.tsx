'use client'

import { useAuth } from '@/providers/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Wrench, Shield, BarChart3, Clock } from 'lucide-react'

export default function HomePage() {
  const { isAuthenticated, isLoading, login } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard')
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-1/3 sm:w-1/4 space-y-2 max-w-sm">
          <Progress />
          <p className="text-sm text-muted-foreground text-center">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Hero */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center">
              <Wrench className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            CMMS
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Computerized Maintenance Management System.
            Streamline your maintenance operations with our
            AI-powered cloud solution.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg">Get Started Free</Button>
            </Link>
            <Button size="lg" variant="outline" onClick={login}>
              Sign In
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            <Link href="/pricing" className="underline hover:text-foreground">
              View pricing plans
            </Link>
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          <Card>
            <CardHeader>
              <Wrench className="h-10 w-10 text-primary mb-2" />
              <CardTitle className="text-lg">Asset Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Track all your equipment, machinery, and facilities in one place
                with hierarchical organization.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Clock className="h-10 w-10 text-primary mb-2" />
              <CardTitle className="text-lg">Preventive Maintenance</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Schedule and automate PM tasks based on time, meter readings,
                or custom triggers.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-10 w-10 text-primary mb-2" />
              <CardTitle className="text-lg">Analytics & Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Gain insights with KPIs, MTTR, MTBF analysis, and
                customizable dashboards.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-10 w-10 text-primary mb-2" />
              <CardTitle className="text-lg">Secure & Reliable</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Enterprise-grade security with tenant isolation,
                encrypted storage, and 99.9% uptime.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
