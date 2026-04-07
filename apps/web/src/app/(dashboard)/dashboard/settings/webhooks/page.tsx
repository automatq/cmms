'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { PageHeader } from '@/components/ui/page-header'
import { Plus, Webhook, Trash2, Play, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

const AVAILABLE_EVENTS = [
  'wo.created', 'wo.completed', 'wo.assigned', 'wo.status_changed',
  'pm.triggered', 'asset.status_changed', 'stock.low', 'request.submitted',
]

export default function WebhooksPage() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [newWebhook, setNewWebhook] = useState({ url: '', events: [] as string[] })

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => api.getWebhooks().then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createWebhook(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      setShowCreate(false)
      setNewWebhook({ url: '', events: [] })
      toast.success('Webhook created')
    },
    onError: () => toast.error('Failed to create webhook'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteWebhook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      toast.success('Webhook deleted')
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.updateWebhook(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webhooks'] }),
  })

  const testMutation = useMutation({
    mutationFn: (id: string) => api.testWebhook(id),
    onSuccess: () => toast.success('Test webhook sent'),
    onError: () => toast.error('Test failed'),
  })

  const toggleEvent = (event: string) => {
    setNewWebhook((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Webhooks"
        description="Send real-time event notifications to external services"
        actions={
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />New Webhook</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Webhook</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="https://example.com/webhook"
                  value={newWebhook.url}
                  onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                />
                <div>
                  <p className="text-sm font-medium mb-2">Events</p>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_EVENTS.map((event) => (
                      <Badge
                        key={event}
                        variant={newWebhook.events.includes(event) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleEvent(event)}
                      >
                        {event}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => createMutation.mutate(newWebhook)}
                  disabled={!newWebhook.url || !newWebhook.events.length || createMutation.isPending}
                >
                  Create Webhook
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="h-24" /></Card>
          ))}
        </div>
      ) : !webhooks?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Webhook className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-medium">No webhooks configured</p>
            <p className="text-sm text-muted-foreground">Create a webhook to receive real-time event notifications</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {webhooks.map((wh: any) => (
            <Card key={wh.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium truncate">{wh.url}</span>
                    {wh.failCount > 0 && (
                      <Badge variant="destructive">{wh.failCount} failures</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {wh.events?.map((e: string) => (
                      <Badge key={e} variant="secondary" className="text-xs">{e}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Switch
                    checked={wh.isActive}
                    onCheckedChange={(checked: boolean) => toggleMutation.mutate({ id: wh.id, isActive: checked })}
                  />
                  <Button variant="outline" size="sm" onClick={() => testMutation.mutate(wh.id)}>
                    <Play className="h-3 w-3 mr-1" />Test
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(wh.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
