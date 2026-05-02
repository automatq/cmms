'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, Loader2, QrCode } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AssetScanLandingPage() {
  const router = useRouter()
  const params = useParams()
  const token = params?.token as string
  const { isAuthenticated, isLoading, token: authToken } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const redirectUrl = `${window.location.pathname}${window.location.search}`
      window.location.href = `/auth/login?returnTo=${encodeURIComponent(redirectUrl)}`
    }
  }, [isAuthenticated, isLoading])

  const { data, error, isLoading: isResolving } = useQuery({
    queryKey: ['scan-asset-token', token],
    queryFn: async () => {
      const response = await api.resolveAssetQrToken(token)
      return response.data
    },
    enabled: isAuthenticated && !!authToken && !!token,
    retry: false,
  })

  useEffect(() => {
    if (data?.id) {
      router.replace(`/dashboard/assets/${data.id}`)
    }
  }, [data?.id, router])

  if (isLoading || (isAuthenticated && isResolving)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div>
              <p className="font-medium">Resolving asset tag</p>
              <p className="text-sm text-muted-foreground">Checking where this QR code belongs.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const errorData = (error as any)?.response?.data
  const retiredAsset = errorData?.asset
  const isRetired = (error as any)?.response?.status === 409 && errorData?.code === 'ASSET_RETIRED'

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            {isRetired ? <AlertTriangle className="h-7 w-7" /> : <QrCode className="h-7 w-7" />}
          </div>
          <CardTitle>{isRetired ? 'Asset Tag Is Retired' : 'Asset Tag Not Found'}</CardTitle>
          <CardDescription>
            {isRetired
              ? 'This machine tag still belongs to an asset, but the asset is retired and cannot be started from a scan.'
              : 'This QR code does not resolve to a current asset tag in your organization.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isRetired && retiredAsset && (
            <div className="rounded-lg border bg-muted/20 p-4 text-sm">
              <p className="font-medium">{retiredAsset.name}</p>
              <p className="text-muted-foreground">{retiredAsset.assetNumber}</p>
              <p className="mt-2 text-muted-foreground">
                Status: {String(retiredAsset.status || '').replace('_', ' ')}
                {retiredAsset.location ? ` • ${retiredAsset.location}` : ''}
              </p>
            </div>
          )}
          <div className="flex justify-center">
            <Button asChild variant="outline">
              <Link href="/dashboard/assets">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Assets
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
