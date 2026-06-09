'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { AxiosResponse } from 'axios'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, AlertTriangle, RotateCcw } from 'lucide-react'
import { AiMarkdown } from './ai-markdown'

export interface AiAction {
  key: string
  label: string
  icon: LucideIcon
  /** When set, reveal a textarea; `required` actions wait for input before running. */
  input?: { placeholder: string; required?: boolean }
  run: (input?: string) => Promise<AxiosResponse>
}

function extractAiText(data: unknown): string {
  if (typeof data === 'string') return data
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    return (
      (d.result as string) ||
      (d.response as string) ||
      (d.content as string) ||
      (d.summary as string) ||
      ''
    )
  }
  return ''
}

function extractError(err: unknown): string {
  const e = err as { response?: { data?: { message?: string | string[] } }; message?: string }
  const msg = e?.response?.data?.message || e?.message || 'Something went wrong. Please try again.'
  return Array.isArray(msg) ? msg.join(', ') : msg
}

export function AiActionCard({
  description,
  actions,
}: {
  description: string
  actions: AiAction[]
}) {
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const active = actions.find((a) => a.key === activeKey) ?? null

  const mutation = useMutation({
    mutationFn: (action: AiAction) => action.run(input.trim() || undefined),
    onMutate: () => {
      setResult(null)
      setUnavailable(false)
      setErrorMsg(null)
    },
    onSuccess: (res) => setResult(extractAiText(res.data) || 'No response was returned.'),
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 503) setUnavailable(true)
      else setErrorMsg(extractError(err))
    },
  })

  const onActionClick = (action: AiAction) => {
    setActiveKey(action.key)
    setResult(null)
    setUnavailable(false)
    setErrorMsg(null)
    // Required-input actions wait for the user to type and submit.
    if (action.input?.required) return
    mutation.mutate(action)
  }

  const canSubmit = !active?.input?.required || input.trim().length > 0

  return (
    <Card>
      <CardHeader className="pb-3 border-b border-border/50">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-3">
        <p className="text-xs text-muted-foreground">{description}</p>

        <div className="flex flex-wrap gap-2">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <Button
                key={action.key}
                variant={activeKey === action.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => onActionClick(action)}
                disabled={mutation.isPending}
              >
                <Icon className="h-4 w-4 mr-1.5" />
                {action.label}
              </Button>
            )
          })}
        </div>

        {active?.input && (
          <div className="space-y-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={active.input.placeholder}
              rows={3}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canSubmit && !mutation.isPending) {
                  e.preventDefault()
                  mutation.mutate(active)
                }
              }}
            />
            <Button size="sm" disabled={!canSubmit || mutation.isPending} onClick={() => mutation.mutate(active)}>
              {mutation.isPending ? 'Thinking…' : 'Get answer'}
            </Button>
          </div>
        )}

        {mutation.isPending && (
          <div className="flex items-center gap-1.5 py-2">
            <span className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
            <span className="text-xs text-muted-foreground ml-1">Analyzing…</span>
          </div>
        )}

        {unavailable && !mutation.isPending && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300/50 bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              The AI assistant isn&rsquo;t configured yet. An admin can enable it by setting an AI provider
              (e.g. <code>ANTHROPIC_API_KEY</code>).
            </span>
          </div>
        )}

        {errorMsg && !mutation.isPending && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {result && !mutation.isPending && (
          <div className="rounded-md border bg-muted/40 p-3">
            <AiMarkdown content={result} />
            {active && (
              <div className="mt-2 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => mutation.mutate(active)}
                  disabled={mutation.isPending}
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Regenerate
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
