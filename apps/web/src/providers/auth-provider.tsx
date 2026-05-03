'use client'

import React, { createContext, useContext } from 'react'

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

const STUB_USER: User = {
  id: process.env.NEXT_PUBLIC_DEFAULT_USER_ID || '00000000-0000-0000-0000-000000000002',
  email: 'admin@local',
  firstName: 'Admin',
  lastName: 'User',
  username: 'admin',
  roles: ['admin'],
  permissions: ['*'],
}

const STUB_VALUE: AuthContextType = {
  isAuthenticated: true,
  isLoading: false,
  user: STUB_USER,
  token: null,
  login: () => {},
  logout: () => {},
}

const AuthContext = createContext<AuthContextType>(STUB_VALUE)

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthContext.Provider value={STUB_VALUE}>{children}</AuthContext.Provider>
}
