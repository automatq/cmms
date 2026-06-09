'use client'

import { Activity, Stethoscope, Wrench } from 'lucide-react'
import { api } from '@/lib/api'
import { AiActionCard } from './ai-action-card'

/** Context-aware AI actions for an asset, powered by the /ai/* endpoints. */
export function AssetAiInsights({ assetId }: { assetId: string }) {
  return (
    <AiActionCard
      description="Get AI insights from this asset's work-order history, meter readings, and downtime."
      actions={[
        {
          key: 'predict',
          label: 'Predict failure',
          icon: Activity,
          run: () => api.aiPredictFailure(assetId),
        },
        {
          key: 'maintenance',
          label: 'Maintenance tips',
          icon: Wrench,
          run: () => api.aiMaintenanceRecommendation(assetId),
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
