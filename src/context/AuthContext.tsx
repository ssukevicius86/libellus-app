import { useEffect, useState, type ReactNode } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { auth, googleProvider } from '@/lib/firebase'
import { ensureUserProfile, userDoc, type UserProfile } from '@/lib/users'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

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
      try {
        await ensureUserProfile(u)
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

  const value = {
    user,
    profile,
    loading,
    signIn: async () => {
      await signInWithPopup(auth, googleProvider)
    },
    signOut: () => firebaseSignOut(auth),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
