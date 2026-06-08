'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ColumnDef,
  SortingState,
  RowSelectionState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { toast } from 'sonner'
import { ArrowUpDown, ChevronDown, X } from 'lucide-react'

import { api } from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  getWorkOrderStatusMeta,
  getWorkOrderPriorityMeta,
  canTransition,
  WO_STATUS_META,
  WO_STATUS_ORDER,
  type WorkOrderStatus,
} from '@/lib/status'

interface WorkOrder {
  id: string
  woNumber?: string
  title?: string
  status: string
  priority: string
  type?: string
  asset?: { name?: string }
  dueDate?: string
}

function SortHeader({ column, children }: { column: any; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 hover:text-foreground"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
    >
      {children}
      <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
    </button>
  )
}

export function WorkOrdersTable({ data }: { data: WorkOrder[] }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [confirmCancel, setConfirmCancel] = React.useState(false)

  const columns = React.useMemo<ColumnDef<WorkOrder>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onChange={(e) => row.toggleSelected(e.target.checked)}
            aria-label="Select row"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'woNumber',
        header: ({ column }) => <SortHeader column={column}>WO #</SortHeader>,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">{row.original.woNumber}</span>
        ),
      },
      {
        accessorKey: 'title',
        header: ({ column }) => <SortHeader column={column}>Title</SortHeader>,
        cell: ({ row }) => (
          <Link
            href={`/dashboard/work-orders/${row.original.id}`}
            className="font-medium hover:text-primary hover:underline"
          >
            {row.original.title || 'Untitled'}
          </Link>
        ),
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <SortHeader column={column}>Status</SortHeader>,
        cell: ({ row }) => <StatusBadge meta={getWorkOrderStatusMeta(row.original.status)} dot />,
      },
      {
        accessorKey: 'priority',
        header: ({ column }) => <SortHeader column={column}>Priority</SortHeader>,
        cell: ({ row }) => <StatusBadge meta={getWorkOrderPriorityMeta(row.original.priority)} />,
      },
      {
        id: 'asset',
        header: 'Asset',
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.asset?.name || '—'}</span>,
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => <span className="text-sm capitalize text-muted-foreground">{row.original.type || '—'}</span>,
      },
      {
        accessorKey: 'dueDate',
        header: ({ column }) => <SortHeader column={column}>Due</SortHeader>,
        cell: ({ row }) =>
          row.original.dueDate ? (
            <span className="text-sm text-muted-foreground">{formatDate(row.original.dueDate)}</span>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          ),
      },
    ],
    [],
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
  })

  const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original)
  const selectedCount = selectedRows.length

  const bulkMutation = useMutation({
    mutationFn: async (target: WorkOrderStatus) => {
      const eligible = selectedRows.filter((wo) => canTransition(wo.status, target))
      const results = await Promise.allSettled(
        eligible.map((wo) => api.updateWorkOrderStatus(wo.id, target)),
      )
      const ok = results.filter((r) => r.status === 'fulfilled').length
      return { ok, skipped: selectedRows.length - eligible.length, failed: eligible.length - ok }
    },
    onSuccess: ({ ok, skipped, failed }, target) => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      setRowSelection({})
      setConfirmCancel(false)
      const label = WO_STATUS_META[target].label
      let msg = `${ok} work order${ok === 1 ? '' : 's'} → ${label}`
      if (skipped) msg += ` · ${skipped} skipped (invalid transition)`
      if (failed) msg += ` · ${failed} failed`
      ok > 0 ? toast.success(msg) : toast.error(msg)
    },
    onError: () => toast.error('Bulk update failed'),
  })

  return (
    <div className="space-y-3">
      {/* Bulk action bar */}
      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-2.5 shadow-soft">
          <span className="text-sm font-medium">{selectedCount} selected</span>
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={bulkMutation.isPending}>
                  Change status
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Set status to…</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {WO_STATUS_ORDER.filter((s) => s !== 'cancelled').map((s) => (
                  <DropdownMenuItem key={s} onClick={() => bulkMutation.mutate(s)}>
                    <span className={cn('mr-2 h-2 w-2 rounded-full', WO_STATUS_META[s].dotClass)} />
                    {WO_STATUS_META[s].label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmCancel(true)}
              disabled={bulkMutation.isPending}
            >
              Cancel WOs
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setRowSelection({})} title="Clear selection">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id} className="text-xs uppercase tracking-wide">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                  className="cursor-pointer"
                  onClick={() => router.push(`/dashboard/work-orders/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      onClick={cell.column.id === 'select' ? (e) => e.stopPropagation() : undefined}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No work orders found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {selectedCount} work order{selectedCount === 1 ? '' : 's'}?</AlertDialogTitle>
            <AlertDialogDescription>
              This sets them to Cancelled. Work orders that can&apos;t be cancelled from their current state are
              skipped. This can be reversed manually per work order.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault()
                bulkMutation.mutate('cancelled')
              }}
            >
              Cancel work orders
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
