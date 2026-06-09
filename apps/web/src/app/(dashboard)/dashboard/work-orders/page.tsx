'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { MultiSelectFilter } from '@/components/ui/multi-select-filter'
import { WorkOrdersTable } from '@/components/work-orders/work-orders-table'
import { WorkOrdersBoard } from '@/components/work-orders/work-orders-board'
import { WorkOrderFormSheet } from '@/components/work-orders/work-order-form-sheet'
import {
  getWorkOrderStatusMeta,
  getWorkOrderPriorityMeta,
  WO_STATUS_ORDER,
  WO_STATUS_META,
  WO_PRIORITY_ORDER,
  WO_PRIORITY_META,
} from '@/lib/status'
import { cn } from '@/lib/utils'
import { Plus, Search, ClipboardList, Rows3, Table as TableIcon, Columns3 } from 'lucide-react'
import { useState } from 'react'

const STATUS_OPTIONS = WO_STATUS_ORDER.map((s) => ({ value: s, label: WO_STATUS_META[s].label }))
const PRIORITY_OPTIONS = WO_PRIORITY_ORDER.map((p) => ({ value: p, label: WO_PRIORITY_META[p].label }))

type View = 'list' | 'table' | 'board'

const VIEW_TABS: { value: View; label: string; icon: typeof Rows3 }[] = [
  { value: 'board', label: 'Board', icon: Columns3 },
  { value: 'list', label: 'List', icon: Rows3 },
  { value: 'table', label: 'Table', icon: TableIcon },
]

export default function WorkOrdersPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [priorityFilter, setPriorityFilter] = useState<string[]>([])
  const [view, setView] = useState<View>('board')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)

  // The board groups everything into lanes, so it needs a wider window than the
  // paginated list/table — capped at the API's max page size (100).
  const isBoard = view === 'board'
  const limit = isBoard ? 100 : 20

  const { data, isLoading } = useQuery({
    queryKey: ['work-orders', search, statusFilter, priorityFilter, isBoard ? 'board' : page, limit],
    queryFn: async () => {
      const res = await api.getWorkOrders({
        search: search || undefined,
        status: statusFilter.length ? statusFilter : undefined,
        priority: priorityFilter.length ? priorityFilter : undefined,
        page: isBoard ? 1 : page,
        limit,
      })
      return res.data
    },
  })

  const workOrders = data?.data || []
  const total = data?.total || 0
  const hasFilters = !!search || statusFilter.length > 0 || priorityFilter.length > 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work Orders"
        description="Track and manage maintenance work orders"
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Work Order
          </Button>
        }
      />

      {/* Filters + view toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search work orders..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-10"
          />
        </div>
        <MultiSelectFilter
          label="Status"
          options={STATUS_OPTIONS}
          selected={statusFilter}
          onChange={(v) => {
            setStatusFilter(v)
            setPage(1)
          }}
        />
        <MultiSelectFilter
          label="Priority"
          options={PRIORITY_OPTIONS}
          selected={priorityFilter}
          onChange={(v) => {
            setPriorityFilter(v)
            setPage(1)
          }}
        />

        {/* View toggle */}
        <div className="ml-auto inline-flex rounded-md border bg-muted/40 p-0.5">
          {VIEW_TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setView(tab.value)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm font-medium transition-colors',
                  view === tab.value
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" /> {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : workOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No work orders found</h3>
            <p className="text-muted-foreground mb-4">
              {hasFilters ? 'Try different filters' : 'Create your first work order'}
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Work Order
            </Button>
          </CardContent>
        </Card>
      ) : view === 'board' ? (
        <WorkOrdersBoard workOrders={workOrders} />
      ) : view === 'table' ? (
        <WorkOrdersTable data={workOrders} />
      ) : (
        <div className="space-y-3">
          {workOrders.map((wo: any) => {
            const statusMeta = getWorkOrderStatusMeta(wo.status)
            const priorityMeta = getWorkOrderPriorityMeta(wo.priority)
            const StatusIcon = statusMeta.icon
            return (
              <Link key={wo.id} href={`/dashboard/work-orders/${wo.id}`} className="block">
                <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                  <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center shrink-0', statusMeta.tileClass)}>
                      <StatusIcon className={cn('h-6 w-6', statusMeta.iconClass)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-sm font-semibold text-muted-foreground">{wo.woNumber}</span>
                        <StatusBadge meta={statusMeta} uppercase />
                        <StatusBadge meta={priorityMeta} uppercase />
                      </div>
                      <h3 className="font-semibold text-lg truncate leading-tight">{wo.title}</h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                        {wo.asset && <span><span className="font-medium">Asset:</span> {wo.asset.name}</span>}
                        <span><span className="font-medium">Type:</span> {wo.type}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {!isBoard && total > 20 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {Math.ceil(total / 20)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / 20)}
          >
            Next
          </Button>
        </div>
      )}

      <WorkOrderFormSheet open={showCreate} onOpenChange={setShowCreate} />
    </div>
  )
}
