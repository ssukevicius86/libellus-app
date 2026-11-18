import { createContext, useContext } from 'react'
import type { User } from 'firebase/auth'
import type { ProfileExtras, UserProfile } from '@/lib/users'

export interface SignUpData extends ProfileExtras {
  email: string
  password: string
}

export interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  /** Ingreso con Google (ventana emergente). */
  signIn: () => Promise<void>
  /** Ingreso con cuenta Libellus (email y contraseña). */
  signInWithEmail: (email: string, password: string) => Promise<void>
  /** Crea una cuenta Libellus y guarda nombre, apellido y edad en el perfil. */
  signUpWithEmail: (data: SignUpData) => Promise<void>
  /** Envía el email para restablecer la contraseña. */
  resetPassword: (email: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
