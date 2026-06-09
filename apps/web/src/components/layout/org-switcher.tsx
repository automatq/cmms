'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'
import { useAuth } from '@/providers/auth-provider'
import { api } from '@/lib/api'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Building2, Check, ChevronsUpDown, Plus, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface OrgSummary {
  id: string
  name: string
  slug?: string
}

/**
 * Shows which organization you're working in, always. Renders as a static
 * label for the common single-org case and becomes a switcher dropdown when
 * the user belongs to more than one organization (Better Auth multi-org).
 */
export function OrgSwitcher() {
  const { activeOrgId } = useAuth()
  const [switchingTo, setSwitchingTo] = useState<string | null>(null)

  // Current org details — same cached query the dashboard/settings prime.
  const { data: organization, isLoading: isLoadingOrg } = useQuery({
    queryKey: ['organization'],
    queryFn: () => api.getOrganization().then((r) => r.data),
    enabled: !!activeOrgId,
  })

  // Every org the signed-in user belongs to (Better Auth organization plugin).
  const { data: myOrgs } = useQuery({
    queryKey: ['my-organizations'],
    queryFn: async () => {
      const res = await authClient.organization.list()
      return ((res as { data?: OrgSummary[] }).data ?? []) as OrgSummary[]
    },
    enabled: !!activeOrgId,
    staleTime: 5 * 60 * 1000,
  })

  // Superadmins browsing without an active org have no workspace to show.
  if (!activeOrgId) return null

  const orgs = Array.isArray(myOrgs) ? myOrgs : []
  const current = orgs.find((o) => o.id === activeOrgId)
  const name = organization?.name || current?.name
  const slug = organization?.slug || current?.slug
  const multiOrg = orgs.length > 1

  const handleSwitch = async (orgId: string) => {
    if (orgId === activeOrgId || switchingTo) return
    setSwitchingTo(orgId)
    try {
      const res = await authClient.organization.setActive({ organizationId: orgId })
      if ((res as { error?: { message?: string } })?.error) {
        throw new Error((res as { error?: { message?: string } }).error?.message)
      }
      // The session's active org changed — queries, socket rooms, and pages are
      // all tenant-scoped, so reload cleanly into the new workspace.
      window.location.assign('/dashboard')
    } catch (err) {
      setSwitchingTo(null)
      toast.error(err instanceof Error && err.message ? err.message : 'Could not switch organization')
    }
  }

  if (isLoadingOrg && !name) {
    return (
      <div className="flex items-center gap-2 rounded-md border px-3 py-2">
        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      </div>
    )
  }

  const face = (
    <>
      <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
        <Building2 className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium truncate leading-tight">{name || 'Your organization'}</p>
        <p className="text-[11px] text-muted-foreground truncate leading-tight">
          {switchingTo ? 'Switching…' : slug ? `@${slug}` : 'Organization'}
        </p>
      </div>
    </>
  )

  // Single org: a clear, non-interactive "you are here" label.
  if (!multiOrg) {
    return (
      <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2" title={name}>
        {face}
      </div>
    )
  }

  // Multiple orgs: same face, but as a switcher.
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
          )}
          disabled={!!switchingTo}
          title={name}
        >
          {face}
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Your organizations
        </DropdownMenuLabel>
        {orgs.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => handleSwitch(org.id)}
            disabled={!!switchingTo}
            className="gap-2"
          >
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 truncate">{org.name}</span>
            {org.id === activeOrgId && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings" className="gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            Organization settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/onboarding/create-org" className="gap-2">
            <Plus className="h-4 w-4 text-muted-foreground" />
            Create organization
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
