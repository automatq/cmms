'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react'
import Keycloak, { KeycloakConfig } from 'keycloak-js'
import { api } from '@/lib/api'

interface User {
  id: string
  email?: string
  firstName?: string
  lastName?: string
  username?: string
  roles: string[]
}

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
  token: string | null
  login: () => void
  logout: () => void
  hasRole: (role: string) => boolean
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  token: null,
  login: () => { },
  logout: () => { },
  hasRole: () => false,
})

const keycloakConfig: KeycloakConfig = {
  url: process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost/auth',
  realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'cmms',
  clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'cmms-web',
}

let keycloakInstance: Keycloak | null = null

function extractUserFromToken(kc: Keycloak): User {
  const parsed = kc.tokenParsed as any
  return {
    id: kc.subject || parsed?.sub || '',
    email: parsed?.email,
    firstName: parsed?.given_name,
    lastName: parsed?.family_name,
    username: parsed?.preferred_username,
    roles: kc.realmAccess?.roles || [],
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined' || initialized.current) return
    initialized.current = true

    const initKeycloak = async () => {
      try {
        keycloakInstance = new Keycloak(keycloakConfig)

        const authenticated = await keycloakInstance.init({
          onLoad: 'check-sso',
          checkLoginIframe: false,
          pkceMethod: 'S256',
        })

        if (authenticated && keycloakInstance.token) {
          setIsAuthenticated(true)
          setToken(keycloakInstance.token)
          api.setToken(keycloakInstance.token)
          setUser(extractUserFromToken(keycloakInstance))

          // Token refresh interval
          setInterval(async () => {
            try {
              const refreshed = await keycloakInstance?.updateToken(30)
              if (refreshed && keycloakInstance?.token) {
                setToken(keycloakInstance.token)
                api.setToken(keycloakInstance.token)
              }
            } catch {
              setIsAuthenticated(false)
              setUser(null)
              setToken(null)
              api.setToken(null)
            }
          }, 60000)
        }
      } catch (error) {
        console.error('Keycloak init error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initKeycloak()
  }, [])

  const login = useCallback(() => {
    keycloakInstance?.login()
  }, [])

  const logout = useCallback(() => {
    keycloakInstance?.logout({ redirectUri: window.location.origin })
    setIsAuthenticated(false)
    setUser(null)
    setToken(null)
    api.setToken(null)
  }, [])

  const hasRole = useCallback((role: string): boolean => {
    return keycloakInstance?.hasRealmRole(role) || false
  }, [])

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        token,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
