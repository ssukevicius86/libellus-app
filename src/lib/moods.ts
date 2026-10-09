import {
  collection,
  doc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export type MoodValue = 1 | 2 | 3 | 4 | 5

// Metáfora del clima: evita etiquetas con género y encaja con la estética
export const MOOD_LABELS: Record<MoodValue, string> = {
  1: 'Tormenta',
  2: 'Nublado',
  3: 'Calma',
  4: 'Luminoso',
  5: 'Radiante',
}

export const MOOD_VALUES = [1, 2, 3, 4, 5] as const satisfies readonly MoodValue[]

export interface MoodEntry {
  /** Fecha local yyyy-mm-dd (también es el ID del documento) */
  id: string
  date: string
  mood: MoodValue
  note: string
  updatedAt: Timestamp
}

/** yyyy-mm-dd en la zona horaria local */
export function dayKey(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const moodsCol = (uid: string) => collection(db, 'users', uid, 'moods')
export const moodDoc = (uid: string, date: string) => doc(db, 'users', uid, 'moods', date)

export const recentMoodsQuery = (uid: string, max = 90) =>
  query(moodsCol(uid), orderBy('date', 'desc'), limit(max))

/** Un registro por día: volver a registrar el mismo día lo sobrescribe. */
export function saveMood(uid: string, mood: MoodValue, note = '', date = dayKey()) {
  return setDoc(moodDoc(uid, date), { date, mood, note, updatedAt: serverTimestamp() })
}
