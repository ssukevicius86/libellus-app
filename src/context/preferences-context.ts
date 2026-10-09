import { createContext, useContext } from 'react'

export type Theme = 'dark' | 'light'

export interface Preferences {
  theme: Theme
  /** Minutos por defecto del Focus Timer */
  focusMinutes: number
  /** Opacidad de la capa de atenuación (0–0.8) */
  dimLevel: number
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'dark',
  focusMinutes: 25,
  dimLevel: 0.35,
}

export interface PreferencesContextValue extends Preferences {
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void
}

export const PreferencesContext = createContext<PreferencesContextValue | null>(null)

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferences debe usarse dentro de <PreferencesProvider>')
  return ctx
}
