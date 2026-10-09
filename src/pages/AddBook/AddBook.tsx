import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowLeft, Check, Loader2, Plus, Search } from 'lucide-react'
import { useBooks, useUid } from '@/hooks/useLibrary'
import { addBook, authorsLabel, STATUS_LABELS, type BookStatus, type NewBook } from '@/lib/books'
import { searchBooks, type BookSearchResult } from '@/lib/googleBooks'
import { cn } from '@/lib/utils'
import { BookCover } from '@/components/books'
import { PageHeader } from '@/components/deco'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import './AddBook.css'

const STATUSES: BookStatus[] = ['want', 'reading', 'read']

export default function AddBook() {
  const uid = useUid()
  const navigate = useNavigate()
  const { data: books } = useBooks()
  const [status, setStatus] = useState<BookStatus>('want')
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const owned = new Set(books.map((b) => b.googleId).filter(Boolean))

  const save = async (book: Omit<NewBook, 'status'>, key: string) => {
    setSaving(key)
    setError(null)
    try {
      const id = await addBook(uid, { ...book, status })
      navigate(`/libro/${id}`)
    } catch (err) {
      console.error(err)
      setError('No se pudo guardar el libro. Intentá de nuevo.')
      setSaving(null)
    }
  }

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="add-book-button-1">
        <Link to="/biblioteca">
          <ArrowLeft /> Biblioteca
        </Link>
      </Button>
      <PageHeader eyebrow="Nuevo en tus estantes" title="Agregar libro" />

      <div className="add-book-div-2">
        <span className="add-book-span-3">Agregar como:</span>
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            aria-pressed={status === s}
            className={cn(
              'add-book-button-4',
              status === s ? 'add-book-button-5' : 'add-book-button-6',
            )}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="add-book-p-7">
          {error}
        </p>
      )}

      <Tabs defaultValue="search">
        <TabsList>
          <TabsTrigger value="search">Buscar</TabsTrigger>
          <TabsTrigger value="manual">Cargar a mano</TabsTrigger>
        </TabsList>
        <TabsContent value="search" className="add-book-tabscontent-8">
          <SearchPanel owned={owned} saving={saving} onAdd={(b) => save(b, b.googleId ?? b.title)} />
        </TabsContent>
        <TabsContent value="manual" className="add-book-tabscontent-8">
          <ManualForm saving={saving === 'manual'} onAdd={(b) => save(b, 'manual')} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SearchPanel({
  owned,
  saving,
  onAdd,
}: {
  owned: Set<string | null>
  saving: string | null
  onAdd: (book: BookSearchResult) => void
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<BookSearchResult[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abort = useRef<AbortController | null>(null)

  useEffect(() => () => abort.current?.abort(), [])

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault()
    const term = q.trim()
    if (!term) return
    abort.current?.abort()
    abort.current = new AbortController()
    setSearching(true)
    setError(null)
    try {
      setResults(await searchBooks(term, abort.current.signal))
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      console.error(err)
      setError(
        navigator.onLine
          ? 'La búsqueda falló. Probá de nuevo o cargá el libro a mano.'
          : 'Sin conexión. Podés cargar el libro a mano.',
      )
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="add-book-div-9">
      <form onSubmit={handleSearch} className="add-book-form-10">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Título, autor o ISBN"
          aria-label="Buscar libros"
          autoFocus
        />
        <Button type="submit" disabled={searching || !q.trim()}>
          {searching ? <Loader2 className="add-book-loader2-11" /> : <Search />}
          <span className="add-book-span-12">Buscar</span>
        </Button>
      </form>

      {error && <p className="add-book-p-13">{error}</p>}

      {results && results.length === 0 && (
        <p className="add-book-span-3">Sin resultados. Probá con otras palabras.</p>
      )}

      {results && results.length > 0 && (
        <ul className="add-book-ul-14">
          {results.map((r) => {
            const inLibrary = owned.has(r.googleId)
            const key = r.googleId ?? r.title
            return (
              <li key={key} className="add-book-li-15">
                <BookCover book={r} className="add-book-bookcover-16" />
                <div className="add-book-div-17">
                  <p className="add-book-p-18">{r.title}</p>
                  <p className="add-book-p-19">
                    {authorsLabel(r.authors)}
                    {r.publishedYear && ` · ${r.publishedYear}`}
                    {r.pageCount && ` · ${r.pageCount} pág.`}
                  </p>
                </div>
                {inLibrary ? (
                  <span className="add-book-span-20">
                    <Check className="add-book-check-21" /> En tu biblioteca
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={saving !== null}
                    onClick={() => onAdd(r)}
                    aria-label={`Agregar ${r.title}`}
                  >
                    {saving === key ? <Loader2 className="add-book-loader2-11" /> : <Plus />}
                    <span className="add-book-span-12">Agregar</span>
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function ManualForm({
  saving,
  onAdd,
}: {
  saving: boolean
  onAdd: (book: Omit<NewBook, 'status'>) => void
}) {
  const [title, setTitle] = useState('')
  const [authors, setAuthors] = useState('')
  const [pages, setPages] = useState('')
  const [cover, setCover] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const pageCount = Math.round(Number(pages))
    onAdd({
      title: title.trim(),
      authors: authors.split(',').map((a) => a.trim()).filter(Boolean),
      pageCount: pageCount > 0 ? pageCount : null,
      coverUrl: /^https:\/\//.test(cover.trim()) ? cover.trim() : null,
      googleId: null,
      description: null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="deco-card add-book-form-22">
      <div className="add-book-div-23">
        <Label htmlFor="title">Título *</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={300} />
      </div>
      <div className="add-book-div-23">
        <Label htmlFor="authors">Autores</Label>
        <Input
          id="authors"
          value={authors}
          onChange={(e) => setAuthors(e.target.value)}
          placeholder="Separados por coma"
        />
      </div>
      <div className="add-book-div-24">
        <div className="add-book-div-23">
          <Label htmlFor="pages">Páginas</Label>
          <Input id="pages" type="number" min={1} inputMode="numeric" value={pages} onChange={(e) => setPages(e.target.value)} />
        </div>
        <div className="add-book-div-23">
          <Label htmlFor="cover">URL de portada (https)</Label>
          <Input id="cover" type="url" value={cover} onChange={(e) => setCover(e.target.value)} placeholder="https://…" />
        </div>
      </div>
      <Button type="submit" disabled={saving || !title.trim()} className="add-book-button-25">
        {saving ? <Loader2 className="add-book-loader2-11" /> : <Plus />} Guardar libro
      </Button>
    </form>
  )
}
