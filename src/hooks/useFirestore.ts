import { useEffect, useState } from 'react'
import {
  onSnapshot,
  type DocumentReference,
  type Query,
} from 'firebase/firestore'

interface State<T, S> {
  source: S | null
  data: T
  error: Error | null
}

// serverTimestamp() pendientes se estiman en local para que orderBy y fechas no salgan null
const SNAPSHOT_OPTIONS = { serverTimestamps: 'estimate' } as const

/**
 * Escucha una query en tiempo real. La query debe estar memorizada (useMemo):
 * cada referencia nueva abre una suscripción nueva.
 */
export function useCollection<T extends { id: string }>(q: Query | null) {
  const [state, setState] = useState<State<T[], Query>>({ source: null, data: [], error: null })

  useEffect(() => {
    if (!q) return
    return onSnapshot(
      q,
      (snap) =>
        setState({
          source: q,
          data: snap.docs.map((d) => ({ id: d.id, ...d.data(SNAPSHOT_OPTIONS) }) as T),
          error: null,
        }),
      (error) => {
        console.error('Error escuchando la colección', error)
        setState({ source: q, data: [], error })
      },
    )
  }, [q])

  const current = q !== null && state.source === q
  return {
    data: current ? state.data : [],
    loading: q !== null && !current,
    error: current ? state.error : null,
  }
}

/** Igual que useCollection pero para un documento; `data` es null si no existe. */
export function useDocument<T extends { id: string }>(ref: DocumentReference | null) {
  const [state, setState] = useState<State<T | null, DocumentReference>>({
    source: null,
    data: null,
    error: null,
  })

  useEffect(() => {
    if (!ref) return
    return onSnapshot(
      ref,
      (snap) =>
        setState({
          source: ref,
          data: snap.exists() ? ({ id: snap.id, ...snap.data(SNAPSHOT_OPTIONS) } as T) : null,
          error: null,
        }),
      (error) => {
        console.error('Error escuchando el documento', error)
        setState({ source: ref, data: null, error })
      },
    )
  }, [ref])

  const current = ref !== null && state.source === ref
  return {
    data: current ? state.data : null,
    loading: ref !== null && !current,
    error: current ? state.error : null,
  }
}
