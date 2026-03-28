'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
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

  useEffect(() => {
    const syncToken = async () => {
      if (isSignedIn && clerkUser) {
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
        }
      } else if (isLoaded && !isSignedIn) {
        setUser(null)
        setToken(null)
        api.setToken(null)
      }
    }

    syncToken()

    // Refresh token periodically (Clerk tokens expire after 60s by default)
    const interval = setInterval(async () => {
      if (isSignedIn) {
        try {
          const newToken = await getToken()
          if (newToken) {
            setToken(newToken)
            api.setToken(newToken)
          }
        } catch {
          // Token refresh failed, user may need to re-auth
        }
      }
    }, 50000) // Refresh every 50 seconds

    return () => clearInterval(interval)
  }, [isSignedIn, clerkUser, isLoaded, getToken])

  const login = () => {
    // Clerk handles login via its components (<SignIn />)
    // Redirect to sign-in page
    if (typeof window !== 'undefined') {
      window.location.href = '/sign-in'
    }
  }

  const logout = () => {
    api.setToken(null)
    setToken(null)
    setUser(null)
    signOut()
  }

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
