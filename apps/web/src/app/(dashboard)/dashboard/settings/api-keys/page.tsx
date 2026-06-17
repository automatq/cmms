'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { KeyRound, Plus, Copy, Trash2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'

type ApiKeyRow = {
  id: string
  name: string
  keyPrefix: string
  permissions: string[]
  lastUsedAt: string | null
  revokedAt: string | null
  createdAt: string
}

export default function ApiKeysPage() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])
  // Token shown exactly once after creation.
  const [issuedToken, setIssuedToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: keys, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => (await api.getApiKeys()).data as ApiKeyRow[],
  })

  const { data: scopes = [] } = useQuery({
    queryKey: ['api-key-scopes'],
    queryFn: async () => (await api.getApiKeyScopes()).data as string[],
  })

  const createMutation = useMutation({
    mutationFn: () => api.createApiKey({ name, permissions: selectedScopes }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      setIssuedToken(res.data.token)
      setCopied(false)
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to create API key')
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.revokeApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      toast.success('API key revoked')
    },
    onError: () => toast.error('Failed to revoke API key'),
  })

  const toggleScope = (scope: string) =>
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    )

  const openCreate = () => {
    setName('')
    setSelectedScopes([])
    setIssuedToken(null)
    setCreateOpen(true)
  }

  const copyToken = async () => {
    if (!issuedToken) return
    await navigator.clipboard.writeText(issuedToken)
    setCopied(true)
    toast.success('Token copied')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Keys"
        description="Tenant-scoped keys for integrations, sensor gateways and scripts. Send the token in the x-api-key header."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New API Key
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : !keys || keys.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center border border-dashed rounded-lg">
          <KeyRound className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">
            No API keys yet. Create one to integrate external systems.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((k) => (
            <Card key={k.id} className={k.revokedAt ? 'opacity-60' : ''}>
              <CardContent className="p-4 flex items-center gap-4">
                <KeyRound className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{k.name}</p>
                    {k.revokedAt ? (
                      <Badge variant="destructive">Revoked</Badge>
                    ) : (
                      <Badge variant="secondary">Active</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{k.keyPrefix}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {k.permissions.map((p) => (
                      <Badge key={p} variant="outline" className="text-[10px]">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground shrink-0">
                  <p>Created {formatDate(k.createdAt)}</p>
                  <p>{k.lastUsedAt ? `Last used ${formatDate(k.lastUsedAt)}` : 'Never used'}</p>
                </div>
                {!k.revokedAt && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => revokeMutation.mutate(k.id)}
                    disabled={revokeMutation.isPending}
                    title="Revoke key"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          {issuedToken ? (
            <>
              <DialogHeader>
                <DialogTitle>API key created</DialogTitle>
                <DialogDescription>
                  Copy this token now — it will not be shown again.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-xs font-mono break-all">
                  {issuedToken}
                </code>
                <Button variant="outline" size="icon" onClick={copyToken} title="Copy token">
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={() => setCreateOpen(false)}>Done</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>New API key</DialogTitle>
                <DialogDescription>
                  Grant only the scopes the integration needs.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!name.trim()) {
                    toast.error('Name is required')
                    return
                  }
                  if (selectedScopes.length === 0) {
                    toast.error('Select at least one scope')
                    return
                  }
                  createMutation.mutate()
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="key-name">Name</Label>
                  <Input
                    id="key-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sensor gateway, Zapier"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Scopes</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {scopes.map((scope) => (
                      <label key={scope} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedScopes.includes(scope)}
                          onChange={() => toggleScope(scope)}
                          className="h-4 w-4 rounded border-primary"
                        />
                        <span className="font-mono text-xs">{scope}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating…' : 'Create key'}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
