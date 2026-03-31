import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-muted-foreground">Page not found</p>
        <Link
          href="/dashboard"
          className="inline-block text-sm text-primary underline underline-offset-4 hover:text-primary/80"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}
