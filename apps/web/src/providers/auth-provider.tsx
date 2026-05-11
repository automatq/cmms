'use client'

import React, { createContext, useCallback, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut as betterSignOut, clearStoredToken } from '@/lib/auth-client'

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
  login: () => {},
  logout: () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession()
  const router = useRouter()

  const login = useCallback(() => {
    router.push('/sign-in')
  }, [router])

  const logout = useCallback(async () => {
    try {
      await betterSignOut()
    } finally {
      clearStoredToken()
      router.push('/sign-in')
    }
  }, [router])

  const sessionUser = session?.user as any
  const activeOrgId = (session?.session as any)?.activeOrganizationId ?? null
  const impersonatedBy = (session?.session as any)?.impersonatedBy ?? null

  const systemRole: 'superadmin' | null =
    sessionUser?.role === 'superadmin' ? 'superadmin' : null

  const user: User | null = sessionUser
    ? {
        id: sessionUser.id,
        email: sessionUser.email,
        firstName: sessionUser.firstName || sessionUser.name?.split(' ')[0] || '',
        lastName: sessionUser.lastName || sessionUser.name?.split(' ').slice(1).join(' ') || '',
        username: sessionUser.username || sessionUser.email,
        roles: systemRole ? ['superadmin'] : ['admin'],
        permissions: ['*'],
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
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
