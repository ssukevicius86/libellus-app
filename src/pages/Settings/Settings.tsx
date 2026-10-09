import type { ReactNode } from 'react'
import { LogOut, Moon, Sun } from 'lucide-react'
import { useAmbience } from '@/context/ambience-context'
import { useAuth } from '@/context/auth-context'
import { usePreferences, type Theme } from '@/context/preferences-context'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/deco'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import './Settings.css'

const THEMES: { id: Theme; label: string; icon: typeof Sun }[] = [
  { id: 'dark', label: 'Noche', icon: Moon },
  { id: 'light', label: 'Día', icon: Sun },
]

function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="settings-div-1">
      <div>
        <p className="settings-p-2">{title}</p>
        {hint && <p className="settings-p-3">{hint}</p>}
      </div>
      <div className="settings-div-4">{children}</div>
    </div>
  )
}

export default function Settings() {
  const { user, profile, signOut } = useAuth()
  const prefs = usePreferences()
  const { masterVolume, setMasterVolume, stopAll } = useAmbience()

  return (
    <div className="settings-div-5">
      <PageHeader eyebrow="Tu espacio" title="Ajustes" />

      <section className="deco-card settings-section-6">
        <Row title="Tema" hint="Lavandas y dorados, de noche o de día">
          <div className="settings-div-7" role="radiogroup" aria-label="Tema">
            {THEMES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={prefs.theme === id}
                onClick={() => prefs.setPreference('theme', id)}
                className={cn(
                  'settings-button-8',
                  prefs.theme === id ? 'settings-button-9' : 'settings-button-10',
                )}
              >
                <Icon className="settings-icon-11" /> {label}
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
          <div className="settings-div-12">
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

      <section className="deco-card settings-section-13">
        {profile?.photoURL && (
          <img src={profile.photoURL} alt="" referrerPolicy="no-referrer" className="settings-img-14" />
        )}
        <div className="settings-div-15">
          <p className="settings-p-16">{profile?.displayName ?? user?.displayName}</p>
          <p className="settings-p-17">{profile?.email ?? user?.email}</p>
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
