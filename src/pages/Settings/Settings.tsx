import type { ReactNode } from 'react'
import { LogOut, Moon, Sun } from 'lucide-react'
import { useAmbience } from '@/context/ambience-context'
import { useAuth } from '@/context/auth-context'
import { usePreferences, type Theme } from '@/context/preferences-context'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/deco'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'

const THEMES: { id: Theme; label: string; icon: typeof Sun }[] = [
  { id: 'dark', label: 'Noche', icon: Moon },
  { id: 'light', label: 'Día', icon: Sun },
]

function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium">{title}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="sm:w-64">{children}</div>
    </div>
  )
}

export default function Settings() {
  const { user, profile, signOut } = useAuth()
  const prefs = usePreferences()
  const { masterVolume, setMasterVolume, stopAll } = useAmbience()

  return (
    <div className="max-w-2xl">
      <PageHeader eyebrow="Tu espacio" title="Ajustes" />

      <section className="deco-card divide-y px-5 sm:px-6">
        <Row title="Tema" hint="Lavandas y dorados, de noche o de día">
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tema">
            {THEMES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={prefs.theme === id}
                onClick={() => prefs.setPreference('theme', id)}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-md border py-2 text-sm transition-colors',
                  prefs.theme === id ? 'border-gold bg-gold/10 text-gold' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>
        </Row>

        <Row title="Focus Timer" hint={`Duración por defecto: ${prefs.focusMinutes} min`}>
          <Slider
            value={[prefs.focusMinutes]}
            onValueChange={([v]) => prefs.setPreference('focusMinutes', v)}
            min={5}
            max={90}
            step={5}
            aria-label="Duración por defecto del Focus Timer"
          />
        </Row>

        <Row title="Atenuación de brillo" hint={`Nivel inicial en las sesiones: ${Math.round(prefs.dimLevel * 100)}%`}>
          <Slider
            value={[prefs.dimLevel * 100]}
            onValueChange={([v]) => prefs.setPreference('dimLevel', v / 100)}
            max={80}
            step={5}
            aria-label="Nivel de atenuación por defecto"
          />
        </Row>

        <Row title="Volumen de los ambientes" hint={`${Math.round(masterVolume * 100)}%`}>
          <div className="flex items-center gap-3">
            <Slider
              value={[masterVolume * 100]}
              onValueChange={([v]) => setMasterVolume(v / 100)}
              max={100}
              step={1}
              aria-label="Volumen general"
            />
          </div>
        </Row>
      </section>

      <section className="deco-card mt-6 flex flex-wrap items-center gap-4 p-5 sm:p-6">
        {profile?.photoURL && (
          <img src={profile.photoURL} alt="" referrerPolicy="no-referrer" className="size-12 rounded-full border border-gold/40" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{profile?.displayName ?? user?.displayName}</p>
          <p className="truncate text-sm text-muted-foreground">{profile?.email ?? user?.email}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            stopAll()
            void signOut()
          }}
        >
          <LogOut /> Salir
        </Button>
      </section>
    </div>
  )
}
