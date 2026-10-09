import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import confetti from 'canvas-confetti'
import {
  Check,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  Square,
  SunDim,
} from 'lucide-react'
import { useAmbience } from '@/context/ambience-context'
import { usePreferences } from '@/context/preferences-context'
import { useBooks, useMoods, useUid } from '@/hooks/useLibrary'
import { useWakeLock } from '@/hooks/useWakeLock'
import { AMBIENCES } from '@/lib/ambience'
import { authorsLabel, setBookStatus, updateBook, type Book } from '@/lib/books'
import { dayKey, saveMood, type MoodValue } from '@/lib/moods'
import { addSession } from '@/lib/sessions'
import { formatMinutes } from '@/lib/stats'
import { cn } from '@/lib/utils'
import { AmbienceMixer } from '@/components/ambience'
import { BookCover } from '@/components/books'
import { DecoDivider, LotusIcon, PageHeader } from '@/components/deco'
import { DimOverlay, FocusRing } from '@/components/focus'
import { MoodPicker } from '@/components/mood'
import { Button } from '@/components/ui/button/button'
import { Input } from '@/components/ui/input/input'
import { Label } from '@/components/ui/label/label'
import { Slider } from '@/components/ui/slider/slider'
import './ReadingSession.css'

const PRESETS = [15, 25, 45, 60]

type Phase = 'setup' | 'running' | 'finish' | 'done'

export default function ReadingSession() {
  const uid = useUid()
  const [params] = useSearchParams()
  const prefs = usePreferences()
  const ambience = useAmbience()
  const { data: books } = useBooks()
  const moods = useMoods()

  const [phase, setPhase] = useState<Phase>('setup')
  const [bookId, setBookId] = useState<string | null>(params.get('libro'))
  const [minutes, setMinutes] = useState<number | null>(prefs.focusMinutes)
  const [moodBefore, setMoodBefore] = useState<MoodValue | null>(null)
  const [dim, setDim] = useState(prefs.dimLevel)
  const [dimOn, setDimOn] = useState(prefs.dimLevel > 0)
  const [paused, setPaused] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [summary, setSummary] = useState<{ minutes: number; pages: number | null } | null>(null)

  // Tiempo acumulado en tramos ya cerrados + inicio del tramo actual
  const accumulated = useRef(0)
  const segmentStart = useRef<number | null>(null)
  const [startedAt, setStartedAt] = useState(() => new Date())

  const targetMs = minutes ? minutes * 60_000 : null
  const running = phase === 'running' && !paused

  // Libros elegibles: los que se están leyendo, más el que vino por la URL
  const candidates = books.filter((b) => b.status === 'reading' || b.id === params.get('libro'))
  const book = books.find((b) => b.id === bookId) ?? null

  const now = () =>
    accumulated.current + (segmentStart.current ? Date.now() - segmentStart.current : 0)

  const pause = () => {
    accumulated.current = now()
    segmentStart.current = null
    setElapsed(accumulated.current)
    setPaused(true)
  }

  const resume = () => {
    segmentStart.current = Date.now()
    setPaused(false)
  }

  const start = () => {
    ambience.prime()
    accumulated.current = 0
    segmentStart.current = Date.now()
    setStartedAt(new Date())
    setElapsed(0)
    setPaused(false)
    setPhase('running')
  }

  const finish = () => {
    if (segmentStart.current) pause()
    setPhase('finish')
    exitFullscreen()
  }

  const onTick = useEffectEvent(() => {
    const e = now()
    setElapsed(e)
    if (targetMs && e >= targetMs) {
      ambience.chime()
      finish()
    }
  })

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(onTick, 250)
    return () => window.clearInterval(id)
  }, [running])

  useWakeLock(running)

  const [fullscreen, setFullscreen] = useState(false)
  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen?.().catch(() => {})
  }

  // ------------------------------------------------------------------ Vistas

  if (phase === 'running') {
    return (
      <div className="reading-session-div-1">
        {dimOn && <DimOverlay level={dim} />}
        <div className="reading-session-div-2">
          <div className="reading-session-div-3">
            <LotusIcon className="reading-session-lotusicon-4" />
            {book ? (
              <>
                <p className="reading-session-p-5">{book.title}</p>
                <p className="texto-secundario">{authorsLabel(book.authors)}</p>
              </>
            ) : (
              <p className="reading-session-p-7">Tiempo de lectura</p>
            )}
          </div>

          <FocusRing elapsedMs={elapsed} targetMs={targetMs} paused={paused} />

          <div className="reading-session-div-8">
            {paused ? (
              <Button size="lg" onClick={resume} aria-label="Reanudar">
                <Play /> Reanudar
              </Button>
            ) : (
              <Button size="lg" variant="outline" onClick={pause} aria-label="Pausar">
                <Pause /> Pausar
              </Button>
            )}
            <Button size="lg" variant="ghost" onClick={finish}>
              <Square /> Terminar
            </Button>
          </div>

          <DecoDivider className="reading-session-decodivider-9" />

          {/* Controles sensoriales rápidos */}
          <div className="reading-session-div-10">
            <div className="reading-session-div-11">
              {AMBIENCES.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => ambience.toggle(id)}
                  aria-pressed={ambience.playing.includes(id)}
                  className={cn(
                    'reading-session-button-12',
                    ambience.playing.includes(id)
                      ? 'chip--activo'
                      : 'reading-session-button-14',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="reading-session-div-8">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDimOn(!dimOn)}
                aria-pressed={dimOn}
                aria-label="Atenuar brillo"
                className={cn(dimOn && 'reading-session-button-15')}
              >
                <SunDim />
              </Button>
              <Slider
                value={[dim * 100]}
                onValueChange={([v]) => {
                  setDim(v / 100)
                  setDimOn(true)
                }}
                max={80}
                step={1}
                aria-label="Nivel de atenuación"
              />
              {document.fullscreenEnabled && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFullscreen}
                  aria-label={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                >
                  {fullscreen ? <Minimize /> : <Maximize />}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'finish') {
    return (
      <FinishForm
        uid={uid}
        book={book}
        elapsedMs={elapsed}
        startedAt={startedAt}
        moodBefore={moodBefore}
        hasMoodToday={moods.data.some((m) => m.date === dayKey())}
        ambience={ambience.playing}
        onDiscard={() => setPhase('setup')}
        onSaved={(s) => {
          setSummary(s)
          setPhase('done')
        }}
      />
    )
  }

  if (phase === 'done' && summary) {
    return (
      <div className="reading-session-div-16">
        <LotusIcon className="reading-session-lotusicon-17" />
        <h1 className="deco-title reading-session-h1-18">Sesión guardada</h1>
        <DecoDivider className="reading-session-decodivider-19" />
        <p className="reading-session-p-20">
          {formatMinutes(summary.minutes)} de lectura
          {summary.pages ? ` · ${summary.pages} páginas` : ''}
        </p>
        <div className="reading-session-div-21">
          <Button onClick={() => setPhase('setup')}>Otra sesión</Button>
          {book && (
            <Button asChild variant="outline">
              <Link to={`/libro/${book.id}`}>Ver el libro</Link>
            </Button>
          )}
          <Button asChild variant="ghost">
            <Link to="/">Al santuario</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Configuración
  return (
    <div>
      <PageHeader eyebrow="Digital detox" title="Sesión de lectura" />
      <div className="reading-session-div-22">
        <div className="reading-session-div-23">
          <section className="deco-card reading-session-section-24">
            <h2 className="deco-eyebrow">¿Qué vas a leer?</h2>
            <div className="reading-session-div-25">
              <button
                type="button"
                onClick={() => setBookId(null)}
                aria-pressed={bookId === null}
                className={cn(
                  'reading-session-button-26',
                  bookId === null && 'reading-session-button-27',
                )}
              >
                Sin libro
              </button>
              {candidates.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBookId(b.id)}
                  aria-pressed={bookId === b.id}
                  aria-label={b.title}
                  title={b.title}
                  className={cn(
                    'reading-session-button-28',
                    bookId === b.id ? 'reading-session-button-29' : 'reading-session-button-30',
                  )}
                >
                  <BookCover book={b} className="reading-session-bookcover-31" />
                </button>
              ))}
            </div>
            {book && <p className="reading-session-p-32">{book.title}</p>}
            {candidates.length === 0 && (
              <p className="texto-nota">
                Marcá un libro como “Leyendo” en tu{' '}
                <Link to="/biblioteca" className="reading-session-link-34">
                  biblioteca
                </Link>{' '}
                para elegirlo acá.
              </p>
            )}
          </section>

          <section className="deco-card reading-session-section-24">
            <h2 className="deco-eyebrow">Focus Timer</h2>
            <div className="reading-session-div-35">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setMinutes(p)}
                  aria-pressed={minutes === p}
                  className={cn(
                    'reading-session-button-36',
                    minutes === p ? 'chip--activo' : 'reading-session-button-14',
                  )}
                >
                  {p}′
                </button>
              ))}
              <button
                type="button"
                onClick={() => setMinutes(null)}
                aria-pressed={minutes === null}
                className={cn(
                  'reading-session-button-37',
                  minutes === null ? 'chip--activo' : 'reading-session-button-14',
                )}
              >
                Libre
              </button>
            </div>
            <div className="reading-session-div-38">
              <div className="reading-session-div-39">
                <span className="reading-session-span-40">
                  <SunDim className="icono-dorado" /> Atenuación de brillo
                </span>
                <span className="reading-session-span-42">{Math.round(dim * 100)}%</span>
              </div>
              <Slider
                value={[dim * 100]}
                onValueChange={([v]) => {
                  setDim(v / 100)
                  setDimOn(v > 0)
                }}
                max={80}
                step={1}
                aria-label="Nivel de atenuación"
              />
            </div>
          </section>

          <section className="deco-card reading-session-section-24">
            <h2 className="deco-eyebrow">¿Cómo llegás a la lectura?</h2>
            <MoodPicker value={moodBefore} onChange={setMoodBefore} compact />
          </section>
        </div>

        <div className="reading-session-div-23">
          <section className="deco-card reading-session-section-24">
            <h2 className="deco-eyebrow">Microambiente</h2>
            <AmbienceMixer showMaster />
          </section>
          <Button size="lg" className="reading-session-decodivider-9" onClick={start}>
            <Play /> Comenzar {minutes ? `${minutes} minutos` : 'sesión libre'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function exitFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
}

function FinishForm({
  uid,
  book,
  elapsedMs,
  startedAt,
  moodBefore,
  hasMoodToday,
  ambience,
  onDiscard,
  onSaved,
}: {
  uid: string
  book: Book | null
  elapsedMs: number
  startedAt: Date
  moodBefore: MoodValue | null
  hasMoodToday: boolean
  ambience: ReturnType<typeof useAmbience>['playing']
  onDiscard: () => void
  onSaved: (summary: { minutes: number; pages: number | null }) => void
}) {
  const [page, setPage] = useState(book ? String(book.currentPage) : '')
  const [moodAfter, setMoodAfter] = useState<MoodValue | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const durationMin = Math.round((elapsedMs / 60_000) * 10) / 10

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      let pagesRead: number | null = null
      if (book) {
        const max = book.pageCount ?? Infinity
        const newPage = Math.max(0, Math.min(Math.round(Number(page)) || 0, max))
        pagesRead = newPage > book.currentPage ? newPage - book.currentPage : null
        if (newPage !== book.currentPage) await updateBook(uid, book.id, { currentPage: newPage })
        if (book.pageCount && newPage >= book.pageCount && book.status !== 'read') {
          await setBookStatus(uid, book, 'read')
          if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            void confetti({ particleCount: 120, spread: 75, colors: ['#d4b37a', '#b9a7e8', '#ece8f7'] })
          }
        } else if (book.status === 'want') {
          await setBookStatus(uid, book, 'reading')
        }
      }

      await addSession(uid, {
        bookId: book?.id ?? null,
        bookTitle: book?.title ?? null,
        startedAt,
        durationMin,
        pagesRead,
        ambience,
        moodBefore,
        moodAfter,
      })
      // Si hoy aún no registraste el ánimo, el de después de leer cuenta como el del día
      if (moodAfter && !hasMoodToday) await saveMood(uid, moodAfter)

      onSaved({ minutes: durationMin, pages: pagesRead })
    } catch (err) {
      console.error(err)
      setError('No se pudo guardar la sesión. Intentá de nuevo.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="reading-session-form-43">
      <PageHeader eyebrow="Fin de la sesión" title={formatMinutes(durationMin)} />

      {book && (
        <section className="deco-card reading-session-section-44">
          <BookCover book={book} className="reading-session-bookcover-45" />
          <div className="reading-session-div-46">
            <Label htmlFor="page">¿En qué página quedaste?</Label>
            <Input
              id="page"
              type="number"
              min={0}
              max={book.pageCount ?? undefined}
              inputMode="numeric"
              value={page}
              onChange={(e) => setPage(e.target.value)}
              className="reading-session-input-47"
            />
            {book.pageCount && <p className="texto-nota">de {book.pageCount}</p>}
          </div>
        </section>
      )}

      <section className="deco-card reading-session-section-24">
        <h2 className="deco-eyebrow">¿Cómo te sentís ahora?</h2>
        <MoodPicker value={moodAfter} onChange={setMoodAfter} />
      </section>

      {error && (
        <p role="alert" className="texto-error">
          {error}
        </p>
      )}

      <div className="reading-session-div-49">
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? <Loader2 className="girar" /> : <Check />} Guardar sesión
        </Button>
        <Button type="button" variant="ghost" size="lg" onClick={onDiscard} disabled={saving}>
          Descartar
        </Button>
      </div>
    </form>
  )
}
