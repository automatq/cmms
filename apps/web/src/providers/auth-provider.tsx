'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import Keycloak, { KeycloakConfig } from 'keycloak-js'
import { api } from '@/lib/api'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  user: any | null
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
  login: () => {},
  logout: () => {},
  hasRole: () => false,
})

const keycloakConfig: KeycloakConfig = {
  url: process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost:8080',
  realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'cmms',
  clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'cmms-web',
}

let keycloakInstance: Keycloak | null = null

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const initKeycloak = async () => {
      if (typeof window === 'undefined') return

      try {
        keycloakInstance = new Keycloak(keycloakConfig)

        const authenticated = await keycloakInstance.init({
          onLoad: 'check-sso',
          silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
          checkLoginIframe: false,
        })

        if (authenticated && keycloakInstance.token) {
          setIsAuthenticated(true)
          setToken(keycloakInstance.token)
          api.setToken(keycloakInstance.token)

          const profile = await keycloakInstance.loadUserProfile()
          setUser({
            id: keycloakInstance.subject,
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName,
            username: profile.username,
            roles: keycloakInstance.realmAccess?.roles || [],
          })

          // Token refresh
          setInterval(async () => {
            try {
              const refreshed = await keycloakInstance?.updateToken(30)
              if (refreshed && keycloakInstance?.token) {
                setToken(keycloakInstance.token)
                api.setToken(keycloakInstance.token)
              }
            } catch {
              logout()
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

  const login = () => {
    keycloakInstance?.login()
  }

  const logout = () => {
    keycloakInstance?.logout({ redirectUri: window.location.origin })
    setIsAuthenticated(false)
    setUser(null)
    setToken(null)
    api.setToken(null)
  }

  const hasRole = (role: string): boolean => {
    return keycloakInstance?.hasRealmRole(role) || false
  }

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
