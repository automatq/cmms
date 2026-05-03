'use client'

import { createAuthClient } from 'better-auth/react'
import { organizationClient } from 'better-auth/client/plugins'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'
const AUTH_BASE = API_URL.replace(/\/api\/v1\/?$/, '') + '/api/auth'

const TOKEN_KEY = 'nexly_auth_token'

export const authClient = createAuthClient({
  baseURL: AUTH_BASE,
  plugins: [organizationClient()],
  fetchOptions: {
    credentials: 'omit',
    onRequest: (ctx) => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem(TOKEN_KEY)
        if (token) ctx.headers.set('Authorization', `Bearer ${token}`)
      }
    },
    onSuccess: (ctx) => {
      if (typeof window !== 'undefined') {
        const token = ctx.response.headers.get('set-auth-token')
        if (token) localStorage.setItem(TOKEN_KEY, token)
      }
    },
  },
})

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function clearStoredToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
}

export const { useSession, signIn, signUp, signOut, organization } = authClient
