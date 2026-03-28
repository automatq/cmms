'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { PageHeader } from '@/components/ui/page-header'
import { Plus, DollarSign, Trash2, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'

export default function BudgetsPage() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    name: '',
    periodStart: '',
    periodEnd: '',
    plannedAmount: '',
  })

  const { data: budgets, isLoading } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => api.getBudgets().then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createBudget(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      setShowCreate(false)
      setForm({ name: '', periodStart: '', periodEnd: '', plannedAmount: '' })
      toast.success('Budget created')
    },
    onError: () => toast.error('Failed to create budget'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteBudget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      toast.success('Budget deleted')
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance Budgets"
        description="Track planned vs actual maintenance spending"
        actions={
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />New Budget</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Budget</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Budget name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Start Date</label>
                    <Input type="date" value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">End Date</label>
                    <Input type="date" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Planned Amount ($)</label>
                  <Input type="number" placeholder="0.00" value={form.plannedAmount} onChange={(e) => setForm({ ...form, plannedAmount: e.target.value })} />
                </div>
                <Button
                  className="w-full"
                  onClick={() => createMutation.mutate({
                    ...form,
                    plannedAmount: parseFloat(form.plannedAmount),
                  })}
                  disabled={!form.name || !form.periodStart || !form.periodEnd || !form.plannedAmount || createMutation.isPending}
                >
                  Create Budget
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="h-40" /></Card>
          ))}
        </div>
      ) : !budgets?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-medium">No budgets yet</p>
            <p className="text-sm text-muted-foreground">Create a budget to track maintenance spending</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {budgets.map((budget: any) => (
            <BudgetCard key={budget.id} budget={budget} onDelete={() => deleteMutation.mutate(budget.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function BudgetCard({ budget, onDelete }: { budget: any; onDelete: () => void }) {
  const { data: vsActual } = useQuery({
    queryKey: ['budgets', budget.id, 'vs-actual'],
    queryFn: () => api.getBudgetVsActual(budget.id).then((r) => r.data),
  })

  const percentUsed = vsActual?.percentUsed || 0
  const isOverBudget = percentUsed > 100

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">{budget.name}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {new Date(budget.periodStart).toLocaleDateString()} — {new Date(budget.periodEnd).toLocaleDateString()}
          </span>
          <Badge variant={isOverBudget ? 'destructive' : percentUsed > 80 ? 'secondary' : 'default'}>
            {percentUsed.toFixed(0)}% used
          </Badge>
        </div>
        <Progress value={Math.min(percentUsed, 100)} className="h-2" />
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Planned</p>
            <p className="text-lg font-semibold">${Number(budget.plannedAmount).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Actual</p>
            <p className={`text-lg font-semibold ${isOverBudget ? 'text-destructive' : ''}`}>
              ${Number(vsActual?.actualTotal || 0).toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
