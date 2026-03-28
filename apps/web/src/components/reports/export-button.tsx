'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { toast } from 'sonner'

interface ExportButtonProps {
  reportType: string
  filters?: Record<string, any>
}

export function ExportButton({ reportType, filters }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async (format: 'csv' | 'pdf') => {
    setExporting(true)
    try {
      const response = await api.exportReport(reportType, format, filters)
      const blob = new Blob([response.data], {
        type: format === 'csv' ? 'text/csv' : 'text/html',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${reportType}-report.${format === 'csv' ? 'csv' : 'html'}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exported as ${format.toUpperCase()}`)
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport('csv')}
        disabled={exporting}
      >
        <Download className="h-3.5 w-3.5 mr-1" />
        CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport('pdf')}
        disabled={exporting}
      >
        <Download className="h-3.5 w-3.5 mr-1" />
        PDF
      </Button>
    </div>
  )
}
