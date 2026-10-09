import { createContext, useContext } from 'react'
import type { AmbienceId } from '@/lib/ambience'

export interface AmbienceContextValue {
  playing: AmbienceId[]
  volumes: Record<AmbienceId, number>
  masterVolume: number
  toggle: (id: AmbienceId) => void
  setVolume: (id: AmbienceId, volume: number) => void
  setMasterVolume: (volume: number) => void
  stopAll: () => void
  /** Llamar desde un gesto del usuario para habilitar `chime` más tarde. */
  prime: () => void
  chime: () => void
}

export const AmbienceContext = createContext<AmbienceContextValue | null>(null)

export function useAmbience(): AmbienceContextValue {
  const ctx = useContext(AmbienceContext)
  if (!ctx) throw new Error('useAmbience debe usarse dentro de <AmbienceProvider>')
  return ctx
}
