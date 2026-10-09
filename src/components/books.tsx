import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { authorsLabel, bookProgress, STATUS_LABELS, type Book } from '@/lib/books'
import { cn } from '@/lib/utils'
import { LotusIcon } from '@/components/deco'
import { Progress } from '@/components/ui/progress'

type CoverBook = Pick<Book, 'title' | 'authors' | 'coverUrl'>

/** Portada del libro o, si no hay, una portada art déco con el título. */
export function BookCover({ book, className }: { book: CoverBook; className?: string }) {
  return (
    <div
      className={cn(
        'relative aspect-[2/3] shrink-0 overflow-hidden rounded-md border bg-secondary shadow-md shadow-black/20',
        className,
      )}
    >
      {book.coverUrl ? (
        <img
          src={book.coverUrl}
          alt={`Portada de ${book.title}`}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="size-full object-cover"
        />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-2 bg-gradient-to-b from-accent to-secondary p-2 text-center">
          <div className="absolute inset-1.5 rounded-sm border border-gold/40" />
          <LotusIcon className="h-5 text-gold" />
          <span className="line-clamp-4 font-serif text-sm leading-tight">{book.title}</span>
        </div>
      )}
    </div>
  )
}

/** Tarjeta de la biblioteca. */
export function BookCard({ book }: { book: Book }) {
  const progress = bookProgress(book)
  return (
    <Link
      to={`/libro/${book.id}`}
      className="group flex flex-col gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <BookCover
        book={book}
        className="w-full transition-transform duration-300 group-hover:-translate-y-1"
      />
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-medium leading-snug">{book.title}</p>
        <p className="truncate text-xs text-muted-foreground">{authorsLabel(book.authors)}</p>
      </div>
      {book.status === 'reading' && (
        <div className="flex items-center gap-2">
          <Progress value={progress * 100} className="h-1" />
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {Math.round(progress * 100)}%
          </span>
        </div>
      )}
      {book.status === 'read' && book.rating && <Stars value={book.rating} size="sm" />}
    </Link>
  )
}

/** Fila compacta para "leyendo ahora". */
export function BookRow({ book, action }: { book: Book; action?: ReactNode }) {
  const progress = bookProgress(book)
  return (
    <div className="flex items-center gap-4">
      <Link to={`/libro/${book.id}`} className="shrink-0">
        <BookCover book={book} className="w-16" />
      </Link>
      <div className="min-w-0 flex-1 space-y-1.5">
        <Link to={`/libro/${book.id}`} className="block">
          <p className="line-clamp-2 font-medium leading-snug">{book.title}</p>
          <p className="truncate text-xs text-muted-foreground">{authorsLabel(book.authors)}</p>
        </Link>
        <div className="flex items-center gap-2">
          <Progress value={progress * 100} className="h-1.5" />
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {book.pageCount ? `${book.currentPage}/${book.pageCount}` : `pág. ${book.currentPage}`}
          </span>
        </div>
      </div>
      {action}
    </div>
  )
}

export function Stars({
  value,
  onChange,
  size = 'md',
}: {
  value: number | null
  onChange?: (v: number) => void
  size?: 'sm' | 'md'
}) {
  const cls = size === 'sm' ? 'text-sm' : 'text-2xl'
  if (!onChange) {
    return (
      <span className={cn('tracking-wider text-gold', cls)} aria-label={`${value ?? 0} de 5`}>
        {'★'.repeat(value ?? 0)}
        <span className="opacity-25">{'★'.repeat(5 - (value ?? 0))}</span>
      </span>
    )
  }
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Valoración">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} estrella${n > 1 ? 's' : ''}`}
          onClick={() => onChange(n)}
          className={cn(
            'rounded transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring',
            cls,
            value && n <= value ? 'text-gold' : 'text-muted-foreground/30',
          )}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export function StatusBadge({ status }: { status: Book['status'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        status === 'reading' && 'border-primary/40 bg-primary/10 text-primary',
        status === 'want' && 'border-border text-muted-foreground',
        status === 'read' && 'border-gold/40 bg-gold/10 text-gold',
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
