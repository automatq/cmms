'use client'

import { ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface DrillDownSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  className?: string
}

/**
 * Wide modal used by report pages to surface the underlying records
 * behind an aggregate chart segment. Reuses the existing Radix Dialog
 * (sized wider than the form dialogs) plus a ScrollArea so long lists
 * scroll inside the panel instead of the page.
 *
 * No Sheet primitive lives in components/ui yet — a true right-side
 * Sheet would be a UI primitive PR of its own; this gets us the value
 * (click-to-see-records) without that scope.
 */
export function DrillDownSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: DrillDownSheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-3xl w-[90vw] max-h-[85vh] flex flex-col p-0 gap-0',
          className,
        )}
      >
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <ScrollArea className="flex-1">
          <div className="p-6">{children}</div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
