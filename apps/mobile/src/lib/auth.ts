import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'
import { api } from './api'

WebBrowser.maybeCompleteAuthSession()

const AUTH0_DOMAIN = process.env.EXPO_PUBLIC_AUTH0_DOMAIN || ''
const AUTH0_CLIENT_ID = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID || ''
const AUTH0_AUDIENCE = process.env.EXPO_PUBLIC_AUTH0_AUDIENCE || ''

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  username: string
  roles: string[]
}

const discovery = {
  authorizationEndpoint: `https://${AUTH0_DOMAIN}/authorize`,
  tokenEndpoint: `https://${AUTH0_DOMAIN}/oauth/token`,
  revocationEndpoint: `https://${AUTH0_DOMAIN}/oauth/revoke`,
  userInfoEndpoint: `https://${AUTH0_DOMAIN}/userinfo`,
}

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
  token: string | null
  checkAuth: () => Promise<void>
  login: () => Promise<User | null>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  token: null,

  checkAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token')
      const userStr = await SecureStore.getItemAsync('user_info')

      if (token && userStr) {
        const user = JSON.parse(userStr) as User
        api.setToken(token)
        set({ isAuthenticated: true, user, token, isLoading: false })
      } else {
        set({ isAuthenticated: false, user: null, token: null, isLoading: false })
      }
    } catch (error) {
      console.error('Check auth error:', error)
      set({ isAuthenticated: false, user: null, token: null, isLoading: false })
    }
  },

  login: async () => {
    try {
      const redirectUri = AuthSession.makeRedirectUri({ scheme: 'cmms' })

      const request = new AuthSession.AuthRequest({
        clientId: AUTH0_CLIENT_ID,
        redirectUri,
        scopes: ['openid', 'profile', 'email'],
        usePKCE: true,
        extraParams: {
          audience: AUTH0_AUDIENCE,
        },
      })

      const result = await request.promptAsync(discovery)

      if (result.type !== 'success' || !result.params?.code) {
        console.log('Auth cancelled or failed:', result.type)
        return null
      }

      // Exchange code for token
      const tokenResponse = await AuthSession.exchangeCodeAsync(
        {
          clientId: AUTH0_CLIENT_ID,
          code: result.params.code,
          redirectUri,
          extraParams: {
            code_verifier: request.codeVerifier || '',
          },
        },
        discovery,
      )

      if (!tokenResponse.accessToken) {
        throw new Error('No access token received')
      }

      const token = tokenResponse.accessToken
      api.setToken(token)
      await SecureStore.setItemAsync('auth_token', token)

      // Fetch user info
      const userInfoResponse = await fetch(discovery.userInfoEndpoint, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const userInfo = await userInfoResponse.json()

      const user: User = {
        id: userInfo.sub,
        email: userInfo.email || '',
        firstName: userInfo.given_name || '',
        lastName: userInfo.family_name || '',
        username: userInfo.nickname || userInfo.email || '',
        roles: [],
      }

      await SecureStore.setItemAsync('user_info', JSON.stringify(user))

      if (tokenResponse.refreshToken) {
        await SecureStore.setItemAsync('refresh_token', tokenResponse.refreshToken)
      }

      set({ isAuthenticated: true, user, token, isLoading: false })
      return user
    } catch (error) {
      console.error('Login error:', error)
      return null
    }
  },

  logout: async () => {
    try {
      api.setToken(null)
      await SecureStore.deleteItemAsync('auth_token')
      await SecureStore.deleteItemAsync('refresh_token')
      await SecureStore.deleteItemAsync('user_info')

      set({ isAuthenticated: false, user: null, token: null, isLoading: false })

      // Auth0 logout
      await WebBrowser.openBrowserAsync(
        `https://${AUTH0_DOMAIN}/v2/logout?client_id=${AUTH0_CLIENT_ID}&returnTo=${AuthSession.makeRedirectUri({ scheme: 'cmms' })}`
      )
    } catch (error) {
      console.error('Logout error:', error)
    }
  },
}))
