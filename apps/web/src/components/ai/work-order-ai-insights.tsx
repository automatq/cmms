'use client'

import { FileText, Stethoscope } from 'lucide-react'
import { api } from '@/lib/api'
import { AiActionCard } from './ai-action-card'

/** Context-aware AI actions for a work order, powered by the /ai/* endpoints. */
export function WorkOrderAiInsights({
  workOrderId,
  assetId,
}: {
  workOrderId: string
  assetId?: string
}) {
  return (
    <AiActionCard
      description="Summarize this work order or get step-by-step troubleshooting for its asset."
      actions={[
        {
          key: 'summarize',
          label: 'Summarize',
          icon: FileText,
          run: () => api.aiSummarizeWorkOrder(workOrderId),
        },
        {
          key: 'troubleshoot',
          label: 'Troubleshoot',
          icon: Stethoscope,
          input: { placeholder: 'Describe the problem or symptoms…', required: true },
          run: (input) => api.aiTroubleshoot({ assetId, problemDescription: input }),
        },
      ]}
    />
  )
}
