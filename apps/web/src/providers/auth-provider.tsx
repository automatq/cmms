'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react'
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

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const {
    isAuthenticated,
    isLoading,
    user: auth0User,
    getAccessTokenSilently,
    loginWithRedirect,
    logout: auth0Logout,
  } = useAuth0()
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const getToken = async () => {
      if (isAuthenticated && auth0User) {
        try {
          const accessToken = await getAccessTokenSilently()
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
            id: auth0User.sub || '',
            email: auth0User.email || '',
            firstName: auth0User.given_name || '',
            lastName: auth0User.family_name || '',
            username: auth0User.nickname || auth0User.email || '',
            roles,
          })
        } catch (error) {
          console.error('Error getting access token:', error)
        }
      }
    }

    getToken()
  }, [isAuthenticated, auth0User, getAccessTokenSilently])

  const login = () => {
    loginWithRedirect()
  }

  const logout = () => {
    api.setToken(null)
    setToken(null)
    setUser(null)
    auth0Logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    })
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
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || ''
  const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || ''
  const audience = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || ''
  const organization = process.env.NEXT_PUBLIC_AUTH0_ORGANIZATION || undefined

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: typeof window !== 'undefined' ? window.location.origin : '',
        audience,
        organization,
        scope: 'openid profile email',
      }}
      cacheLocation="localstorage"
    >
      <AuthProviderInner>{children}</AuthProviderInner>
    </Auth0Provider>
  )
}
