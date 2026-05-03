// Stub module replacing @clerk/nextjs after Clerk removal.
// These components are no longer used but the catch-all route pages
// still reference them. This stub prevents build failures.

import type { ReactNode } from 'react'

export const SignIn = () => null
export const SignUp = () => null
export const ClerkProvider = ({ children }: { children: ReactNode }) => children
export const useUser = () => ({ isLoaded: true, isSignedIn: false, user: null })
export const useAuth = () => ({ isLoaded: true, isSignedIn: false, userId: null })
export const useClerk = () => ({})
export const useSignIn = () => ({})
export const useSignUp = () => ({})
export const currentUser = async () => null
export const auth = async () => ({ userId: null })
