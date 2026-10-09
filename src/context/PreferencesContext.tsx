import { useEffect, useState, type ReactNode } from 'react'
import {
  DEFAULT_PREFERENCES,
  PreferencesContext,
  type Preferences,
} from './preferences-context'

// Misma clave que lee el script inline de index.html
const STORAGE_KEY = 'libellus:prefs'

function loadPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) } : DEFAULT_PREFERENCES
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(loadPreferences)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', prefs.theme === 'dark')
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', prefs.theme === 'dark' ? '#13122a' : '#f6f2ea')
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    } catch {
      // Sin almacenamiento (modo privado): las preferencias duran la sesión
    }
  }, [prefs])

  const value = {
    ...prefs,
    setPreference: <K extends keyof Preferences>(key: K, v: Preferences[K]) =>
      setPrefs((p) => ({ ...p, [key]: v })),
  }

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}
