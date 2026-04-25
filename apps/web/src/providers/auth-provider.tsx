'use client'

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useUser, getAccessToken } from '@auth0/nextjs-auth0/client'
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
  const { user: auth0User, isLoading: auth0Loading } = useUser()
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const syncedRef = useRef(false)

  useEffect(() => {
    if (auth0Loading) return

    if (!auth0User) {
      syncedRef.current = false
      setUser(null)
      setToken(null)
      api.setToken(null)
      setReady(true)
      return
    }

    if (syncedRef.current) return

    let cancelled = false

    const sync = async () => {
      try {
        const accessToken = await getAccessToken()
        if (!accessToken || cancelled) return

        setToken(accessToken)
        api.setToken(accessToken)

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

        const nameParts = (auth0User.name || '').split(' ')
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''

        setUser({
          id: auth0User.sub || '',
          email: auth0User.email || '',
          firstName,
          lastName,
          username: auth0User.email || '',
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
  }, [auth0Loading, auth0User?.sub]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!auth0User) return

    const interval = setInterval(async () => {
      try {
        const newToken = await getAccessToken()
        if (newToken) {
          setToken(newToken)
          api.setToken(newToken)
        }
      } catch {
        // Token refresh failed — will retry next interval
      }
    }, 50000)

    return () => clearInterval(interval)
  }, [auth0User?.sub]) // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login'
    }
  }, [])

  const logout = useCallback(() => {
    api.setToken(null)
    setToken(null)
    setUser(null)
    syncedRef.current = false
    setReady(false)
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/logout'
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!auth0User,
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
