'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient, useSession } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, CheckCircle2, AlertTriangle } from 'lucide-react'

export default function AcceptInvitationPage() {
  const params = useParams()
  const router = useRouter()
  const invitationId = params?.id as string
  const { data: session, isPending: sessionLoading } = useSession()

  const [invitation, setInvitation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)

  // Fetch invitation details
  useEffect(() => {
    if (!invitationId) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await authClient.organization.getInvitation({
          query: { id: invitationId },
        })
        if (cancelled) return
        if (res.error) {
          setError(res.error.message || 'Invitation not found or expired')
        } else {
          setInvitation(res.data)
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Could not load invitation')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [invitationId])

  async function handleAccept() {
    setAccepting(true)
    setError(null)
    try {
      const res = await authClient.organization.acceptInvitation({ invitationId })
      if (res.error) {
        setError(res.error.message || 'Could not accept invitation')
        return
      }
      // Set new org as active and redirect
      const orgId = (res.data as any)?.invitation?.organizationId
      if (orgId) {
        await authClient.organization.setActive({ organizationId: orgId })
      }
      router.push('/dashboard')
    } catch (err: any) {
      setError(err?.message || 'Could not accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  if (loading || sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
        <p className="text-muted-foreground">Loading invitation…</p>
      </div>
    )
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Invitation unavailable</CardTitle>
            <CardDescription>{error || 'This invitation may have expired or been cancelled.'}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full" variant="outline">
              <Link href="/sign-in">Go to sign in</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  const orgName = invitation.organizationName || invitation.organization?.name || 'this workspace'
  const inviteEmail = invitation.email

  // Not signed in — prompt to sign in or sign up
  if (!session) {
    const returnTo = encodeURIComponent(`/invitations/${invitationId}/accept`)
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>You're invited to join {orgName}</CardTitle>
            <CardDescription>
              Sign in or create an account with <strong>{inviteEmail}</strong> to accept.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex-col gap-2">
            <Button asChild className="w-full">
              <Link href={`/sign-up?returnTo=${returnTo}&email=${encodeURIComponent(inviteEmail)}`}>
                Create account
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href={`/sign-in?returnTo=${returnTo}`}>I already have an account</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Signed in but with the wrong email
  if (session.user.email.toLowerCase() !== inviteEmail.toLowerCase()) {
    const returnTo = encodeURIComponent(`/invitations/${invitationId}/accept`)
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <CardTitle>Wrong account</CardTitle>
            <CardDescription>
              This invitation is for <strong>{inviteEmail}</strong>, but you're signed in as{' '}
              <strong>{session.user.email}</strong>.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex-col gap-2">
            <Button asChild className="w-full" variant="outline">
              <Link href={`/sign-in?returnTo=${returnTo}`}>Switch accounts</Link>
            </Button>
            <Button asChild className="w-full" variant="ghost">
              <Link href={`/sign-up?returnTo=${returnTo}&email=${encodeURIComponent(inviteEmail)}`}>
                Create an account for {inviteEmail}
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Signed in with the right email — show accept button
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-primary flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle>Join {orgName}</CardTitle>
          <CardDescription>You'll be added as <strong>{invitation.role || 'member'}</strong>.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardFooter>
          <Button onClick={handleAccept} disabled={accepting} className="w-full">
            {accepting ? 'Joining…' : 'Accept invitation'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
