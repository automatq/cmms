'use client'

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from '@/lib/api'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  username: string
  roles: string[]
  permissions: string[]
}

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
  token: string | null
  login: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // On mount, attempt to load the current session from the backend
  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        const profile = await api.getMyProfile()
        if (cancelled) return

        const profileRoles = profile.data?.roles || []
        const roles: string[] = profileRoles.map((r: any) => r.name)
        const permissions: string[] = Array.from(
          new Set(
            profileRoles.flatMap((role: any) =>
              Array.isArray(role.permissions) ? role.permissions : []
            )
          )
        )

        setUser({
          id: profile.data?.id || '',
          email: profile.data?.email || '',
          firstName: profile.data?.firstName || '',
          lastName: profile.data?.lastName || '',
          username: profile.data?.username || profile.data?.email || '',
          roles,
          permissions,
        })
      } catch {
        // Not authenticated — leave user as null
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    init()
    return () => { cancelled = true }
  }, [])

  const login = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.href = '/sign-in'
    }
  }, [])

  const logout = useCallback(() => {
    api.setToken(null)
    setToken(null)
    setUser(null)
    if (typeof window !== 'undefined') {
      window.location.href = '/sign-in'
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        isLoading,
        user,
        token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
