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
import { getWorkOrderStatusMeta, getWorkOrderPriorityMeta } from '@/lib/status'
import { cn } from '@/lib/utils'
import { Plus, Search, ClipboardList } from 'lucide-react'
import { useState } from 'react'

export default function WorkOrdersPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['work-orders', search, statusFilter, page],
    queryFn: async () => {
      const res = await api.getWorkOrders({
        search,
        status: statusFilter || undefined,
        page,
        limit: 20
      })
      return res.data
    },
  })

  const workOrders = data?.data || []
  const total = data?.total || 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work Orders"
        description="Track and manage maintenance work orders"
        actions={
          <Button asChild>
            <Link href="/dashboard/work-orders/new">
              <Plus className="h-4 w-4 mr-2" />
              New Work Order
            </Link>
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search work orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('')}
          >
            All
          </Button>
          <Button
            variant={statusFilter === 'open' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('open')}
          >
            Open
          </Button>
          <Button
            variant={statusFilter === 'in_progress' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('in_progress')}
          >
            In Progress
          </Button>
          <Button
            variant={statusFilter === 'completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('completed')}
          >
            Completed
          </Button>
        </div>
      </div>

      {/* Work Orders List */}
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
              {search || statusFilter ? 'Try different filters' : 'Create your first work order'}
            </p>
            <Button asChild>
              <Link href="/dashboard/work-orders/new">
                <Plus className="h-4 w-4 mr-2" />
                New Work Order
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
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
                          <span className="text-sm font-semibold text-muted-foreground">
                            {wo.woNumber}
                          </span>
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

          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {Math.ceil(total / 20)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(total / 20)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
