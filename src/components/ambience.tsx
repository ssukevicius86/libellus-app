import { CloudRain, Headphones, Piano, Square, Trees, Volume2, type LucideIcon } from 'lucide-react'
import { useAmbience } from '@/context/ambience-context'
import { AMBIENCES, type AmbienceId } from '@/lib/ambience'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

const ICONS: Record<AmbienceId, LucideIcon> = {
  rain: CloudRain,
  piano: Piano,
  forest: Trees,
}

/** Tarjetas para activar cada ambiente y regular su volumen (se pueden mezclar). */
export function AmbienceMixer({ showMaster = false }: { showMaster?: boolean }) {
  const { playing, volumes, toggle, setVolume, masterVolume, setMasterVolume } = useAmbience()

  return (
    <div className="space-y-3">
      {AMBIENCES.map(({ id, label, description }) => {
        const Icon = ICONS[id]
        const on = playing.includes(id)
        return (
          <div
            key={id}
            className={cn(
              'flex items-center gap-3 rounded-lg border p-3 transition-colors',
              on ? 'border-gold/50 bg-gold/5' : 'bg-card/50',
            )}
          >
            <button
              type="button"
              onClick={() => toggle(id)}
              aria-pressed={on}
              aria-label={`${on ? 'Detener' : 'Reproducir'} ${label}`}
              className={cn(
                'flex size-11 shrink-0 items-center justify-center rounded-full border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                on ? 'border-gold bg-gold text-gold-foreground' : 'text-gold hover:border-gold/60',
              )}
            >
              <Icon className="size-5" strokeWidth={1.5} />
            </button>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium">{label}</p>
                <p className="truncate text-xs text-muted-foreground">{description}</p>
              </div>
              <Slider
                value={[volumes[id] * 100]}
                onValueChange={([v]) => setVolume(id, v / 100)}
                max={100}
                step={1}
                disabled={!on}
                aria-label={`Volumen de ${label}`}
              />
            </div>
          </div>
        )
      })}

      {showMaster && (
        <div className="flex items-center gap-3 px-1 pt-2">
          <Volume2 className="size-4 shrink-0 text-muted-foreground" />
          <Slider
            value={[masterVolume * 100]}
            onValueChange={([v]) => setMasterVolume(v / 100)}
            max={100}
            step={1}
            aria-label="Volumen general"
          />
        </div>
      )}
    </div>
  )
}

/** Botón flotante con el mezclador; el sonido sigue al cambiar de página. */
export function AmbiencePlayer() {
  const { playing, stopAll } = useAmbience()
  const active = playing.length > 0

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          size="icon-lg"
          variant="outline"
          aria-label="Ambientes sonoros"
          className={cn(
            'fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 rounded-full shadow-lg backdrop-blur md:bottom-6',
            active && 'border-gold text-gold',
          )}
        >
          <Headphones className={cn(active && 'animate-pulse')} />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-sm">
        <SheetHeader>
          <SheetTitle className="deco-title">Microambientes</SheetTitle>
          <SheetDescription>Mezclá sonidos para crear tu atmósfera de lectura.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-6">
          <AmbienceMixer showMaster />
          {active && (
            <Button variant="ghost" className="w-full" onClick={stopAll}>
              <Square /> Detener todo
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
