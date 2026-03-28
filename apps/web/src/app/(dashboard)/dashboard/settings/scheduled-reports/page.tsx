'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { PageHeader } from '@/components/ui/page-header'
import { Plus, CalendarClock, Trash2, Mail } from 'lucide-react'
import { toast } from 'sonner'

const REPORT_TYPES = [
  { value: 'work-orders', label: 'Work Orders' },
  { value: 'assets', label: 'Assets' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'costs', label: 'Costs' },
  { value: 'pm-compliance', label: 'PM Compliance' },
  { value: 'technician-performance', label: 'Technician Performance' },
  { value: 'downtime', label: 'Downtime' },
  { value: 'warranties', label: 'Warranties' },
]

const SCHEDULE_PRESETS = [
  { value: '0 8 * * 1', label: 'Weekly (Mon 8 AM)' },
  { value: '0 8 1 * *', label: 'Monthly (1st, 8 AM)' },
  { value: '0 8 * * *', label: 'Daily (8 AM)' },
]

export default function ScheduledReportsPage() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    name: '',
    reportType: 'work-orders',
    schedule: '0 8 * * 1',
    format: 'csv' as 'csv' | 'pdf',
    recipientEmails: '',
  })

  const { data: reports, isLoading } = useQuery({
    queryKey: ['scheduled-reports'],
    queryFn: () => api.getScheduledReports().then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createScheduledReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] })
      setShowCreate(false)
      setForm({ name: '', reportType: 'work-orders', schedule: '0 8 * * 1', format: 'csv', recipientEmails: '' })
      toast.success('Scheduled report created')
    },
    onError: () => toast.error('Failed to create scheduled report'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteScheduledReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] })
      toast.success('Scheduled report deleted')
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.updateScheduledReport(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] }),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scheduled Reports"
        description="Automatically generate and email reports on a schedule"
        action={
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />New Schedule</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Schedule a Report</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Report name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <div>
                  <label className="text-sm font-medium">Report Type</label>
                  <select
                    className="w-full rounded-md border border-input px-3 py-2 text-sm mt-1"
                    value={form.reportType}
                    onChange={(e) => setForm({ ...form, reportType: e.target.value })}
                  >
                    {REPORT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Schedule</label>
                  <select
                    className="w-full rounded-md border border-input px-3 py-2 text-sm mt-1"
                    value={form.schedule}
                    onChange={(e) => setForm({ ...form, schedule: e.target.value })}
                  >
                    {SCHEDULE_PRESETS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Format</label>
                  <div className="flex gap-2 mt-1">
                    {(['csv', 'pdf'] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setForm({ ...form, format: f })}
                        className={`px-4 py-1.5 rounded-md text-sm ${
                          form.format === f
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {f.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Recipient Emails</label>
                  <Input
                    placeholder="email1@example.com, email2@example.com"
                    value={form.recipientEmails}
                    onChange={(e) => setForm({ ...form, recipientEmails: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Comma-separated email addresses</p>
                </div>
                <Button
                  className="w-full"
                  onClick={() =>
                    createMutation.mutate({
                      ...form,
                      recipientEmails: form.recipientEmails
                        .split(',')
                        .map((e) => e.trim())
                        .filter(Boolean),
                    })
                  }
                  disabled={!form.name || !form.recipientEmails || createMutation.isPending}
                >
                  Create Schedule
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="h-24" /></Card>
          ))}
        </div>
      ) : !reports?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarClock className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-medium">No scheduled reports</p>
            <p className="text-sm text-muted-foreground">Set up automatic report delivery to your inbox</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report: any) => (
            <Card key={report.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{report.name}</span>
                    <Badge variant="secondary">{report.reportType}</Badge>
                    <Badge variant="outline">{report.format?.toUpperCase()}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {SCHEDULE_PRESETS.find((s) => s.value === report.schedule)?.label || report.schedule}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {report.recipientEmails?.length || 0} recipients
                    </span>
                    {report.lastRunAt && (
                      <span>Last run: {new Date(report.lastRunAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Switch
                    checked={report.isActive}
                    onCheckedChange={(checked) =>
                      toggleMutation.mutate({ id: report.id, isActive: checked })
                    }
                  />
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(report.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
