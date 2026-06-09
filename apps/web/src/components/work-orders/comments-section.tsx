'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatTimeAgo } from '@/lib/utils'
import { toast } from 'sonner'
import { MessageSquare, Send } from 'lucide-react'

interface Member {
  id: string
  firstName?: string
  lastName?: string
  username?: string
  email?: string
}

function displayName(u: { firstName?: string; lastName?: string; username?: string; email?: string }): string {
  const full = [u.firstName, u.lastName].filter(Boolean).join(' ')
  return full || u.username || u.email || 'User'
}

/** The @token used in the body (no spaces removed; emails fall back to local-part). */
function mentionLabel(u: Member): string {
  const full = [u.firstName, u.lastName].filter(Boolean).join(' ')
  if (full) return full
  if (u.username) return u.username
  return (u.email || 'user').split('@')[0]
}

function initialsOf(u: { firstName?: string; lastName?: string; username?: string; email?: string }): string {
  const a = u.firstName?.[0] || u.username?.[0] || u.email?.[0] || 'U'
  const b = u.lastName?.[0] || ''
  return (a + b).toUpperCase()
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Render a comment body, highlighting @mentions of known members. */
function renderBody(body: string, members: Member[]): React.ReactNode {
  const labels = members.map(mentionLabel).filter(Boolean)
  if (labels.length === 0) return body
  // Longest labels first so multi-word names win over their prefixes.
  const pattern = labels
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|')
  const re = new RegExp(`@(${pattern})`, 'g')
  const out: React.ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  let key = 0
  while ((m = re.exec(body)) !== null) {
    if (m.index > last) out.push(body.slice(last, m.index))
    out.push(
      <span key={`m-${key++}`} className="rounded bg-primary/10 px-1 font-medium text-primary">
        {m[0]}
      </span>,
    )
    last = m.index + m[0].length
  }
  if (last < body.length) out.push(body.slice(last))
  return out
}

export function CommentsSection({ workOrderId }: { workOrderId: string }) {
  const queryClient = useQueryClient()
  const [body, setBody] = React.useState('')
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // @mention autocomplete state
  const [mentionQuery, setMentionQuery] = React.useState<string | null>(null)
  const atStartRef = React.useRef<number>(0)
  const [activeIdx, setActiveIdx] = React.useState(0)
  // Mentions the user explicitly inserted (id + the @label as written).
  const insertedRef = React.useRef<{ id: string; label: string }[]>([])

  const { data: commentsData, isLoading } = useQuery({
    queryKey: ['work-order', workOrderId, 'comments'],
    queryFn: async () => (await api.getWorkOrderComments(workOrderId)).data,
  })
  const comments: any[] = Array.isArray(commentsData) ? commentsData : []

  const { data: membersData } = useQuery({
    queryKey: ['members', 'mention'],
    queryFn: async () => {
      const res = await api.getUsers({ limit: 100 })
      return res?.data?.data ?? res?.data ?? []
    },
  })
  const members: Member[] = Array.isArray(membersData) ? membersData : []

  const suggestions =
    mentionQuery === null
      ? []
      : members
          .filter((m) => {
            const q = mentionQuery.toLowerCase()
            return (
              !q ||
              displayName(m).toLowerCase().includes(q) ||
              (m.email || '').toLowerCase().includes(q)
            )
          })
          .slice(0, 6)

  const addMutation = useMutation({
    mutationFn: ({ text, mentions }: { text: string; mentions: string[] }) =>
      api.addWorkOrderComment(workOrderId, text, mentions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId, 'comments'] })
      setBody('')
      insertedRef.current = []
      setMentionQuery(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to add comment'),
  })

  function detectMention(value: string, caret: number) {
    const before = value.slice(0, caret)
    const match = /@([\w.'-]*)$/.exec(before)
    if (match) {
      atStartRef.current = caret - match[0].length
      setMentionQuery(match[1])
      setActiveIdx(0)
    } else {
      setMentionQuery(null)
    }
  }

  function onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value
    setBody(value)
    detectMention(value, e.target.selectionStart ?? value.length)
  }

  function pickMention(member: Member) {
    const label = mentionLabel(member)
    const ta = textareaRef.current
    const caret = ta?.selectionStart ?? body.length
    const start = atStartRef.current
    const next = `${body.slice(0, start)}@${label} ${body.slice(caret)}`
    setBody(next)
    insertedRef.current = [...insertedRef.current.filter((x) => x.id !== member.id), { id: member.id, label }]
    setMentionQuery(null)
    // Restore focus + caret after the inserted mention.
    requestAnimationFrame(() => {
      if (ta) {
        const pos = start + label.length + 2
        ta.focus()
        ta.setSelectionRange(pos, pos)
      }
    })
  }

  function submit() {
    const text = body.trim()
    if (!text) return
    const mentions = Array.from(
      new Set(insertedRef.current.filter((x) => body.includes(`@${x.label}`)).map((x) => x.id)),
    )
    addMutation.mutate({ text, mentions })
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionQuery !== null && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx((i) => (i + 1) % suggestions.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        pickMention(suggestions[activeIdx])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setMentionQuery(null)
        return
      }
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      submit()
    }
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
        <div className="relative flex gap-3">
          <div className="relative flex-1">
            <Textarea
              ref={textareaRef}
              value={body}
              onChange={onChange}
              onKeyDown={onKeyDown}
              placeholder="Add a comment…  use @ to mention a teammate"
              rows={2}
            />
            {mentionQuery !== null && suggestions.length > 0 && (
              <div className="absolute z-20 mt-1 w-72 overflow-hidden rounded-md border bg-popover shadow-md">
                {suggestions.map((m, i) => (
                  <button
                    key={m.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      pickMention(m)
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-sm',
                      i === activeIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
                    )}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                      {initialsOf(m)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{displayName(m)}</span>
                      {m.email && <span className="block truncate text-xs text-muted-foreground">{m.email}</span>}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
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
                  <span className="text-xs font-medium text-primary">{initialsOf(c.user || {})}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold">{c.user ? displayName(c.user) : 'Someone'}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.createdAt ? formatTimeAgo(new Date(c.createdAt)) : ''}
                    </span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed mt-0.5">
                    {renderBody(c.body, members)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
