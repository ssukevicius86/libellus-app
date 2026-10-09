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

export interface UserProfile {
  displayName: string | null
  email: string | null
  photoURL: string | null
  createdAt: Timestamp
  lastLoginAt: Timestamp
  // Solo lo asigna un admin (ver firestore.rules)
  role?: string
}

export const userDoc = (uid: string) => doc(db, 'users', uid)

/** Crea users/{uid} en el primer login; en los siguientes solo actualiza lastLoginAt. */
export async function ensureUserProfile(user: User): Promise<void> {
  const ref = userDoc(user.uid)
  const snap = await getDoc(ref)

  if (snap.exists()) {
    await updateDoc(ref, { lastLoginAt: serverTimestamp() })
    return
  }

  await setDoc(ref, {
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  })
}
