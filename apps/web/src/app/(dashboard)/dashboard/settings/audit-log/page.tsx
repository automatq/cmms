'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollText } from 'lucide-react'
import { formatDate } from '@/lib/utils'

type AuditRow = {
  id: string
  userId: string
  action: string
  resourceType: string
  resourceId: string | null
  afterData: Record<string, unknown> | null
  createdAt: string
}

function summarize(after: Record<string, unknown> | null): string {
  if (!after) return ''
  return Object.entries(after)
    .map(([k, v]) => `${k}: ${v ?? '—'}`)
    .join(' · ')
}

export default function AuditLogPage() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => (await api.getAuditLogs()).data as AuditRow[],
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="A tamper-evident trail of key actions across your organization."
      />

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : !logs || logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center border border-dashed rounded-lg">
          <ScrollText className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No audit entries yet.</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                <Badge variant="secondary" className="font-mono text-[10px] shrink-0 mt-0.5">
                  {log.action}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{summarize(log.afterData) || log.resourceType}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.resourceType}
                    {log.resourceId ? ` · ${log.resourceId.slice(0, 8)}` : ''}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{formatDate(log.createdAt)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
