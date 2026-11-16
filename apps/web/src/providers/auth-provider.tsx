'use client'

import React, { createContext, useCallback, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession, signOut as betterSignOut, clearStoredToken } from '@/lib/auth-client'
import { api } from '@/lib/api'

// Permissions with this prefix are platform-level and only granted to
// superadmins — the tenant wildcard '*' does not satisfy them (mirrors the
// API's PermissionsGuard).
const PLATFORM_PERMISSION_PREFIX = 'admin:'

interface MyPermissions {
  permissions: string[]
  roles: string[]
  systemRole: 'superadmin' | null
}

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  username: string
  roles: string[]
  permissions: string[]
  // Platform-wide role (distinct from per-org membership). 'superadmin' grants
  // access to /dashboard/admin/*. null for normal customers.
  systemRole: 'superadmin' | null
  banned: boolean
}

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
  activeOrgId: string | null
  impersonatedBy: string | null
  token: string | null
  permissions: string[]
  roles: string[]
  permissionsLoading: boolean
  can: (permission: string) => boolean
  login: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  activeOrgId: null,
  impersonatedBy: null,
  token: null,
  permissions: [],
  roles: [],
  permissionsLoading: true,
  can: () => false,
  login: () => {},
  logout: () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()

  const login = useCallback(() => {
    router.push('/sign-in')
  }, [router])

  const logout = useCallback(async () => {
    try {
      await betterSignOut()
    } finally {
      clearStoredToken()
      // Drop cached tenant data so the next user on this device starts clean.
      queryClient.clear()
      router.push('/sign-in')
    }
  }, [router, queryClient])

  const sessionUser = session?.user as any
  const activeOrgId = (session?.session as any)?.activeOrganizationId ?? null
  const impersonatedBy = (session?.session as any)?.impersonatedBy ?? null

  const systemRole: 'superadmin' | null =
    sessionUser?.role === 'superadmin' ? 'superadmin' : null

  // Effective permissions for the active organization, as computed by the API.
  const { data: myPermissions, isLoading: permissionsQueryLoading } = useQuery<MyPermissions>({
    queryKey: ['my-permissions', sessionUser?.id ?? null, activeOrgId],
    queryFn: async () => (await api.getMyPermissions()).data,
    enabled: !!sessionUser,
  })
  const permissions = myPermissions?.permissions ?? []
  const roles = myPermissions?.roles ?? []
  const permissionsLoading = !!sessionUser && permissionsQueryLoading

  const can = useCallback(
    (permission: string) => {
      if (!myPermissions) return false
      if (permission.startsWith(PLATFORM_PERMISSION_PREFIX)) {
        return myPermissions.systemRole === 'superadmin'
      }
      return myPermissions.permissions.includes('*') || myPermissions.permissions.includes(permission)
    },
    [myPermissions],
  )

  const user: User | null = sessionUser
    ? {
        id: sessionUser.id,
        email: sessionUser.email,
        firstName: sessionUser.firstName || sessionUser.name?.split(' ')[0] || '',
        lastName: sessionUser.lastName || sessionUser.name?.split(' ').slice(1).join(' ') || '',
        username: sessionUser.username || sessionUser.email,
        roles,
        permissions,
        systemRole,
        banned: !!sessionUser.banned,
      }
    : null

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!session,
        isLoading: isPending,
        user,
        activeOrgId,
        impersonatedBy,
        token: null,
        permissions,
        roles,
        permissionsLoading,
        can,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
