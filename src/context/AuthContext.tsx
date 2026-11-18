import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { auth, googleProvider } from '@/lib/firebase'
import { ensureUserProfile, userDoc, type ProfileExtras, type UserProfile } from '@/lib/users'
import { AuthContext, type AuthContextValue } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  // Datos del registro en curso: onAuthStateChanged se dispara dentro de
  // createUserWithEmailAndPassword, así que los dejamos listos antes de llamarlo.
  const pendingExtras = useRef<ProfileExtras | null>(null)

  useEffect(() => {
    let unsubProfile: Unsubscribe | undefined

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      unsubProfile?.()
      unsubProfile = undefined
      setUser(u)

      if (!u) {
        setProfile(null)
        setLoading(false)
        return
      }

      setLoading(true)
      const extras = pendingExtras.current ?? undefined
      pendingExtras.current = null
      try {
        await ensureUserProfile(u, extras)
      } catch (err) {
        console.error('No se pudo crear/actualizar el perfil', err)
      }
      // El usuario pudo cambiar mientras esperábamos
      if (auth.currentUser?.uid !== u.uid) return

      unsubProfile = onSnapshot(
        userDoc(u.uid),
        (snap) => {
          setProfile(snap.exists() ? (snap.data() as UserProfile) : null)
          setLoading(false)
        },
        (err) => {
          console.error('Error escuchando el perfil', err)
          setProfile(null)
          setLoading(false)
        },
      )
    })

    return () => {
      unsubAuth()
      unsubProfile?.()
    }
  }, [])

  const value: AuthContextValue = {
    user,
    profile,
    loading,
    signIn: async () => {
      await signInWithPopup(auth, googleProvider)
    },
    signInWithEmail: async (email, password) => {
      await signInWithEmailAndPassword(auth, email, password)
    },
    signUpWithEmail: async ({ email, password, firstName, lastName, age }) => {
      pendingExtras.current = { firstName, lastName, age }
      try {
        const { user: created } = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(created, { displayName: `${firstName} ${lastName}` })
        // La verificación no bloquea el ingreso; si falla el envío, solo lo registramos.
        sendEmailVerification(created).catch((err) =>
          console.error('No se pudo enviar el email de verificación', err),
        )
      } catch (err) {
        pendingExtras.current = null
        throw err
      }
    },
    resetPassword: async (email) => {
      await sendPasswordResetEmail(auth, email)
    },
    signOut: () => firebaseSignOut(auth),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
