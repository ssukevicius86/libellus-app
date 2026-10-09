import { formatClock } from '@/lib/stats'

/** Anillo del Focus Timer: cuenta regresiva si hay objetivo, si no cronómetro libre. */
export function FocusRing({
  elapsedMs,
  targetMs,
  paused,
}: {
  elapsedMs: number
  targetMs: number | null
  paused: boolean
}) {
  const r = 46
  const circumference = 2 * Math.PI * r
  const fraction = targetMs ? Math.min(1, elapsedMs / targetMs) : (elapsedMs % 60000) / 60000
  const shown = targetMs ? targetMs - elapsedMs : elapsedMs

  return (
    <div className="relative mx-auto aspect-square w-full max-w-72">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border)" strokeWidth="1.5" />
        <circle cx="50" cy="50" r={r - 4} fill="none" stroke="var(--gold)" strokeOpacity="0.15" strokeWidth="0.4" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--gold)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          className="transition-[stroke-dashoffset] duration-300 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <span
          className="text-5xl font-light tabular-nums tracking-wider sm:text-6xl"
          role="timer"
          aria-live="off"
        >
          {formatClock(shown)}
        </span>
        <span className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
          {paused ? 'En pausa' : targetMs ? 'restante' : 'leyendo'}
        </span>
      </div>
    </div>
  )
}

/**
 * Atenúa toda la pantalla sin bloquear la interacción. Va por encima de todo
 * (z-[100]) y no captura clics.
 */
export function DimOverlay({ level }: { level: number }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[100] bg-black transition-opacity duration-700"
      style={{ opacity: level }}
    />
  )
}
