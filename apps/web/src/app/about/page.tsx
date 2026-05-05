import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Wrench, ArrowRight } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Wrench className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">MainTek</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/features" className="text-muted-foreground hover:text-foreground">Features</Link>
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground">Pricing</Link>
            <Link href="/about" className="text-foreground font-medium">About</Link>
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

      <section className="container mx-auto px-4 py-20 max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">Built by maintenance people, for maintenance people.</h1>
        <div className="prose prose-lg dark:prose-invert">
          <p className="text-muted-foreground text-lg leading-relaxed">
            MainTek was started because every CMMS we used got in the way. Form-heavy. Desktop-first. Locked
            behind sales calls. Priced per user, so management hesitated to roll it out to the full team —
            which meant the people actually doing the work never used it.
          </p>
          <p className="text-muted-foreground text-lg leading-relaxed mt-4">
            We built MainTek to fix that. One transparent price. Mobile-first. QR scanning so a tech can start
            a work order in two seconds. AI to help diagnose failures based on your own asset history.
          </p>
          <p className="text-muted-foreground text-lg leading-relaxed mt-4">
            We're a small team based in North America. We're shipping fast and we listen — if you're testing
            MainTek and have feedback, please <Link href="/contact" className="text-primary underline">tell us</Link>.
          </p>
        </div>

        <div className="mt-12">
          <Button size="lg" asChild>
            <Link href="/sign-up">
              Try MainTek free for 14 days
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
