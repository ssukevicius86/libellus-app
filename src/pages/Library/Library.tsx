import { useState } from 'react'
import { Link } from 'react-router'
import { BookPlus, Search } from 'lucide-react'
import { useBooks } from '@/hooks/useLibrary'
import { STATUS_LABELS, type BookStatus } from '@/lib/books'
import { BookCard } from '@/components/books'
import { PageHeader } from '@/components/deco'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import './Library.css'

type Filter = BookStatus | 'all'
const FILTERS: Filter[] = ['reading', 'want', 'read', 'all']

const normalize = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

export default function Library() {
  const { data: books, loading } = useBooks()
  const [filter, setFilter] = useState<Filter>('reading')
  const [q, setQ] = useState('')

  const counts = Object.fromEntries(
    FILTERS.map((f) => [f, f === 'all' ? books.length : books.filter((b) => b.status === f).length]),
  ) as Record<Filter, number>

  const needle = normalize(q.trim())
  const visible = books.filter(
    (b) =>
      (filter === 'all' || b.status === filter) &&
      (!needle || normalize(`${b.title} ${b.authors.join(' ')}`).includes(needle)),
  )

  return (
    <div>
      <PageHeader eyebrow="Tus estantes" title="Biblioteca">
        <Button asChild>
          <Link to="/biblioteca/agregar">
            <BookPlus /> Agregar libro
          </Link>
        </Button>
      </PageHeader>

      <div className="library-div-1">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="library-tabslist-2">
            {FILTERS.map((f) => (
              <TabsTrigger key={f} value={f} className="library-tabstrigger-3">
                {f === 'all' ? 'Todos' : STATUS_LABELS[f]}
                <span className="library-span-4">{counts[f]}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="library-div-5">
          <Search className="library-search-6" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por título o autor"
            aria-label="Buscar en la biblioteca"
            className="library-input-7"
          />
        </div>
      </div>

      {loading ? (
        <p className="library-p-8">Cargando…</p>
      ) : visible.length ? (
        <div className="library-div-9">
          {visible.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      ) : (
        <div className="deco-card library-div-10">
          <p className="library-p-11">
            {books.length === 0
              ? 'Tu biblioteca está esperando su primer libro.'
              : needle
                ? 'No hay libros que coincidan con la búsqueda.'
                : 'Este estante está vacío.'}
          </p>
          {books.length === 0 && (
            <Button asChild variant="outline">
              <Link to="/biblioteca/agregar">
                <BookPlus /> Agregar el primero
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
