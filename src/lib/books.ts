import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type FieldValue,
  type Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export type BookStatus = 'want' | 'reading' | 'read'

export const STATUS_LABELS: Record<BookStatus, string> = {
  reading: 'Leyendo',
  want: 'Quiero leer',
  read: 'Leído',
}

export interface Book {
  id: string
  title: string
  authors: string[]
  coverUrl: string | null
  pageCount: number | null
  googleId: string | null
  description: string | null
  status: BookStatus
  currentPage: number
  rating: number | null
  notes: string
  startedAt: Timestamp | null
  finishedAt: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type NewBook = Pick<
  Book,
  'title' | 'authors' | 'coverUrl' | 'pageCount' | 'googleId' | 'description' | 'status'
>

type BookPatch = Partial<
  Pick<Book, 'title' | 'authors' | 'coverUrl' | 'pageCount' | 'currentPage' | 'rating' | 'notes'>
>

export const booksCol = (uid: string) => collection(db, 'users', uid, 'books')
export const bookDoc = (uid: string, id: string) => doc(db, 'users', uid, 'books', id)
export const booksQuery = (uid: string) => query(booksCol(uid), orderBy('updatedAt', 'desc'))

export async function addBook(uid: string, book: NewBook): Promise<string> {
  const ref = await addDoc(booksCol(uid), {
    ...book,
    currentPage: book.status === 'read' ? (book.pageCount ?? 0) : 0,
    rating: null,
    notes: '',
    startedAt: book.status === 'want' ? null : serverTimestamp(),
    finishedAt: book.status === 'read' ? serverTimestamp() : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export function updateBook(uid: string, id: string, patch: BookPatch) {
  return updateDoc(bookDoc(uid, id), { ...patch, updatedAt: serverTimestamp() })
}

/** Cambia el estado y mantiene coherentes las fechas de inicio/fin y la página actual. */
export function setBookStatus(uid: string, book: Book, status: BookStatus) {
  const patch: Record<string, FieldValue | BookStatus | number | null> = {
    status,
    updatedAt: serverTimestamp(),
  }
  if (status !== 'want' && !book.startedAt) patch.startedAt = serverTimestamp()
  if (status === 'read') {
    patch.finishedAt = serverTimestamp()
    if (book.pageCount) patch.currentPage = book.pageCount
  } else {
    patch.finishedAt = null
  }
  return updateDoc(bookDoc(uid, book.id), patch)
}

export function deleteBook(uid: string, id: string) {
  return deleteDoc(bookDoc(uid, id))
}

export function bookProgress(book: Pick<Book, 'currentPage' | 'pageCount' | 'status'>): number {
  if (book.status === 'read') return 1
  if (!book.pageCount) return 0
  return Math.min(1, book.currentPage / book.pageCount)
}

export function authorsLabel(authors: string[]) {
  return authors.length ? authors.join(', ') : 'Autor desconocido'
}
