import { useMemo } from 'react'
import { Link } from 'react-router'
import { BookOpen, BookPlus, Clock, Flame, Library } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { useBooks, useMoods, useSessions, useUid } from '@/hooks/useLibrary'
import { dayKey, MOOD_LABELS, saveMood } from '@/lib/moods'
import { formatMinutes, minutesLastDays, readingStreak } from '@/lib/stats'
import { BookRow } from '@/components/books'
import { DecoDivider, PageHeader } from '@/components/deco'
import { MoodPicker } from '@/components/mood'
import { Button } from '@/components/ui/button'
import './Sanctuary.css'

function greeting() {
  const h = new Date().getHours()
  if (h < 6) return 'Buenas noches'
  if (h < 13) return 'Buenos días'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

function StatTile({ icon: Icon, value, label }: { icon: typeof Flame; value: string; label: string }) {
  return (
    <div className="deco-card sanctuary-stat">
      <Icon className="sanctuary-stat-icon" strokeWidth={1.6} aria-hidden="true" />
      <p className="sanctuary-stat-value">{value}</p>
      <p className="sanctuary-stat-label">{label}</p>
    </div>
  )
}

export default function Sanctuary() {
  const uid = useUid()
  const { user, profile } = useAuth()
  const books = useBooks()
  const sessions = useSessions()
  const moods = useMoods()

  const name = (profile?.displayName ?? user?.displayName ?? '').split(' ')[0]
  const reading = books.data.filter((b) => b.status === 'reading')
  const todayMood = moods.data.find((m) => m.date === dayKey())

  const stats = useMemo(() => {
    const year = new Date().getFullYear()
    return {
      streak: readingStreak(sessions.data),
      week: minutesLastDays(sessions.data, 7),
      readThisYear: books.data.filter(
        (b) => b.status === 'read' && b.finishedAt?.toDate().getFullYear() === year,
      ).length,
    }
  }, [sessions.data, books.data])

  return (
    <div className="sanctuary">
      <PageHeader eyebrow={greeting()} title={name ? `Hola, ${name}` : 'Tu santuario'}>
        <Button asChild size="lg">
          <Link to="/sesion">
            <BookOpen /> Comenzar sesión
          </Link>
        </Button>
      </PageHeader>

      <section aria-label="Resumen" className="sanctuary-stats">
        <StatTile icon={Flame} value={String(stats.streak)} label={stats.streak === 1 ? 'día seguido' : 'días seguidos'} />
        <StatTile icon={Clock} value={formatMinutes(stats.week)} label="últimos 7 días" />
        <StatTile icon={Library} value={String(stats.readThisYear)} label={`leídos en ${new Date().getFullYear()}`} />
      </section>

      <div className="sanctuary-columns">
        <section className="deco-card sanctuary-panel">
          <div className="sanctuary-panel-header">
            <h2 className="deco-eyebrow">Leyendo ahora</h2>
            <Link to="/biblioteca" className="sanctuary-link-small">
              Ver biblioteca
            </Link>
          </div>
          {books.loading ? (
            <p className="sanctuary-muted">Cargando…</p>
          ) : reading.length ? (
            <div className="sanctuary-book-list">
              {reading.slice(0, 3).map((book) => (
                <BookRow
                  key={book.id}
                  book={book}
                  action={
                    <Button asChild variant="outline" size="icon" aria-label={`Leer ${book.title}`}>
                      <Link to={`/sesion?libro=${book.id}`}>
                        <BookOpen />
                      </Link>
                    </Button>
                  }
                />
              ))}
            </div>
          ) : (
            <div className="sanctuary-empty">
              <p className="sanctuary-empty-text">
                Ningún libro abierto por ahora.
              </p>
              <Button asChild variant="outline">
                <Link to="/biblioteca/agregar">
                  <BookPlus /> Agregar un libro
                </Link>
              </Button>
            </div>
          )}
        </section>

        <section className="deco-card sanctuary-panel sanctuary-panel--compact">
          <h2 className="deco-eyebrow">¿Cómo está tu clima interior hoy?</h2>
          <MoodPicker
            value={todayMood?.mood ?? null}
            onChange={(m) => void saveMood(uid, m, todayMood?.note ?? '')}
          />
          <DecoDivider />
          <p className="sanctuary-muted sanctuary-mood-footer">
            {todayMood ? (
              <>
                Hoy: <span className="sanctuary-gold">{MOOD_LABELS[todayMood.mood]}</span> ·{' '}
                <Link to="/animo" className="sanctuary-link-underline">
                  ver tu evolución
                </Link>
              </>
            ) : (
              'Registrar tu ánimo te ayuda a ver cómo te acompaña la lectura.'
            )}
          </p>
        </section>
      </div>
    </div>
  )
}
