import { Cloud, CloudLightning, CloudRain, CloudSun, Sun, type LucideIcon } from 'lucide-react'
import { MOOD_LABELS, MOOD_VALUES, type MoodValue } from '@/lib/moods'
import { cn } from '@/lib/utils'

const MOOD_ICONS: Record<MoodValue, LucideIcon> = {
  1: CloudLightning,
  2: CloudRain,
  3: Cloud,
  4: CloudSun,
  5: Sun,
}

export function MoodIcon({ mood, className }: { mood: MoodValue; className?: string }) {
  const Icon = MOOD_ICONS[mood]
  return <Icon className={className} aria-hidden="true" />
}

/** Selector de ánimo: 5 estados del clima, cada uno con icono y etiqueta. */
export function MoodPicker({
  value,
  onChange,
  compact = false,
}: {
  value: MoodValue | null
  onChange: (mood: MoodValue) => void
  compact?: boolean
}) {
  return (
    <div role="radiogroup" aria-label="¿Cómo te sentís?" className="grid grid-cols-5 gap-1.5 sm:gap-2">
      {MOOD_VALUES.map((m) => {
        const selected = value === m
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(m)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-lg border px-1 py-3 text-muted-foreground transition-all outline-none',
              'hover:border-gold/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
              selected && 'border-gold bg-gold/10 text-gold',
              compact && 'py-2',
            )}
          >
            <MoodIcon mood={m} className={cn(compact ? 'size-5' : 'size-6 sm:size-7')} />
            <span className="text-[10px] font-medium leading-none sm:text-xs">{MOOD_LABELS[m]}</span>
          </button>
        )
      })}
    </div>
  )
}
