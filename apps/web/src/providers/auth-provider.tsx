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
  const [syncing, setSyncing] = useState(false)
  const syncedRef = useRef(false)
  const syncAttemptRef = useRef(0)

  useEffect(() => {
    if (!isLoaded) return

    if (isSignedIn && clerkUser && !syncedRef.current && !syncing) {
      setSyncing(true)
      const syncToken = async () => {
        try {
          const accessToken = await getToken()
          if (accessToken) {
            setToken(accessToken)
            api.setToken(accessToken)

            // Load roles from backend profile — may fail on first login while tenant is provisioning
            let roles: string[] = []
            try {
              const profile = await api.getMyProfile()
              roles = profile.data?.roles?.map((r: any) => r.name) || []
            } catch {
              // Profile not available yet — that's OK, backend will auto-provision
            }

            setUser({
              id: clerkUser.id,
              email: clerkUser.emailAddresses?.[0]?.emailAddress || '',
              firstName: clerkUser.firstName || '',
              lastName: clerkUser.lastName || '',
              username: clerkUser.username || clerkUser.emailAddresses?.[0]?.emailAddress || '',
              roles,
            })
            syncedRef.current = true
          }
        } catch (error) {
          console.error('Error syncing auth:', error)
          // Retry up to 3 times with delay for auto-provisioning
          syncAttemptRef.current++
          if (syncAttemptRef.current < 3) {
            setTimeout(() => {
              setSyncing(false)
            }, 2000)
            return
          }
        }
        setSyncing(false)
      }
      syncToken()
    } else if (isLoaded && !isSignedIn) {
      syncedRef.current = false
      syncAttemptRef.current = 0
      setUser(null)
      setToken(null)
      api.setToken(null)
    }
  }, [isLoaded, isSignedIn, clerkUser?.id, syncing]) // eslint-disable-line react-hooks/exhaustive-deps

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
        // Token refresh failed
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
    syncAttemptRef.current = 0
    signOut()
  }, [signOut])

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!isSignedIn,
        isLoading: !isLoaded || syncing,
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
