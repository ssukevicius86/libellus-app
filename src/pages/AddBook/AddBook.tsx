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
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/biblioteca">
          <ArrowLeft /> Biblioteca
        </Link>
      </Button>
      <PageHeader eyebrow="Nuevo en tus estantes" title="Agregar libro" />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Agregar como:</span>
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            aria-pressed={status === s}
            className={cn(
              'rounded-full border px-3 py-1 text-sm transition-colors',
              status === s ? 'border-gold bg-gold/10 text-gold' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {error}
        </p>
      )}

      <Tabs defaultValue="search">
        <TabsList>
          <TabsTrigger value="search">Buscar</TabsTrigger>
          <TabsTrigger value="manual">Cargar a mano</TabsTrigger>
        </TabsList>
        <TabsContent value="search" className="pt-4">
          <SearchPanel owned={owned} saving={saving} onAdd={(b) => save(b, b.googleId ?? b.title)} />
        </TabsContent>
        <TabsContent value="manual" className="pt-4">
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
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Título, autor o ISBN"
          aria-label="Buscar libros"
          autoFocus
        />
        <Button type="submit" disabled={searching || !q.trim()}>
          {searching ? <Loader2 className="animate-spin" /> : <Search />}
          <span className="hidden sm:inline">Buscar</span>
        </Button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {results && results.length === 0 && (
        <p className="text-sm text-muted-foreground">Sin resultados. Probá con otras palabras.</p>
      )}

      {results && results.length > 0 && (
        <ul className="divide-y rounded-lg border bg-card/60">
          {results.map((r) => {
            const inLibrary = owned.has(r.googleId)
            const key = r.googleId ?? r.title
            return (
              <li key={key} className="flex items-center gap-4 p-3">
                <BookCover book={r} className="w-12" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium">{r.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {authorsLabel(r.authors)}
                    {r.publishedYear && ` · ${r.publishedYear}`}
                    {r.pageCount && ` · ${r.pageCount} pág.`}
                  </p>
                </div>
                {inLibrary ? (
                  <span className="flex items-center gap-1 text-xs text-gold">
                    <Check className="size-4" /> En tu biblioteca
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={saving !== null}
                    onClick={() => onAdd(r)}
                    aria-label={`Agregar ${r.title}`}
                  >
                    {saving === key ? <Loader2 className="animate-spin" /> : <Plus />}
                    <span className="hidden sm:inline">Agregar</span>
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
    <form onSubmit={handleSubmit} className="deco-card grid max-w-xl gap-4 p-5 sm:p-6">
      <div className="grid gap-2">
        <Label htmlFor="title">Título *</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={300} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="authors">Autores</Label>
        <Input
          id="authors"
          value={authors}
          onChange={(e) => setAuthors(e.target.value)}
          placeholder="Separados por coma"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <div className="grid gap-2">
          <Label htmlFor="pages">Páginas</Label>
          <Input id="pages" type="number" min={1} inputMode="numeric" value={pages} onChange={(e) => setPages(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="cover">URL de portada (https)</Label>
          <Input id="cover" type="url" value={cover} onChange={(e) => setCover(e.target.value)} placeholder="https://…" />
        </div>
      </div>
      <Button type="submit" disabled={saving || !title.trim()} className="justify-self-start">
        {saving ? <Loader2 className="animate-spin" /> : <Plus />} Guardar libro
      </Button>
    </form>
  )
}
