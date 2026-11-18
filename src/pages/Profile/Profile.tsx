import { useMemo } from 'react'
import { Link } from 'react-router'
import { ArrowRight, BookCheck, BookOpen, Clock, Flame, LogOut, Settings } from 'lucide-react'
import { useAmbience } from '@/context/ambience-context'
import { useAuth } from '@/context/auth-context'
import { useBooks, useSessions } from '@/hooks/useLibrary'
import { MOOD_LABELS, type MoodValue } from '@/lib/moods'
import { formatMinutes, longestStreak, moodShift } from '@/lib/stats'
import { BookCover, BookRow } from '@/components/books'
import { PageHeader } from '@/components/deco'
import { MoodIcon } from '@/components/mood'
import { Button } from '@/components/ui/button/button'
import './Profile.css'

const monthYear = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' })
const shortDate = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' })

function StatTile({ icon: Icon, value, label }: { icon: typeof Flame; value: string; label: string }) {
  return (
    <div className="deco-card profile-stat">
      <Icon className="icono-dorado" strokeWidth={1.6} aria-hidden="true" />
      <p className="profile-stat-value">{value}</p>
      <p className="texto-nota">{label}</p>
    </div>
  )
}

/** Promedio de ánimo redondeado a uno de los 5 estados del clima. */
function MoodAverage({ value, label }: { value: number; label: string }) {
  const mood = Math.round(value) as MoodValue
  return (
    <div className="profile-mood-average">
      <MoodIcon mood={mood} className="profile-mood-icon" />
      <p className="profile-mood-label">{MOOD_LABELS[mood]}</p>
      <p className="texto-nota">{label}</p>
    </div>
  )
}

export default function Profile() {
  const { user, profile, signOut } = useAuth()
  const { stopAll } = useAmbience()
  const books = useBooks()
  const sessions = useSessions()

  const name = profile?.displayName ?? user?.displayName ?? profile?.email ?? user?.email ?? 'Tu perfil'
  const photo = profile?.photoURL ?? user?.photoURL
  const since = profile?.createdAt?.toDate()

  const reading = books.data.filter((b) => b.status === 'reading')
  const finished = useMemo(
    () =>
      books.data
        .filter((b) => b.status === 'read')
        .sort((a, b) => (b.finishedAt?.toMillis() ?? 0) - (a.finishedAt?.toMillis() ?? 0)),
    [books.data],
  )

  const stats = useMemo(
    () => ({
      minutes: sessions.data.reduce((sum, s) => sum + s.durationMin, 0),
      longest: longestStreak(sessions.data),
      shift: moodShift(sessions.data),
    }),
    [sessions.data],
  )

  return (
    <div className="profile">
      <PageHeader eyebrow="Tu historia" title="Mi perfil">
        <Button asChild variant="outline">
          <Link to="/perfil/ajustes">
            <Settings /> Ajustes
          </Link>
        </Button>
      </PageHeader>

      {/* Identidad */}
      <section className="deco-card profile-identity">
        {photo ? (
          <img src={photo} alt="" referrerPolicy="no-referrer" className="profile-avatar" />
        ) : (
          <span className="profile-avatar profile-avatar--inicial" aria-hidden="true">
            {name.charAt(0)}
          </span>
        )}
        <div className="profile-identity-text">
          <p className="profile-name">{name}</p>
          {since && <p className="texto-secundario">Leyendo en Libellus desde {monthYear.format(since)}</p>}
        </div>
        <Button
          variant="outline"
          className="profile-salir"
          onClick={() => {
            // Corta los sonidos de ambiente antes de salir
            stopAll()
            void signOut()
          }}
        >
          <LogOut aria-hidden="true" /> Cerrar sesión
        </Button>
      </section>

      {/* Totales */}
      <section aria-label="Tus totales" className="profile-stats">
        <StatTile icon={Clock} value={formatMinutes(stats.minutes)} label="leídos en total" />
        <StatTile icon={BookCheck} value={String(finished.length)} label={finished.length === 1 ? 'libro terminado' : 'libros terminados'} />
        <StatTile icon={Flame} value={String(stats.longest)} label="racha más larga" />
        <StatTile icon={BookOpen} value={String(sessions.data.length)} label={sessions.data.length === 1 ? 'sesión' : 'sesiones'} />
      </section>

      <div className="profile-columns">
        {/* Leyendo ahora */}
        <section className="deco-card profile-panel">
          <div className="profile-panel-header">
            <h2 className="deco-eyebrow">Leyendo ahora</h2>
            <Link to="/biblioteca" className="profile-link-small">
              Ver biblioteca
            </Link>
          </div>
          {books.loading ? (
            <p className="texto-secundario">Cargando…</p>
          ) : reading.length ? (
            <div className="profile-list">
              {reading.map((book) => (
                <BookRow key={book.id} book={book} />
              ))}
            </div>
          ) : (
            <p className="texto-vacio">Ningún libro abierto por ahora.</p>
          )}
        </section>

        {/* Ánimo y lectura */}
        <section className="deco-card profile-panel">
          <div className="profile-panel-header">
            <h2 className="deco-eyebrow">Cómo te deja la lectura</h2>
            <Link to="/animo" className="profile-link-small">
              Ver tu ánimo
            </Link>
          </div>
          {stats.shift ? (
            <>
              <div className="profile-mood-shift">
                <MoodAverage value={stats.shift.before} label="antes de leer" />
                <ArrowRight className="profile-mood-arrow" aria-hidden="true" />
                <MoodAverage value={stats.shift.after} label="después de leer" />
              </div>
              <p className="texto-nota profile-centrado">
                Promedio de {stats.shift.count} {stats.shift.count === 1 ? 'sesión' : 'sesiones'} con ánimo registrado
              </p>
            </>
          ) : (
            <p className="texto-secundario">
              Registrá cómo llegás y cómo salís de cada sesión para ver cómo te acompaña la lectura.
            </p>
          )}
        </section>
      </div>

      {/* Historial de sesiones */}
      <section className="deco-card profile-panel">
        <h2 className="deco-eyebrow">Tus últimas sesiones</h2>
        {sessions.loading ? (
          <p className="texto-secundario">Cargando…</p>
        ) : sessions.data.length ? (
          <ol className="lista-tarjeta profile-sessions">
            {sessions.data.slice(0, 10).map((s) => (
              <li key={s.id} className="profile-session">
                <span className="profile-session-date">{shortDate.format(s.startedAt.toDate())}</span>
                <div className="profile-session-main">
                  {s.bookId ? (
                    <Link to={`/libro/${s.bookId}`} className="profile-session-title">
                      {s.bookTitle ?? 'Libro'}
                    </Link>
                  ) : (
                    <p className="profile-session-title">Lectura libre</p>
                  )}
                  <p className="texto-nota">
                    {formatMinutes(s.durationMin)}
                    {s.pagesRead ? ` · ${s.pagesRead} páginas` : ''}
                  </p>
                </div>
                {s.moodBefore != null && s.moodAfter != null && (
                  <span
                    className="profile-session-mood"
                    aria-label={`De ${MOOD_LABELS[s.moodBefore as MoodValue]} a ${MOOD_LABELS[s.moodAfter as MoodValue]}`}
                  >
                    <MoodIcon mood={s.moodBefore as MoodValue} className="icono-dorado" />
                    <ArrowRight className="profile-session-arrow" aria-hidden="true" />
                    <MoodIcon mood={s.moodAfter as MoodValue} className="icono-dorado" />
                  </span>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="texto-vacio">Todavía no registraste sesiones.</p>
        )}
      </section>

      {/* Libros terminados */}
      {finished.length > 0 && (
        <section className="deco-card profile-panel">
          <h2 className="deco-eyebrow">Libros terminados</h2>
          <ul className="profile-finished">
            {finished.map((b) => (
              <li key={b.id}>
                <Link to={`/libro/${b.id}`} className="profile-finished-book" title={b.title}>
                  <BookCover book={b} className="profile-finished-cover" />
                  <span className="texto-nota">
                    {b.finishedAt ? shortDate.format(b.finishedAt.toDate()) : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
