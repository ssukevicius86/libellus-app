import {
  addDoc,
  collection,
  limit,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { AmbienceId } from '@/lib/ambience'

export interface ReadingSession {
  id: string
  bookId: string | null
  bookTitle: string | null
  startedAt: Timestamp
  durationMin: number
  pagesRead: number | null
  ambience: AmbienceId[]
  moodBefore: number | null
  moodAfter: number | null
}

export type NewSession = Omit<ReadingSession, 'id' | 'startedAt'> & { startedAt: Date }

export const sessionsCol = (uid: string) => collection(db, 'users', uid, 'sessions')

export const recentSessionsQuery = (uid: string, max = 200) =>
  query(sessionsCol(uid), orderBy('startedAt', 'desc'), limit(max))

// Sin orderBy para no requerir índice compuesto; se ordena en el cliente
export const bookSessionsQuery = (uid: string, bookId: string) =>
  query(sessionsCol(uid), where('bookId', '==', bookId))

export async function addSession(uid: string, session: NewSession): Promise<void> {
  await addDoc(sessionsCol(uid), {
    ...session,
    startedAt: Timestamp.fromDate(session.startedAt),
  })
}
