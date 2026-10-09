import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import confetti from 'canvas-confetti'
import { ArrowLeft, BookOpen, Loader2, Trash2 } from 'lucide-react'
import { useBook, useBookSessions, useUid } from '@/hooks/useLibrary'
import {
  authorsLabel,
  bookProgress,
  deleteBook,
  setBookStatus,
  STATUS_LABELS,
  updateBook,
  type Book,
  type BookStatus,
} from '@/lib/books'
import { MOOD_LABELS, type MoodValue } from '@/lib/moods'
import { formatMinutes } from '@/lib/stats'
import { cn } from '@/lib/utils'
import { BookCover, Stars, StatusBadge } from '@/components/books'
import { DecoDivider } from '@/components/deco'
import { MoodIcon } from '@/components/mood'
import { Button } from '@/components/ui/button/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog/dialog'
import { Input } from '@/components/ui/input/input'
import { Label } from '@/components/ui/label/label'
import { Progress } from '@/components/ui/progress/progress'
import { Textarea } from '@/components/ui/textarea/textarea'
import './BookDetail.css'

const STATUSES: BookStatus[] = ['want', 'reading', 'read']
const dateFmt = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' })

function celebrate() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  void confetti({
    particleCount: 120,
    spread: 75,
    origin: { y: 0.7 },
    colors: ['#d4b37a', '#b9a7e8', '#ece8f7', '#8f74e0'],
  })
}

export default function BookDetail() {
  const { id } = useParams()
  const { data: book, loading } = useBook(id)

  if (loading) return <p className="book-detail-p-1">Cargando…</p>
  if (!book) {
    return (
      <div className="book-detail-div-2">
        <p className="texto-vacio">Este libro ya no está en tu biblioteca.</p>
        <Button asChild variant="outline">
          <Link to="/biblioteca">Volver a la biblioteca</Link>
        </Button>
      </div>
    )
  }
  return <BookView book={book} />
}

function BookView({ book }: { book: Book }) {
  const uid = useUid()
  const progress = bookProgress(book)

  const changeStatus = async (status: BookStatus) => {
    if (status === book.status) return
    await setBookStatus(uid, book, status)
    if (status === 'read') celebrate()
  }

  return (
    <div className="book-detail-div-4">
      <Button asChild variant="ghost" size="sm" className="book-detail-button-5">
        <Link to="/biblioteca">
          <ArrowLeft /> Biblioteca
        </Link>
      </Button>

      <section className="book-detail-section-6">
        <BookCover book={book} className="book-detail-bookcover-7" />
        <div className="book-detail-div-8">
          <div className="book-detail-div-9">
            <StatusBadge status={book.status} />
            <h1 className="book-detail-h1-10">{book.title}</h1>
            <p className="book-detail-p-1">{authorsLabel(book.authors)}</p>
          </div>

          <div className="book-detail-div-11" role="group" aria-label="Estado de lectura">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void changeStatus(s)}
                aria-pressed={book.status === s}
                className={cn(
                  'chip',
                  book.status === s
                    ? 'chip--activo'
                    : 'book-detail-button-14',
                )}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          <div className="book-detail-div-15">
            <p className="texto-nota">Tu valoración</p>
            <Stars value={book.rating} onChange={(rating) => void updateBook(uid, book.id, { rating })} />
          </div>

          <Button asChild size="lg">
            <Link to={`/sesion?libro=${book.id}`}>
              <BookOpen /> Leer ahora
            </Link>
          </Button>
        </div>
      </section>

      <section className="deco-card book-detail-section-17">
        <div className="book-detail-div-18">
          <h2 className="deco-eyebrow">Progreso</h2>
          <span className="book-detail-span-19">{Math.round(progress * 100)}%</span>
        </div>
        <Progress value={progress * 100} />
        <ProgressEditor key={`${book.currentPage}-${book.pageCount}`} book={book} onFinished={celebrate} />
        <p className="texto-nota">
          {book.startedAt && `Empezado el ${dateFmt.format(book.startedAt.toDate())}`}
          {book.finishedAt && ` · Terminado el ${dateFmt.format(book.finishedAt.toDate())}`}
        </p>
      </section>

      <NotesEditor key={book.id} book={book} />

      {book.description && (
        <section className="book-detail-div-9">
          <h2 className="deco-eyebrow">Sinopsis</h2>
          <p className="book-detail-p-20">{book.description}</p>
        </section>
      )}

      <SessionsList bookId={book.id} />

      <DecoDivider />
      <DeleteBook book={book} />
    </div>
  )
}

function ProgressEditor({ book, onFinished }: { book: Book; onFinished: () => void }) {
  const uid = useUid()
  const [page, setPage] = useState(String(book.currentPage))
  const [total, setTotal] = useState(book.pageCount ? String(book.pageCount) : '')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const pageCount = Math.round(Number(total)) > 0 ? Math.round(Number(total)) : null
    const currentPage = Math.max(0, Math.min(Math.round(Number(page)) || 0, pageCount ?? Infinity))
    setSaving(true)
    try {
      await updateBook(uid, book.id, { currentPage, pageCount })
      if (pageCount && currentPage >= pageCount && book.status !== 'read') {
        await setBookStatus(uid, { ...book, pageCount }, 'read')
        onFinished()
      } else if (currentPage > 0 && book.status === 'want') {
        await setBookStatus(uid, book, 'reading')
      }
    } finally {
      setSaving(false)
    }
  }

  const dirty = page !== String(book.currentPage) || total !== (book.pageCount ? String(book.pageCount) : '')

  return (
    <form onSubmit={handleSubmit} className="book-detail-form-21">
      <div className="book-detail-div-22">
        <Label htmlFor="page">Página actual</Label>
        <Input id="page" type="number" min={0} inputMode="numeric" value={page} onChange={(e) => setPage(e.target.value)} className="book-detail-input-23" />
      </div>
      <div className="book-detail-div-22">
        <Label htmlFor="total">de</Label>
        <Input id="total" type="number" min={1} inputMode="numeric" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="total" className="book-detail-input-23" />
      </div>
      <Button type="submit" variant="outline" disabled={!dirty || saving}>
        {saving && <Loader2 className="girar" />} Actualizar
      </Button>
    </form>
  )
}

function NotesEditor({ book }: { book: Book }) {
  const uid = useUid()
  const [notes, setNotes] = useState(book.notes)
  const [saved, setSaved] = useState(book.notes)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await updateBook(uid, book.id, { notes })
      setSaved(notes)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="book-detail-section-25">
      <h2 className="deco-eyebrow">Notas y citas</h2>
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Frases que te quedaron, ideas, lo que te hizo sentir…"
        rows={5}
        maxLength={20000}
        className="book-detail-textarea-26"
        aria-label="Notas y citas"
      />
      <Button variant="outline" size="sm" onClick={() => void save()} disabled={notes === saved || saving}>
        {saving && <Loader2 className="girar" />}
        {notes === saved ? 'Guardado' : 'Guardar notas'}
      </Button>
    </section>
  )
}

function SessionsList({ bookId }: { bookId: string }) {
  const { data: sessions, loading } = useBookSessions(bookId)
  if (loading || sessions.length === 0) return null
  const total = sessions.reduce((sum, s) => sum + s.durationMin, 0)

  return (
    <section className="book-detail-section-25">
      <div className="book-detail-div-27">
        <h2 className="deco-eyebrow">Sesiones de lectura</h2>
        <span className="texto-nota">{formatMinutes(total)} en total</span>
      </div>
      <ul className="lista-tarjeta">
        {sessions.map((s) => (
          <li key={s.id} className="book-detail-li-29">
            <span>{dateFmt.format(s.startedAt.toDate())}</span>
            <span className="book-detail-span-30">
              {s.pagesRead ? <span>{s.pagesRead} pág.</span> : null}
              <span className="book-detail-span-31">{formatMinutes(s.durationMin)}</span>
              {s.moodAfter && (
                <span className="book-detail-span-32" title={MOOD_LABELS[s.moodAfter as MoodValue]}>
                  <MoodIcon mood={s.moodAfter as MoodValue} className="icono-dorado" />
                  <span className="book-detail-span-34">{MOOD_LABELS[s.moodAfter as MoodValue]}</span>
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function DeleteBook({ book }: { book: Book }) {
  const uid = useUid()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteBook(uid, book.id)
      navigate('/biblioteca', { replace: true })
    } catch (err) {
      console.error(err)
      setDeleting(false)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="book-detail-button-35">
          <Trash2 /> Quitar de la biblioteca
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Quitar «{book.title}»?</DialogTitle>
          <DialogDescription>
            Se borran el progreso, la valoración y las notas. Las sesiones de lectura quedan en tu historial.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
            {deleting && <Loader2 className="girar" />} Quitar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
