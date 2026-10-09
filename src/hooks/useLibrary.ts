import { useMemo } from 'react'
import { useAuth } from '@/context/auth-context'
import { useCollection, useDocument } from '@/hooks/useFirestore'
import { bookDoc, booksQuery, type Book } from '@/lib/books'
import { recentMoodsQuery, type MoodEntry } from '@/lib/moods'
import { bookSessionsQuery, recentSessionsQuery, type ReadingSession } from '@/lib/sessions'

/** UID del usuario actual. Solo para páginas bajo <ProtectedRoute>. */
export function useUid(): string {
  const { user } = useAuth()
  if (!user) throw new Error('useUid requiere un usuario autenticado')
  return user.uid
}

export function useBooks() {
  const uid = useUid()
  return useCollection<Book>(useMemo(() => booksQuery(uid), [uid]))
}

export function useBook(id: string | undefined) {
  const uid = useUid()
  return useDocument<Book>(useMemo(() => (id ? bookDoc(uid, id) : null), [uid, id]))
}

export function useSessions() {
  const uid = useUid()
  return useCollection<ReadingSession>(useMemo(() => recentSessionsQuery(uid), [uid]))
}

export function useBookSessions(bookId: string | undefined) {
  const uid = useUid()
  const result = useCollection<ReadingSession>(
    useMemo(() => (bookId ? bookSessionsQuery(uid, bookId) : null), [uid, bookId]),
  )
  const sorted = useMemo(
    () => [...result.data].sort((a, b) => b.startedAt.toMillis() - a.startedAt.toMillis()),
    [result.data],
  )
  return { ...result, data: sorted }
}

export function useMoods() {
  const uid = useUid()
  return useCollection<MoodEntry>(useMemo(() => recentMoodsQuery(uid), [uid]))
}
