'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { Plus, Search, ClipboardList, AlertCircle, Clock, CheckCircle } from 'lucide-react'
import { useState } from 'react'
import { formatDate } from '@/lib/utils'

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  on_hold: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
}

const priorityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
}

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Work Orders</h1>
          <p className="text-muted-foreground">
            Track and manage maintenance work orders
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/work-orders/new">
            <Plus className="h-4 w-4 mr-2" />
            New Work Order
          </Link>
        </Button>
      </div>

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
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
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
            {workOrders.map((wo: any) => (
              <Link key={wo.id} href={`/dashboard/work-orders/${wo.id}`}>
                <Card className="hover:border-primary transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        wo.status === 'completed' ? 'bg-green-100' :
                        wo.status === 'in_progress' ? 'bg-amber-100' :
                        wo.status === 'open' ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        {wo.status === 'completed' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : wo.status === 'in_progress' ? (
                          <Clock className="h-5 w-5 text-amber-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-muted-foreground">
                            {wo.woNumber}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[wo.status] || ''}`}>
                            {wo.status.replace('_', ' ')}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[wo.priority] || ''}`}>
                            {wo.priority}
                          </span>
                        </div>
                        <h3 className="font-medium truncate">{wo.title}</h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          {wo.asset && <span>{wo.asset.name}</span>}
                          <span>Type: {wo.type}</span>
                          {wo.dueDate && <span>Due: {formatDate(wo.dueDate)}</span>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
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
