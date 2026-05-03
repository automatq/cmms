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
