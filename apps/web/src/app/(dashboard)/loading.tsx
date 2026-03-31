import { Progress } from '@/components/ui/progress'

export default function DashboardLoading() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-1/3 space-y-2">
        <Progress />
        <p className="text-sm text-muted-foreground text-center">Loading...</p>
      </div>
    </div>
  )
}
