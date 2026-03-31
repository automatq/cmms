'use client'

import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Printer, QrCode, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface AssetQrCardProps {
  assetId: string
  assetName: string
  assetNumber?: string
  canManage?: boolean
  showBulkPrintShortcut?: boolean
  note?: string
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function openPdfForPrint(blob: Blob) {
  const url = URL.createObjectURL(blob)
  const printWindow = window.open(url, '_blank')
  if (!printWindow) {
    window.location.href = url
    return
  }

  setTimeout(() => {
    printWindow.focus()
    printWindow.print()
  }, 500)
}

export function AssetQrCard({
  assetId,
  assetName,
  assetNumber,
  canManage = false,
  showBulkPrintShortcut = true,
  note,
}: AssetQrCardProps) {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['asset-qr', assetId],
    queryFn: async () => {
      const response = await api.getAssetQr(assetId)
      return response.data
    },
    enabled: !!assetId,
  })

  const regenerateMutation = useMutation({
    mutationFn: () => api.regenerateAssetQr(assetId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['asset', assetId] }),
        queryClient.invalidateQueries({ queryKey: ['asset-qr', assetId] }),
        queryClient.invalidateQueries({ queryKey: ['assets'] }),
      ])
      toast.success('QR tag regenerated. Old stickers are now invalid.')
    },
    onError: () => {
      toast.error('Failed to regenerate QR tag')
    },
  })

  const handleDownloadPng = async () => {
    try {
      const response = await api.downloadAssetQrPng(assetId)
      triggerBlobDownload(response.data, `${assetNumber || assetName}-qr.png`)
    } catch {
      toast.error('Failed to download QR label')
    }
  }

  const handlePrintPdf = async () => {
    try {
      const response = await api.downloadAssetQrPdf(assetId)
      openPdfForPrint(response.data)
    } catch {
      toast.error('Failed to open printable label')
    }
  }

  const handleRegenerate = () => {
    if (
      window.confirm(
        'Regenerating this QR invalidates every existing sticker for this asset immediately. Continue?'
      )
    ) {
      regenerateMutation.mutate()
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          Asset QR Tag
        </CardTitle>
        <CardDescription>
          {note || 'This tag stays tied to the asset until an admin or manager regenerates it.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading || !data ? (
          <div className="flex flex-col items-center gap-3">
            <Skeleton className="h-40 w-40 rounded-xl" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-3">
              <img
                src={data.assetTagPreviewUrl}
                alt={`QR tag for ${assetName}`}
                className="h-40 w-40 rounded-xl border bg-white p-3"
              />
              <div className="space-y-1 text-center">
                <p className="text-sm font-medium">
                  Version {data.assetTagVersion}
                </p>
                <p className="text-xs text-muted-foreground font-mono break-all">
                  {data.assetTagToken}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadPng}>
                <Download className="mr-2 h-4 w-4" />
                Download PNG
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrintPdf}>
                <Printer className="mr-2 h-4 w-4" />
                Print Label
              </Button>
            </div>

            <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Scan target</p>
              <p className="mt-1 break-all">{data.assetTagUrl}</p>
            </div>

            {(canManage || showBulkPrintShortcut) && (
              <div className="flex flex-wrap gap-2">
                {canManage && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRegenerate}
                    disabled={regenerateMutation.isPending}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {regenerateMutation.isPending ? 'Regenerating...' : 'Regenerate QR'}
                  </Button>
                )}
                {showBulkPrintShortcut && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/dashboard/assets">Bulk Print Labels</Link>
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
