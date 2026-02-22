'use client'

import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Wrench, Shield, BarChart3, Clock } from 'lucide-react'

export default function HomePage() {
  const { isAuthenticated, isLoading, login } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (isAuthenticated) {
    // Redirect to dashboard
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard'
    }
    return null
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
            Streamline your maintenance operations with our self-hosted, 
            AI-powered solution.
          </p>
          <Button size="lg" onClick={login}>
            Sign In to Continue
          </Button>
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
              <CardTitle className="text-lg">Self-Hosted</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Keep your data on-premises with full control. 
                No cloud dependencies required.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
