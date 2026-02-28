'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, X } from 'lucide-react'

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for small teams getting started with maintenance management.',
    features: [
      { name: 'Up to 3 users', included: true },
      { name: 'Up to 50 assets', included: true },
      { name: '1 GB storage', included: true },
      { name: 'Work orders', included: true },
      { name: 'Preventive maintenance', included: true },
      { name: 'Work request portal', included: true },
      { name: 'Inventory management', included: false },
      { name: 'Reports & analytics', included: false },
      { name: 'AI assistant', included: false },
      { name: 'IoT sensors', included: false },
    ],
    cta: 'Start Free',
    href: '/signup?plan=free',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/month',
    description: 'For growing teams that need advanced features and more capacity.',
    features: [
      { name: 'Up to 25 users', included: true },
      { name: 'Up to 500 assets', included: true },
      { name: '10 GB storage', included: true },
      { name: 'Work orders', included: true },
      { name: 'Preventive maintenance', included: true },
      { name: 'Work request portal', included: true },
      { name: 'Inventory management', included: true },
      { name: 'Reports & analytics', included: true },
      { name: 'AI assistant', included: true },
      { name: 'IoT sensors', included: false },
    ],
    cta: 'Start Pro Trial',
    href: '/signup?plan=pro',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: '$149',
    period: '/month',
    description: 'For large organizations with unlimited needs and premium support.',
    features: [
      { name: 'Unlimited users', included: true },
      { name: 'Unlimited assets', included: true },
      { name: '100 GB storage', included: true },
      { name: 'Work orders', included: true },
      { name: 'Preventive maintenance', included: true },
      { name: 'Work request portal', included: true },
      { name: 'Inventory management', included: true },
      { name: 'Reports & analytics', included: true },
      { name: 'AI assistant', included: true },
      { name: 'IoT sensors', included: true },
    ],
    cta: 'Start Enterprise Trial',
    href: '/signup?plan=enterprise',
    popular: false,
  },
]

export default function PricingPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Choose the plan that fits your team. Start free and upgrade as you grow.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={plan.popular ? 'border-primary shadow-lg relative' : 'relative'}
          >
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                Most Popular
              </Badge>
            )}
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>
              <CardDescription className="mt-2">{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature.name} className="flex items-center gap-2">
                    {feature.included ? (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className={feature.included ? '' : 'text-muted-foreground'}>
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>
              <Link href={plan.href} className="block">
                <Button
                  className="w-full"
                  variant={plan.popular ? 'default' : 'outline'}
                >
                  {plan.cta}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
