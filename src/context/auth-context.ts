import { createContext, useContext } from 'react'
import type { User } from 'firebase/auth'
import type { UserProfile } from '@/lib/users'

export interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
