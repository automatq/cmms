'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

const statusConfig: Record<string, { color: string; icon: any }> = {
  ACTIVE: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
  EXPIRING_SOON: { color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle },
  EXPIRED: { color: 'bg-red-100 text-red-700', icon: XCircle },
  NONE: { color: 'bg-gray-100 text-gray-700', icon: Shield },
}

export default function WarrantyReportPage() {
  const [days, setDays] = useState(90)

  const { data: report, isLoading } = useQuery({
    queryKey: ['reports', 'warranties', days],
    queryFn: () => api.getWarrantyReport(days).then((r) => r.data),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warranty Report"
        description="Track asset warranty status and upcoming expirations"
      />

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Show expiring within</span>
        {[30, 60, 90, 180].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3 py-1 rounded-full text-sm ${
              days === d
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {d} days
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-24" />
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {report?.summary?.active || 0}
                </div>
              </CardContent>
            </Card>
            <Card className="border-yellow-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Expiring Soon
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {report?.summary?.expiringSoon || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Expired</CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {report?.summary?.expired || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  No Warranty
                </CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {report?.summary?.none || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {report?.assets?.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Assets by Warranty Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.assets.map((asset: any) => {
                    const config = statusConfig[asset.warrantyStatus] || statusConfig.NONE
                    const Icon = config.icon
                    return (
                      <div
                        key={asset.id}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="font-medium">{asset.name}</span>
                            {asset.serialNumber && (
                              <span className="text-sm text-muted-foreground ml-2">
                                S/N: {asset.serialNumber}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {asset.warrantyExpiration && (
                            <span className="text-sm text-muted-foreground">
                              Expires:{' '}
                              {new Date(
                                asset.warrantyExpiration
                              ).toLocaleDateString()}
                            </span>
                          )}
                          <Badge className={config.color}>
                            {asset.warrantyStatus?.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Shield className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-lg font-medium">
                  No warranty data available
                </p>
                <p className="text-sm text-muted-foreground">
                  Add warranty information to your assets to see this report
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
