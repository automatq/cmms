'use client'

import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Save } from 'lucide-react'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Combobox } from '@/components/ui/combobox'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { WO_PRIORITY_ORDER, WO_PRIORITY_META } from '@/lib/status'

const WO_TYPES = ['corrective', 'preventive', 'inspection', 'emergency'] as const

const workOrderSchema = z.object({
  assetId: z.string().min(1, 'Select an asset'),
  type: z.enum(['corrective', 'preventive', 'inspection', 'emergency']),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  description: z.string().max(2000, 'Keep it under 2000 characters').optional(),
})

type WorkOrderFormValues = z.infer<typeof workOrderSchema>

export function WorkOrderFormSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()

  const form = useForm<WorkOrderFormValues>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: { assetId: '', type: 'corrective', priority: 'medium', description: '' },
  })

  const { data: assetsData } = useQuery({
    queryKey: ['assets', 'wo-form'],
    queryFn: async () => {
      const res = await api.getAssets({ limit: 100 })
      return res.data
    },
    enabled: open,
  })

  const assets = assetsData?.data ?? []
  const assetOptions = useMemo(
    () =>
      assets.map((a: any) => ({
        value: a.id,
        label: a.assetNumber ? `${a.assetNumber} — ${a.name}` : a.name,
      })),
    [assets],
  )

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createWorkOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      toast.success('Work order created')
      form.reset()
      onOpenChange(false)
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to create work order')
    },
  })

  const onSubmit = (values: WorkOrderFormValues) => {
    const asset = assets.find((a: any) => a.id === values.assetId)
    createMutation.mutate({
      title: asset ? `${asset.assetNumber ?? ''} ${asset.name}`.trim() : 'Work Order',
      description: values.description || undefined,
      type: values.type,
      priority: values.priority,
      assetId: values.assetId,
      locationId: asset?.locationId || asset?.location?.id || undefined,
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>New Work Order</SheetTitle>
          <SheetDescription>Create a work order against an asset.</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <SheetBody className="space-y-5">
              <FormField
                control={form.control}
                name="assetId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset</FormLabel>
                    <Combobox
                      options={assetOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select an asset"
                      searchPlaceholder="Search assets…"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <FormControl>
                        <Select {...field}>
                          {WO_PRIORITY_ORDER.map((p) => (
                            <option key={p} value={p}>
                              {WO_PRIORITY_META[p].label}
                            </option>
                          ))}
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <FormControl>
                        <Select {...field}>
                          {WO_TYPES.map((t) => (
                            <option key={t} value={t} className="capitalize">
                              {t.charAt(0).toUpperCase() + t.slice(1)}
                            </option>
                          ))}
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={5}
                        placeholder="Describe the issue or work needed"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </SheetBody>

            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {createMutation.isPending ? 'Creating…' : 'Create work order'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
