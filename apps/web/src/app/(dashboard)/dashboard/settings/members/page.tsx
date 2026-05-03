'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'
import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PageHeader } from '@/components/ui/page-header'
import { UserPlus, Trash2, MailX } from 'lucide-react'
import { toast } from 'sonner'

const ROLE_OPTIONS = ['member', 'admin'] as const

export default function MembersPage() {
  const { activeOrgId, user } = useAuth()
  const queryClient = useQueryClient()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]>('member')

  const membersQuery = useQuery({
    queryKey: ['org-members', activeOrgId],
    queryFn: async () => {
      const res = await authClient.organization.listMembers({ query: {} })
      return res.data?.members ?? []
    },
    enabled: !!activeOrgId,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  })

  const invitationsQuery = useQuery({
    queryKey: ['org-invitations', activeOrgId],
    queryFn: async () => {
      const res = await authClient.organization.listInvitations()
      return res.data ?? []
    },
    enabled: !!activeOrgId,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  })

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const res = await authClient.organization.inviteMember({ email, role })
      if (res.error) throw new Error(res.error.message || 'Failed to invite')
      return res.data
    },
    onSuccess: () => {
      toast.success(`Invitation sent to ${email}`)
      setEmail('')
      setRole('member')
      setInviteOpen(false)
      queryClient.invalidateQueries({ queryKey: ['org-invitations', activeOrgId] })
      queryClient.invalidateQueries({ queryKey: ['org-members', activeOrgId] })
    },
    onError: (err: any) => toast.error(err.message || 'Failed to invite member'),
  })

  const removeMutation = useMutation({
    mutationFn: async (memberIdOrEmail: string) => {
      const res = await authClient.organization.removeMember({ memberIdOrEmail })
      if (res.error) throw new Error(res.error.message || 'Failed to remove member')
    },
    onSuccess: () => {
      toast.success('Member removed')
      queryClient.invalidateQueries({ queryKey: ['org-members', activeOrgId] })
    },
    onError: (err: any) => toast.error(err.message || 'Failed to remove member'),
  })

  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const res = await authClient.organization.cancelInvitation({ invitationId })
      if (res.error) throw new Error(res.error.message || 'Failed to cancel')
    },
    onSuccess: () => {
      toast.success('Invitation cancelled')
      queryClient.invalidateQueries({ queryKey: ['org-invitations', activeOrgId] })
    },
    onError: (err: any) => toast.error(err.message || 'Failed to cancel invitation'),
  })

  const members = membersQuery.data ?? []
  const invitations = (invitationsQuery.data ?? []).filter(
    (inv: any) => inv.status === 'pending',
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description="Invite teammates and manage who can access this workspace."
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite member
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Active members</CardTitle>
          <CardDescription>
            {membersQuery.isLoading ? 'Loading…' : `${members.length} member${members.length === 1 ? '' : 's'}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    {m.user?.name || m.user?.email || '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.user?.email || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {m.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {m.user?.id !== user?.id && m.role !== 'owner' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(`Remove ${m.user?.email} from this workspace?`)) {
                            removeMutation.mutate(m.id)
                          }
                        }}
                        title="Remove member"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {members.length === 0 && !membersQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No members yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending invitations</CardTitle>
          <CardDescription>
            {invitations.length === 0 ? 'No pending invitations.' : `${invitations.length} pending`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitations.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {inv.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {inv.expiresAt ? new Date(inv.expiresAt).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(`Cancel invitation for ${inv.email}?`)) {
                            cancelInvitationMutation.mutate(inv.id)
                          }
                        }}
                        title="Cancel invitation"
                      >
                        <MailX className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a teammate</DialogTitle>
            <DialogDescription>
              They'll receive an email with a link to join this workspace.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              inviteMutation.mutate()
            }}
          >
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teammate@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <select
                  id="invite-role"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Admins can invite others and manage settings. Members can use the app but can't modify the org.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? 'Sending…' : 'Send invite'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
