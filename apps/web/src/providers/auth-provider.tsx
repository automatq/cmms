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
  const syncedRef = useRef(false)

  useEffect(() => {
    if (!isLoaded) return

    if (isSignedIn && clerkUser && !syncedRef.current) {
      syncedRef.current = true
      const syncToken = async () => {
        try {
          const accessToken = await getToken()
          if (accessToken) {
            setToken(accessToken)
            api.setToken(accessToken)

            // Load roles from backend profile
            let roles: string[] = []
            try {
              const profile = await api.getMyProfile()
              roles = profile.data?.roles?.map((r: any) => r.name) || []
            } catch {
              // Profile not available yet (first login), use empty roles
            }

            setUser({
              id: clerkUser.id,
              email: clerkUser.emailAddresses?.[0]?.emailAddress || '',
              firstName: clerkUser.firstName || '',
              lastName: clerkUser.lastName || '',
              username: clerkUser.username || clerkUser.emailAddresses?.[0]?.emailAddress || '',
              roles,
            })
          }
        } catch (error) {
          console.error('Error getting access token:', error)
          syncedRef.current = false
        }
      }
      syncToken()
    } else if (isLoaded && !isSignedIn) {
      syncedRef.current = false
      setUser(null)
      setToken(null)
      api.setToken(null)
    }
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
    signOut()
  }, [signOut])

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!isSignedIn,
        isLoading: !isLoaded,
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
