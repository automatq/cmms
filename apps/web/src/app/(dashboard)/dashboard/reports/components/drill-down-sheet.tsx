'use client'

import { ReactNode } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
} from '@/components/ui/sheet'
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
 * Right-side panel used by report pages to surface the underlying records
 * behind an aggregate chart segment. Built on the real Sheet primitive — long
 * lists scroll inside the panel body instead of the page.
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={cn('w-full sm:max-w-xl', className)}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <SheetBody>{children}</SheetBody>
      </SheetContent>
    </Sheet>
  )
}
