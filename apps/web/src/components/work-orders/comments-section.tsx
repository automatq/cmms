'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { formatTimeAgo } from '@/lib/utils'
import { toast } from 'sonner'
import { MessageSquare, Send } from 'lucide-react'

function authorName(user: any): string {
  if (!user) return 'Someone'
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ')
  return full || user.username || user.email || 'Someone'
}

function authorInitials(user: any): string {
  if (!user) return 'U'
  const a = user.firstName?.[0] || user.username?.[0] || user.email?.[0] || 'U'
  const b = user.lastName?.[0] || ''
  return (a + b).toUpperCase()
}

export function CommentsSection({ workOrderId }: { workOrderId: string }) {
  const queryClient = useQueryClient()
  const [body, setBody] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['work-order', workOrderId, 'comments'],
    queryFn: async () => (await api.getWorkOrderComments(workOrderId)).data,
  })
  const comments: any[] = Array.isArray(data) ? data : []

  const addMutation = useMutation({
    mutationFn: (text: string) => api.addWorkOrderComment(workOrderId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId, 'comments'] })
      setBody('')
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || 'Failed to add comment'),
  })

  const submit = () => {
    const text = body.trim()
    if (text) addMutation.mutate(text)
  }

  return (
    <Card>
      <CardHeader className="pb-3 border-b border-border/50">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary/70" />
          Comments
          {comments.length > 0 && (
            <span className="rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground">
              {comments.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-5">
        {/* Composer */}
        <div className="flex gap-3">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment…"
            rows={2}
            className="flex-1"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit()
            }}
          />
          <Button onClick={submit} disabled={!body.trim() || addMutation.isPending} className="self-end">
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Thread */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No comments yet. Start the conversation.</p>
        ) : (
          <div className="space-y-4">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-medium text-primary">{authorInitials(c.user)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold">{authorName(c.user)}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.createdAt ? formatTimeAgo(new Date(c.createdAt)) : ''}
                    </span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed mt-0.5">{c.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
