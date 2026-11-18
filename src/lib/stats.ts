import { dayKey, type MoodEntry } from '@/lib/moods'
import type { ReadingSession } from '@/lib/sessions'

const dayLabel = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' })

function lastDays(n: number): Date[] {
  const today = new Date()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (n - 1 - i))
    return d
  })
}

export function minutesByDay(sessions: ReadingSession[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const s of sessions) {
    const key = dayKey(s.startedAt.toDate())
    map.set(key, (map.get(key) ?? 0) + s.durationMin)
  }
  return map
}

/** Serie diaria de los últimos `n` días combinando ánimo y minutos leídos. */
export function dailySeries(sessions: ReadingSession[], moods: MoodEntry[], n = 30) {
  const minutes = minutesByDay(sessions)
  const moodMap = new Map(moods.map((m) => [m.date, m.mood]))
  return lastDays(n).map((d) => {
    const day = dayKey(d)
    return {
      day,
      label: dayLabel.format(d),
      mood: moodMap.get(day) ?? null,
      minutes: minutes.get(day) ?? 0,
    }
  })
}

/** Días seguidos con lectura, contando hasta hoy (o hasta ayer si hoy aún no se leyó). */
export function readingStreak(sessions: ReadingSession[]): number {
  const minutes = minutesByDay(sessions)
  const d = new Date()
  if (!minutes.get(dayKey(d))) d.setDate(d.getDate() - 1)
  let streak = 0
  while (minutes.get(dayKey(d))) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

/** La racha más larga de días seguidos con lectura. */
export function longestStreak(sessions: ReadingSession[]): number {
  const days = [...minutesByDay(sessions).keys()].sort()
  let best = 0
  let current = 0
  let prev: Date | null = null
  for (const key of days) {
    const [y, m, d] = key.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    const next = prev && new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1)
    current = next && dayKey(next) === key ? current + 1 : 1
    best = Math.max(best, current)
    prev = date
  }
  return best
}

/** Ánimo promedio antes y después de leer, solo en sesiones que registraron ambos. */
export function moodShift(sessions: ReadingSession[]) {
  const both = sessions.filter((s) => s.moodBefore != null && s.moodAfter != null)
  if (!both.length) return null
  const avg = (key: 'moodBefore' | 'moodAfter') =>
    both.reduce((sum, s) => sum + (s[key] as number), 0) / both.length
  return { before: avg('moodBefore'), after: avg('moodAfter'), count: both.length }
}

export function minutesLastDays(sessions: ReadingSession[], n = 7): number {
  const minutes = minutesByDay(sessions)
  return lastDays(n).reduce((sum, d) => sum + (minutes.get(dayKey(d)) ?? 0), 0)
}

export function formatMinutes(min: number): string {
  const m = Math.round(min)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  return m % 60 ? `${h} h ${m % 60} min` : `${h} h`
}

/** mm:ss o h:mm:ss */
export function formatClock(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(h ? 2 : 1, '0')
  const ss = String(s).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}
