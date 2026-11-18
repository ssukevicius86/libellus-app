import { Moon, Sun } from 'lucide-react'
import { usePreferences } from '@/context/preferences-context'

/** Cambia entre modo claro y oscuro. La preferencia se guarda y sigue al entrar a la app. */
export function ThemeToggle() {
  const { theme, setPreference } = usePreferences()
  const isDark = theme === 'dark'
  const label = isDark ? 'Activar modo claro' : 'Activar modo oscuro'

  return (
    <button
      type="button"
      className="auth-3d auth__tema"
      onClick={() => setPreference('theme', isDark ? 'light' : 'dark')}
      aria-label={label}
      title={label}
    >
      {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </button>
  )
}
