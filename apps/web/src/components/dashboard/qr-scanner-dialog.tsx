'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { QrCode, Loader2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface QrScannerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QrScannerDialog({ open, onOpenChange }: QrScannerDialogProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const scannerRef = useRef<any>(null)
  const [error, setError] = useState<string | null>(null)

  const quickStartMutation = useMutation({
    mutationFn: (assetId: string) => api.quickStartWorkOrder(assetId),
    onSuccess: (res) => {
      const data = res.data
      toast.success(
        data.isNewWorkOrder ? 'New work order created!' : 'Resumed existing work order',
        { description: `WO: ${data.workOrder.woNumber} on ${data.asset.name}` },
      )
      queryClient.invalidateQueries({ queryKey: ['active-activities'] })
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      onOpenChange(false)
      router.push(`/dashboard/work-orders/${data.workOrder.id}`)
    },
    onError: (err: any) => {
      toast.error('Failed to start work', {
        description: err.response?.data?.message || 'Unknown error',
      })
    },
  })

  useEffect(() => {
    if (!open) {
      setError(null)
      return
    }

    let scanner: any = null

    const initScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        scanner = new Html5Qrcode('qr-reader')
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            const match = decodedText.match(/\/assets\/([a-f0-9-]+)/i)
            if (match) {
              scanner.stop().catch(() => {})
              quickStartMutation.mutate(match[1])
            } else {
              setError('Invalid QR code. Expected an asset QR code.')
            }
          },
          () => {},
        )
      } catch {
        setError('Unable to access camera. Please check permissions.')
      }
    }

    // Small delay to let the dialog render the container div
    const timeout = setTimeout(initScanner, 300)

    return () => {
      clearTimeout(timeout)
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
        scannerRef.current = null
      }
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Scan Asset QR Code
          </DialogTitle>
          <DialogDescription>
            Point your camera at an asset QR code to start a work session
          </DialogDescription>
        </DialogHeader>

        <div id="qr-reader" className="w-full rounded-lg overflow-hidden" />

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        {quickStartMutation.isPending && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Starting work session...</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
