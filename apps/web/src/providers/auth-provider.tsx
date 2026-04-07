'use client'

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useAuth as useClerkAuth, useUser, useOrganization } from '@clerk/nextjs'
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
  const { isLoaded, isSignedIn, getToken, signOut } = useClerkAuth()
  const { user: clerkUser } = useUser()
  const { organization } = useOrganization()
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const syncedRef = useRef(false)

  // Initial auth sync — runs once after Clerk loads
  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn) {
      syncedRef.current = false
      setUser(null)
      setToken(null)
      api.setToken(null)
      setReady(true)
      return
    }

    if (syncedRef.current) return
    if (!clerkUser) return

    let cancelled = false

    const sync = async () => {
      try {
        const accessToken = await getToken()
        if (!accessToken || cancelled) return

        setToken(accessToken)
        api.setToken(accessToken)

        // Load roles from backend profile — may fail on first login while tenant is provisioning
        let roles: string[] = []
        let permissions: string[] = []
        try {
          const profile = await api.getMyProfile()
          const profileRoles = profile.data?.roles || []
          roles = profileRoles.map((r: any) => r.name) || []
          permissions = Array.from(
            new Set(
              profileRoles.flatMap((role: any) =>
                Array.isArray(role.permissions) ? role.permissions : []
              )
            )
          )
        } catch {
          // Profile not available yet — continue with empty roles, backend will auto-provision
        }

        if (cancelled) return

        setUser({
          id: clerkUser.id,
          email: clerkUser.emailAddresses?.[0]?.emailAddress || '',
          firstName: clerkUser.firstName || '',
          lastName: clerkUser.lastName || '',
          username: clerkUser.username || clerkUser.emailAddresses?.[0]?.emailAddress || '',
          roles,
          permissions,
        })
        syncedRef.current = true
      } catch (error) {
        console.error('Auth sync failed:', error)
      }

      if (!cancelled) setReady(true)
    }

    sync()
    return () => { cancelled = true }
  }, [isLoaded, isSignedIn, clerkUser?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh token periodically (Clerk tokens expire after 60s by default)
  useEffect(() => {
    if (!isSignedIn) return

    const interval = setInterval(async () => {
      try {
        const newToken = await getToken()
        if (newToken) {
          setToken(newToken)
          api.setToken(newToken)
        }
      } catch {
        // Token refresh failed — will retry next interval
      }
    }, 50000)

    return () => clearInterval(interval)
  }, [isSignedIn]) // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.href = '/sign-in'
    }
  }, [])

  const logout = useCallback(() => {
    api.setToken(null)
    setToken(null)
    setUser(null)
    syncedRef.current = false
    setReady(false)
    signOut()
  }, [signOut])

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!isSignedIn,
        isLoading: !ready,
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
