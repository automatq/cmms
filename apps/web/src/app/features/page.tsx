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
  QrCode,
  Inbox,
  Bell,
  Smartphone,
  Globe,
  Webhook,
  ArrowRight,
} from 'lucide-react'

const FEATURES = [
  {
    icon: ClipboardList,
    title: 'Work Orders',
    desc: 'Create, assign, and track work orders from web or mobile. Add labor hours, parts, attachments, photos, checklists, and signatures. Real-time status updates across your team.',
  },
  {
    icon: Calendar,
    title: 'Preventive Maintenance',
    desc: 'Schedule recurring PM plans by time, meter readings, or condition triggers. Auto-generate work orders. PM compliance reporting built in.',
  },
  {
    icon: Boxes,
    title: 'Asset Management',
    desc: 'Hierarchical asset tree, custom fields per asset type, condition logs, downtime events, and full work order history per asset. ISO 55000 fields supported out of the box.',
  },
  {
    icon: QrCode,
    title: 'QR Code Tags',
    desc: 'Print QR labels for every asset. Scan to start a work order, log condition, or report a problem. Bulk-print PDF sheets for facility-wide rollout.',
  },
  {
    icon: Inbox,
    title: 'Public Request Portal',
    desc: 'Anyone in your facility can submit a work request — no account required. Scan a QR, describe the issue, and a manager reviews in the dashboard.',
  },
  {
    icon: Smartphone,
    title: 'Mobile App',
    desc: 'Native iOS and Android apps. Works offline — work orders, checklists, and photos sync when you reconnect. Push notifications for assignments.',
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    desc: 'MTTR, MTBF, PM compliance, OEE, backlog aging, technician performance, downtime, warranty alerts, budget vs actual. Export CSV or PDF.',
  },
  {
    icon: Sparkles,
    title: 'AI Assistant',
    desc: 'Natural-language asset troubleshooting, failure prediction, maintenance recommendations. Trained on your asset history for context-aware answers.',
  },
  {
    icon: Bell,
    title: 'Real-time Notifications',
    desc: 'In-app, email, and push notifications for new work requests, status changes, low stock, PM due, warranty expiring, and threshold alerts.',
  },
  {
    icon: Webhook,
    title: 'Webhooks & Integrations',
    desc: 'Push events to Slack, Teams, ERP, or any system that accepts webhooks. CSV import for bulk data migration. REST API for custom integrations.',
  },
  {
    icon: Wrench,
    title: 'Inventory & Parts',
    desc: 'Track parts, storerooms, suppliers, purchase orders, and reorder points. Issue parts to work orders. Cycle counts and stock adjustments.',
  },
  {
    icon: Globe,
    title: 'Multi-tenant Workspaces',
    desc: 'Each company gets an isolated workspace. Invite teammates by email, assign roles, and manage members from one place.',
  },
]

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background">
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
            <Link href="/features" className="text-foreground font-medium">Features</Link>
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

      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Every feature your team needs</h1>
          <p className="text-lg text-muted-foreground">
            From day-one work orders to AI-powered failure prediction, Nexly covers the full maintenance lifecycle.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {FEATURES.map((f) => (
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

        <div className="text-center mt-16">
          <Button size="lg" asChild>
            <Link href="/sign-up">
              Start 14-day free trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground mt-3">No credit card required.</p>
        </div>
      </section>
    </div>
  )
}
