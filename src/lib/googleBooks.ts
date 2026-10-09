import type { NewBook } from '@/lib/books'

export type BookSearchResult = Omit<NewBook, 'status'> & { publishedYear: string | null }

interface VolumeInfo {
  title?: string
  subtitle?: string
  authors?: string[]
  pageCount?: number
  description?: string
  publishedDate?: string
  imageLinks?: { thumbnail?: string; smallThumbnail?: string }
}

interface VolumesResponse {
  items?: { id: string; volumeInfo: VolumeInfo }[]
}

const API = 'https://www.googleapis.com/books/v1/volumes'

/** Busca en la API pública de Google Books (sin clave; con cuota limitada por IP). */
export async function searchBooks(q: string, signal?: AbortSignal): Promise<BookSearchResult[]> {
  const params = new URLSearchParams({ q, maxResults: '20', printType: 'books' })
  const res = await fetch(`${API}?${params}`, { signal })
  if (!res.ok) throw new Error(`Google Books respondió ${res.status}`)
  const data = (await res.json()) as VolumesResponse

  return (data.items ?? []).map(({ id, volumeInfo: v }) => {
    const thumb = v.imageLinks?.thumbnail ?? v.imageLinks?.smallThumbnail
    return {
      googleId: id,
      title: v.subtitle ? `${v.title ?? ''}: ${v.subtitle}` : (v.title ?? 'Sin título'),
      authors: v.authors ?? [],
      pageCount: v.pageCount || null,
      description: v.description ? v.description.slice(0, 1500) : null,
      publishedYear: v.publishedDate?.slice(0, 4) ?? null,
      // Google entrega http y una curva de página; se fuerza https y sin efecto
      coverUrl: thumb ? thumb.replace(/^http:/, 'https:').replace('&edge=curl', '') : null,
    }
  })
}
