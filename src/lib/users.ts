import type { User } from 'firebase/auth'
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

/** Datos que se piden al crear una cuenta Libellus (email y contraseña). */
export interface ProfileExtras {
  firstName: string
  lastName: string
  age: number
}

export interface UserProfile extends Partial<ProfileExtras> {
  displayName: string | null
  email: string | null
  photoURL: string | null
  createdAt: Timestamp
  lastLoginAt: Timestamp
  // Solo lo asigna un admin (ver firestore.rules)
  role?: string
}

export const userDoc = (uid: string) => doc(db, 'users', uid)

/**
 * Crea users/{uid} en el primer login; en los siguientes solo actualiza lastLoginAt.
 * `extras` llega solo cuando la cuenta se acaba de crear con el formulario de registro.
 */
export async function ensureUserProfile(user: User, extras?: ProfileExtras): Promise<void> {
  const ref = userDoc(user.uid)
  const snap = await getDoc(ref)

  if (snap.exists()) {
    await updateDoc(ref, { lastLoginAt: serverTimestamp() })
    return
  }

  await setDoc(ref, {
    displayName: extras ? `${extras.firstName} ${extras.lastName}` : user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    ...extras,
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  })
}
