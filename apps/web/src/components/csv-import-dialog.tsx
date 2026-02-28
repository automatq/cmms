'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface CsvImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  onImport: (file: File) => Promise<any>
  onSuccess?: () => void
}

export function CsvImportDialog({ open, onOpenChange, title, onImport, onSuccess }: CsvImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<{ imported: number; errors: string[]; total: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    try {
      const res = await onImport(file)
      const data = res.data
      setResult({
        imported: data.imported || 0,
        errors: data.errors || [],
        total: data.total || data.imported || 0,
      })
      if (data.imported > 0) {
        toast.success(`Imported ${data.imported} records`)
        onSuccess?.()
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Import failed'
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg)
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      setFile(null)
      setResult(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Upload a CSV file to import records in bulk.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              Choose File
            </Button>
            <span className="text-sm text-muted-foreground truncate">
              {file ? file.name : 'No file selected'}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {result && (
            <div className="rounded-md border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">{result.imported} of {result.total} imported successfully</span>
              </div>
              {result.errors.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium text-destructive">{result.errors.length} error(s)</span>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto pl-6 list-disc">
                    {result.errors.map((err, i) => (
                      <li key={i}>{typeof err === 'string' ? err : JSON.stringify(err)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleClose(false)}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button onClick={handleUpload} disabled={!file || isUploading}>
              {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {isUploading ? 'Importing...' : 'Import'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
