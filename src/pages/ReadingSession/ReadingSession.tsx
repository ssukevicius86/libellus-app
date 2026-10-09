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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'

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
      <div className="fixed inset-0 z-40 overflow-y-auto bg-background">
        {dimOn && <DimOverlay level={dim} />}
        <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-8 px-6 py-10">
          <div className="text-center">
            <LotusIcon className="mx-auto mb-3 h-7 text-gold" />
            {book ? (
              <>
                <p className="font-serif text-2xl leading-tight">{book.title}</p>
                <p className="text-sm text-muted-foreground">{authorsLabel(book.authors)}</p>
              </>
            ) : (
              <p className="font-serif text-2xl italic">Tiempo de lectura</p>
            )}
          </div>

          <FocusRing elapsedMs={elapsed} targetMs={targetMs} paused={paused} />

          <div className="flex items-center gap-3">
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

          <DecoDivider className="w-full" />

          {/* Controles sensoriales rápidos */}
          <div className="w-full space-y-4">
            <div className="flex justify-center gap-2">
              {AMBIENCES.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => ambience.toggle(id)}
                  aria-pressed={ambience.playing.includes(id)}
                  className={cn(
                    'rounded-full border px-4 py-1.5 text-sm transition-colors',
                    ambience.playing.includes(id)
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDimOn(!dimOn)}
                aria-pressed={dimOn}
                aria-label="Atenuar brillo"
                className={cn(dimOn && 'text-gold')}
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
      <div className="mx-auto flex max-w-md flex-col items-center gap-5 py-10 text-center">
        <LotusIcon className="h-10 text-gold" />
        <h1 className="deco-title text-2xl font-light">Sesión guardada</h1>
        <DecoDivider className="w-40" />
        <p className="font-serif text-xl italic text-foreground/85">
          {formatMinutes(summary.minutes)} de lectura
          {summary.pages ? ` · ${summary.pages} páginas` : ''}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
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
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <section className="deco-card space-y-4 p-5">
            <h2 className="deco-eyebrow">¿Qué vas a leer?</h2>
            <div className="flex gap-3 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setBookId(null)}
                aria-pressed={bookId === null}
                className={cn(
                  'flex aspect-[2/3] w-20 shrink-0 items-center justify-center rounded-md border p-2 text-center text-xs text-muted-foreground',
                  bookId === null && 'border-gold text-gold ring-1 ring-gold',
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
                    'shrink-0 rounded-md transition-opacity',
                    bookId === b.id ? 'ring-2 ring-gold ring-offset-2 ring-offset-card' : 'opacity-60 hover:opacity-100',
                  )}
                >
                  <BookCover book={b} className="w-20" />
                </button>
              ))}
            </div>
            {book && <p className="text-sm">{book.title}</p>}
            {candidates.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Marcá un libro como “Leyendo” en tu{' '}
                <Link to="/biblioteca" className="underline underline-offset-4">
                  biblioteca
                </Link>{' '}
                para elegirlo acá.
              </p>
            )}
          </section>

          <section className="deco-card space-y-4 p-5">
            <h2 className="deco-eyebrow">Focus Timer</h2>
            <div className="grid grid-cols-5 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setMinutes(p)}
                  aria-pressed={minutes === p}
                  className={cn(
                    'rounded-md border py-2 text-sm tabular-nums transition-colors',
                    minutes === p ? 'border-gold bg-gold/10 text-gold' : 'text-muted-foreground hover:text-foreground',
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
                  'rounded-md border py-2 text-sm transition-colors',
                  minutes === null ? 'border-gold bg-gold/10 text-gold' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Libre
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <SunDim className="size-4 text-gold" /> Atenuación de brillo
                </span>
                <span className="tabular-nums text-muted-foreground">{Math.round(dim * 100)}%</span>
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

          <section className="deco-card space-y-4 p-5">
            <h2 className="deco-eyebrow">¿Cómo llegás a la lectura?</h2>
            <MoodPicker value={moodBefore} onChange={setMoodBefore} compact />
          </section>
        </div>

        <div className="space-y-6">
          <section className="deco-card space-y-4 p-5">
            <h2 className="deco-eyebrow">Microambiente</h2>
            <AmbienceMixer showMaster />
          </section>
          <Button size="lg" className="w-full" onClick={start}>
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
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-6">
      <PageHeader eyebrow="Fin de la sesión" title={formatMinutes(durationMin)} />

      {book && (
        <section className="deco-card flex items-center gap-4 p-5">
          <BookCover book={book} className="w-14" />
          <div className="grid flex-1 gap-1.5">
            <Label htmlFor="page">¿En qué página quedaste?</Label>
            <Input
              id="page"
              type="number"
              min={0}
              max={book.pageCount ?? undefined}
              inputMode="numeric"
              value={page}
              onChange={(e) => setPage(e.target.value)}
              className="w-32"
            />
            {book.pageCount && <p className="text-xs text-muted-foreground">de {book.pageCount}</p>}
          </div>
        </section>
      )}

      <section className="deco-card space-y-4 p-5">
        <h2 className="deco-eyebrow">¿Cómo te sentís ahora?</h2>
        <MoodPicker value={moodAfter} onChange={setMoodAfter} />
      </section>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Check />} Guardar sesión
        </Button>
        <Button type="button" variant="ghost" size="lg" onClick={onDiscard} disabled={saving}>
          Descartar
        </Button>
      </div>
    </form>
  )
}
