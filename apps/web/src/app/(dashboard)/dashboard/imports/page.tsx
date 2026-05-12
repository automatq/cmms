'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { Upload, FileUp, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const IMPORT_TYPES = [
  { value: 'assets', label: 'Assets' },
  { value: 'locations', label: 'Locations' },
  { value: 'parts', label: 'Parts' },
  { value: 'work_orders', label: 'Work Orders' },
]

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}

type WizardStep = 'select' | 'preview' | 'mapping' | 'importing' | 'done'

export default function ImportsPage() {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<WizardStep>('select')
  const [importType, setImportType] = useState('assets')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<any>(null)
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [importId, setImportId] = useState<string | null>(null)

  const { data: imports } = useQuery({
    queryKey: ['imports'],
    queryFn: () => api.getImports().then((r) => r.data),
  })

  const previewMutation = useMutation({
    mutationFn: (file: File) => api.previewImport(importType, file),
    onSuccess: (res) => {
      setPreview(res.data)
      setColumnMapping(res.data.suggestedMapping || {})
      setStep('mapping')
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to parse file'
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg)
      setStep('select')
    },
  })

  const importMutation = useMutation({
    mutationFn: () => api.startImport(importType, file!, columnMapping),
    onSuccess: (res) => {
      setImportId(res.data.id)
      setStep('importing')
      queryClient.invalidateQueries({ queryKey: ['imports'] })
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to start import'
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg)
    },
  })

  const { data: importStatus } = useQuery({
    queryKey: ['imports', importId],
    queryFn: () => api.getImportStatus(importId!).then((r) => r.data),
    enabled: !!importId && step === 'importing',
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'completed' || status === 'failed') return false
      return 2000
    },
  })

  if (importStatus?.status === 'completed' || importStatus?.status === 'failed') {
    if (step === 'importing') setStep('done')
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      setStep('preview')
      previewMutation.mutate(f)
    }
  }

  const resetWizard = () => {
    setStep('select')
    setFile(null)
    setPreview(null)
    setColumnMapping({})
    setImportId(null)
    if (fileRef.current) fileRef.current.value = ''
    queryClient.invalidateQueries({ queryKey: ['imports'] })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Import"
        description="Import assets, locations, parts, and work orders from CSV or Excel files"
      />

      <Card>
        <CardHeader>
          <CardTitle>Import Wizard</CardTitle>
        </CardHeader>
        <CardContent>
          {step === 'select' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Import Type</label>
                <select
                  className="w-full rounded-md border border-input px-3 py-2 text-sm mt-1"
                  value={importType}
                  onChange={(e) => setImportType(e.target.value)}
                >
                  {IMPORT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div
                className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="mt-4 text-sm font-medium">
                  Click to upload a CSV or Excel file
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  CSV, XLSX, or XLS, max 10MB
                </p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          )}

          {step === 'preview' && (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">
                Parsing file...
              </p>
            </div>
          )}

          {step === 'mapping' && preview && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {preview.totalRows} rows found.  Map file columns to fields.
                </p>
                <Button variant="outline" size="sm" onClick={resetWizard}>
                  Start Over
                </Button>
              </div>
              <div className="space-y-2">
                {preview.headers?.map((header: string) => (
                  <div key={header} className="flex items-center gap-4">
                    <span className="text-sm font-medium w-40 truncate">
                      {header}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <select
                      className="flex-1 rounded-md border border-input px-3 py-1.5 text-sm"
                      value={columnMapping[header] || ''}
                      onChange={(e) =>
                        setColumnMapping({
                          ...columnMapping,
                          [header]: e.target.value,
                        })
                      }
                    >
                      <option value="">Skip this column</option>
                      {preview.availableFields?.map((field: string) => (
                        <option key={field} value={field}>
                          {field}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              {preview.previewRows?.length > 0 && (
                <div className="overflow-x-auto">
                  <p className="text-sm font-medium mb-2">Preview (first rows)</p>
                  <table className="w-full text-xs border">
                    <thead>
                      <tr>
                        {preview.headers.map((h: string) => (
                          <th key={h} className="border px-2 py-1 bg-muted text-left">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.previewRows.map((row: any, i: number) => (
                        <tr key={i}>
                          {preview.headers.map((h: string) => (
                            <td key={h} className="border px-2 py-1 truncate max-w-[200px]">
                              {row[h]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Button
                className="w-full"
                onClick={() => importMutation.mutate()}
                disabled={
                  Object.values(columnMapping).filter(Boolean).length === 0 ||
                  importMutation.isPending
                }
              >
                <FileUp className="h-4 w-4 mr-2" />
                Start Import
              </Button>
            </div>
          )}

          {step === 'importing' && (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-lg font-medium">Importing...</p>
              {importStatus && (
                <p className="text-sm text-muted-foreground mt-2">
                  {importStatus.processedRows || 0} of{' '}
                  {importStatus.totalRows || '?'} rows processed
                </p>
              )}
            </div>
          )}

          {step === 'done' && importStatus && (
            <div className="flex flex-col items-center py-8">
              {importStatus.status === 'completed' ? (
                <>
                  <CheckCircle className="h-12 w-12 text-green-600" />
                  <p className="mt-4 text-lg font-medium">Import Complete</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {importStatus.processedRows} rows imported
                    {importStatus.errorRows > 0 &&
                      `, ${importStatus.errorRows} errors`}
                  </p>
                </>
              ) : (
                <>
                  <XCircle className="h-12 w-12 text-red-600" />
                  <p className="mt-4 text-lg font-medium">Import Failed</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {importStatus.errorRows || 0} errors encountered
                  </p>
                </>
              )}
              <Button className="mt-6" onClick={resetWizard}>
                Import More Data
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {imports?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Import History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {imports.map((imp: any) => (
                <div
                  key={imp.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <span className="font-medium capitalize">
                      {imp.type?.replace('_', ' ')}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {new Date(imp.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {imp.processedRows}/{imp.totalRows} rows
                    </span>
                    <Badge className={statusColors[imp.status] || ''}>
                      {imp.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
