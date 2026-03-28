import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'
import { api } from './api'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  username: string
  roles: string[]
}

// Clerk token cache for Expo SecureStore
export const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key)
    } catch {
      return null
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value)
    } catch {
      // SecureStore may fail on some devices
    }
  },
  async clearToken(key: string) {
    try {
      await SecureStore.deleteItemAsync(key)
    } catch {
      // Ignore
    }
  },
}

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
  token: string | null
  setAuth: (params: { user: User; token: string }) => void
  clearAuth: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  token: null,

  setAuth: ({ user, token }) => {
    api.setToken(token)
    set({ isAuthenticated: true, user, token, isLoading: false })
  },

  clearAuth: () => {
    api.setToken(null)
    set({ isAuthenticated: false, user: null, token: null, isLoading: false })
  },

  setLoading: (loading) => {
    set({ isLoading: loading })
  },
}))
