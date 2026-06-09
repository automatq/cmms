'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

// Per-event email toggles (default on when missing).
const EMAIL_EVENTS: { key: string; label: string }[] = [
  { key: 'email_wo_assigned', label: 'Work order assigned to me' },
  { key: 'email_wo_status_changed', label: 'Work order status changed' },
  { key: 'email_wo_due_soon', label: 'Work order due soon' },
  { key: 'email_wo_overdue', label: 'Work order overdue' },
  { key: 'email_pm_due', label: 'PM plan due' },
  { key: 'email_low_stock', label: 'Low stock alert' },
  { key: 'email_work_request', label: 'New work request' },
  { key: 'email_mention', label: 'Mentioned in a comment' },
]

type Prefs = Record<string, unknown>

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-muted'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export default function NotificationSettingsPage() {
  const queryClient = useQueryClient()
  const [prefs, setPrefs] = useState<Prefs>({})

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => (await api.getMyProfile()).data,
  })

  useEffect(() => {
    if (profile?.notificationPreferences) setPrefs(profile.notificationPreferences)
  }, [profile])

  const saveMutation = useMutation({
    mutationFn: (next: Prefs) => api.updateNotificationPreferences(next),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] })
      toast.success('Notification preferences saved')
    },
    onError: () => toast.error('Failed to save preferences'),
  })

  // Email toggles treat a missing value as enabled.
  const emailOn = (key: string) => prefs[key] !== false
  const set = (key: string, value: unknown) => setPrefs((p) => ({ ...p, [key]: value }))
  const bool = (key: string) => prefs[key] === true
  const str = (key: string) => (typeof prefs[key] === 'string' ? (prefs[key] as string) : '')

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-1/2" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Choose how you want to be notified."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email</CardTitle>
          <CardDescription>Which events send you an email.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {EMAIL_EVENTS.map((e) => (
            <div key={e.key} className="flex items-center justify-between">
              <span className="text-sm">{e.label}</span>
              <Toggle checked={emailOn(e.key)} onChange={(v) => set(e.key, v)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Additional channels</CardTitle>
          <CardDescription>
            Opt into SMS, Slack or Teams for assignment, due-soon, overdue and PM-due alerts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">SMS (Twilio)</span>
              <Toggle checked={bool('channel_sms_enabled')} onChange={(v) => set('channel_sms_enabled', v)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sms-phone" className="text-xs">Phone number (E.164)</Label>
              <Input
                id="sms-phone"
                placeholder="+15551234567"
                value={str('channel_sms_phone')}
                onChange={(e) => set('channel_sms_phone', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Slack</span>
              <Toggle checked={bool('channel_slack_enabled')} onChange={(v) => set('channel_slack_enabled', v)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="slack-webhook" className="text-xs">Incoming webhook URL</Label>
              <Input
                id="slack-webhook"
                placeholder="https://hooks.slack.com/services/…"
                value={str('channel_slack_webhook')}
                onChange={(e) => set('channel_slack_webhook', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Microsoft Teams</span>
              <Toggle checked={bool('channel_teams_enabled')} onChange={(v) => set('channel_teams_enabled', v)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="teams-webhook" className="text-xs">Incoming webhook URL</Label>
              <Input
                id="teams-webhook"
                placeholder="https://outlook.office.com/webhook/…"
                value={str('channel_teams_webhook')}
                onChange={(e) => set('channel_teams_webhook', e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <div>
              <span className="text-sm font-medium">Mobile push</span>
              <p className="text-xs text-muted-foreground">Sent to your signed-in mobile devices.</p>
            </div>
            <Toggle checked={prefs.channel_push_enabled !== false} onChange={(v) => set('channel_push_enabled', v)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate(prefs)} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving…' : 'Save preferences'}
        </Button>
      </div>
    </div>
  )
}
