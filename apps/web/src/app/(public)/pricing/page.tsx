import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, ArrowRight } from 'lucide-react'

const features = [
  'Unlimited users',
  'Unlimited assets',
  'Work orders & PM scheduling',
  'Public work request portal with QR scan',
  'Inventory & purchase orders',
  'Reports, KPIs & dashboards',
  'AI assistant (failure prediction & troubleshooting)',
  'IoT sensor integrations',
  'CSV import/export',
  'Mobile apps for iOS and Android',
  '50 GB file storage',
  'Email support',
]

export default function PricingPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Free. Everything included.</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Free for every team. No credit card. No per-user pricing surprises.
        </p>
      </div>

      <div className="max-w-md mx-auto">
        <Card className="border-primary shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-3xl">MainTek</CardTitle>
            <div className="mt-4">
              <span className="text-5xl font-bold">$0</span>
              <span className="text-muted-foreground"> forever</span>
            </div>
            <CardDescription className="mt-2">
              Unlimited everything. Every feature included — no card required.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ul className="space-y-3">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            <Link href="/sign-up" className="block">
              <Button className="w-full" size="lg">
                Get started free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <p className="text-center text-xs text-muted-foreground">
              No credit card required. Every feature is included, free.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="text-center mt-16 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-3">Questions?</h2>
        <p className="text-muted-foreground mb-4">
          We answer every email. Reach out and we'll get back to you the same day.
        </p>
        <Button variant="outline" asChild>
          <Link href="/contact">Contact us</Link>
        </Button>
      </div>
    </div>
  )
}
