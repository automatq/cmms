import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Wrench,
  ClipboardList,
  Calendar,
  Sparkles,
  BarChart3,
  Boxes,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20">
      {/* Top nav */}
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Wrench className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">Nexly</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/features" className="text-muted-foreground hover:text-foreground">Features</Link>
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground">Pricing</Link>
            <Link href="/about" className="text-muted-foreground hover:text-foreground">About</Link>
            <Link href="/contact" className="text-muted-foreground hover:text-foreground">Contact</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-up">Start free trial</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          Now with AI-powered failure prediction
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          Maintenance management,
          <br />
          <span className="text-primary">finally simple.</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Track assets, schedule preventive maintenance, and close work orders from your phone.
          Built for facility teams that don't have time for clunky software.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button size="lg" asChild>
            <Link href="/sign-up">
              Start 14-day free trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/pricing">View pricing</Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          No credit card required · Full access for 14 days
        </p>
      </section>

      {/* Feature grid */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Everything you need, nothing you don't</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            One platform to manage every asset, work order, and PM plan across your facility.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            { icon: ClipboardList, title: 'Work Orders', desc: 'Create, assign, and complete work orders from web or mobile. QR scan to start.' },
            { icon: Calendar, title: 'Preventive Maintenance', desc: 'Time- and meter-based PM plans. Auto-generate work orders on schedule.' },
            { icon: Boxes, title: 'Asset Management', desc: 'Hierarchical asset tree, custom fields, condition logs, and downtime tracking.' },
            { icon: BarChart3, title: 'Reports & KPIs', desc: 'MTTR, MTBF, PM compliance, OEE, backlog aging — built in, no setup.' },
            { icon: Sparkles, title: 'AI Assistant', desc: 'Natural-language troubleshooting and failure prediction trained on your asset data.' },
            { icon: Wrench, title: 'Public Request Portal', desc: 'Anyone in your facility can scan a QR code and submit a work request — no account needed.' },
          ].map((f) => (
            <Card key={f.title} className="border-2 hover:border-primary/40 transition-colors">
              <CardContent className="pt-6">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Why us */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for the field</h2>
            <p className="text-muted-foreground mb-6">
              Most CMMS tools were designed for office desks. Nexly was built mobile-first because the
              people doing the work are on the floor — wrench in one hand, phone in the other.
            </p>
            <ul className="space-y-3">
              {[
                'Scan an asset QR to start work in 2 seconds',
                'Works offline — syncs when you reconnect',
                'No per-user pricing surprises',
                'Onboards in minutes, not weeks',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <Card className="border-primary/20">
            <CardContent className="p-8 space-y-4">
              <div className="text-5xl font-bold text-primary">14 days</div>
              <p className="text-lg font-medium">Full access. No card required.</p>
              <p className="text-sm text-muted-foreground">
                Try every feature free for 14 days. If you love it, add a payment method to keep going.
                If you don't, walk away — no charges, no calls.
              </p>
              <Button asChild className="w-full">
                <Link href="/sign-up">
                  Start your trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            <span>© {new Date().getFullYear()} Nexly</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/features" className="hover:text-foreground">Features</Link>
            <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link href="/about" className="hover:text-foreground">About</Link>
            <Link href="/contact" className="hover:text-foreground">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
