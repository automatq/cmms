'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { PageHeader } from '@/components/ui/page-header'
import { Plus, FileText, Trash2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  expiring: 'bg-yellow-100 text-yellow-700',
  expired: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-700',
}

export default function ServiceContractsPage() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    name: '',
    contractNumber: '',
    type: 'full_service',
    startDate: '',
    endDate: '',
    cost: '',
    slaResponseHours: '',
    slaResolutionHours: '',
  })

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['service-contracts'],
    queryFn: () => api.getServiceContracts().then((r) => r.data),
  })

  const { data: expiring } = useQuery({
    queryKey: ['service-contracts', 'expiring'],
    queryFn: () => api.getExpiringContracts(30).then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createServiceContract(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-contracts'] })
      setShowCreate(false)
      toast.success('Contract created')
    },
    onError: () => toast.error('Failed to create contract'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteServiceContract(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-contracts'] })
      toast.success('Contract deleted')
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Contracts"
        description="Manage vendor service contracts and SLAs"
        actions={
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />New Contract</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Service Contract</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Contract name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <Input placeholder="Contract number (optional)" value={form.contractNumber} onChange={(e) => setForm({ ...form, contractNumber: e.target.value })} />
                <select
                  className="w-full rounded-md border border-input px-3 py-2 text-sm"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="full_service">Full Service</option>
                  <option value="labor_only">Labor Only</option>
                  <option value="parts_only">Parts Only</option>
                  <option value="warranty_extension">Warranty Extension</option>
                </select>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Start Date</label>
                    <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">End Date</label>
                    <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                  </div>
                </div>
                <Input type="number" placeholder="Cost ($)" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
                <div className="grid grid-cols-2 gap-4">
                  <Input type="number" placeholder="SLA Response (hrs)" value={form.slaResponseHours} onChange={(e) => setForm({ ...form, slaResponseHours: e.target.value })} />
                  <Input type="number" placeholder="SLA Resolution (hrs)" value={form.slaResolutionHours} onChange={(e) => setForm({ ...form, slaResolutionHours: e.target.value })} />
                </div>
                <Button
                  className="w-full"
                  onClick={() => createMutation.mutate({
                    ...form,
                    cost: form.cost ? parseFloat(form.cost) : undefined,
                    slaResponseHours: form.slaResponseHours ? parseInt(form.slaResponseHours) : undefined,
                    slaResolutionHours: form.slaResolutionHours ? parseInt(form.slaResolutionHours) : undefined,
                  })}
                  disabled={!form.name || !form.startDate || !form.endDate || createMutation.isPending}
                >
                  Create Contract
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {expiring?.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              {expiring.length} contract{expiring.length !== 1 ? 's' : ''} expiring within 30 days
            </span>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="h-24" /></Card>
          ))}
        </div>
      ) : !contracts?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-medium">No service contracts</p>
            <p className="text-sm text-muted-foreground">Add a service contract to track vendor SLAs</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {contracts.map((contract: any) => (
            <Card key={contract.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{contract.name}</span>
                    {contract.contractNumber && (
                      <span className="text-xs text-muted-foreground">#{contract.contractNumber}</span>
                    )}
                    <Badge className={statusColors[contract.status] || ''}>
                      {contract.status}
                    </Badge>
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{contract.supplier?.name || 'No supplier'}</span>
                    <span>{contract.type?.replace('_', ' ')}</span>
                    <span>{new Date(contract.startDate).toLocaleDateString()} — {new Date(contract.endDate).toLocaleDateString()}</span>
                    {contract.cost && <span>${Number(contract.cost).toLocaleString()}</span>}
                  </div>
                  {(contract.slaResponseHours || contract.slaResolutionHours) && (
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                      {contract.slaResponseHours && <span>Response: {contract.slaResponseHours}h</span>}
                      {contract.slaResolutionHours && <span>Resolution: {contract.slaResolutionHours}h</span>}
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(contract.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
