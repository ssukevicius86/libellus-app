import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useMoods, useSessions, useUid } from '@/hooks/useLibrary'
import { dayKey, MOOD_LABELS, saveMood, type MoodEntry, type MoodValue } from '@/lib/moods'
import { dailySeries, formatMinutes } from '@/lib/stats'
import { MinutesBarChart, MoodLineChart } from '@/components/charts'
import { PageHeader } from '@/components/deco'
import { MoodIcon, MoodPicker } from '@/components/mood'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const longDate = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' })

/** yyyy-mm-dd → Date local (sin desfase de zona horaria) */
const parseDay = (d: string) => {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day)
}

export default function Mood() {
  const moods = useMoods()
  const sessions = useSessions()
  const today = moods.data.find((m) => m.date === dayKey())

  const series = useMemo(() => dailySeries(sessions.data, moods.data, 30), [sessions.data, moods.data])

  // Ánimo medio en días con lectura vs. sin lectura
  const insight = useMemo(() => {
    const withReading = series.filter((d) => d.mood && d.minutes > 0)
    const without = series.filter((d) => d.mood && d.minutes === 0)
    if (withReading.length < 3 || without.length < 3) return null
    const avg = (xs: typeof series) => xs.reduce((s, d) => s + (d.mood ?? 0), 0) / xs.length
    return { reading: avg(withReading), idle: avg(without) }
  }, [series])

  const hasData = series.some((d) => d.mood || d.minutes)

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Módulo emocional" title="Tu clima interior" />

      <TodayCheckIn key={today?.date ?? 'none'} today={today} />

      <section className="deco-card space-y-6 p-5 sm:p-6">
        <div>
          <h2 className="deco-eyebrow">Últimos 30 días</h2>
          {insight && (
            <p className="mt-2 font-serif text-lg italic text-foreground/85">
              {insight.reading > insight.idle + 0.2
                ? 'Los días que leés, tu ánimo tiende a estar más luminoso.'
                : insight.reading < insight.idle - 0.2
                  ? 'Los días que leés tu ánimo viene algo más bajo: quizá la lectura llega cuando más la necesitás.'
                  : 'Tu ánimo se mantiene parecido leas o no: la lectura te acompaña en todo clima.'}
            </p>
          )}
        </div>
        {hasData ? (
          <>
            <figure className="space-y-2">
              <figcaption className="text-sm font-medium">Ánimo diario</figcaption>
              <MoodLineChart data={series} />
            </figure>
            <figure className="space-y-2">
              <figcaption className="text-sm font-medium">Minutos de lectura por día</figcaption>
              <MinutesBarChart data={series} />
            </figure>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Registrá tu ánimo y tus sesiones de lectura para ver cómo evolucionan juntos.
          </p>
        )}
      </section>

      <History moods={moods.data} minutesByDay={new Map(series.map((d) => [d.day, d.minutes]))} />
    </div>
  )
}

function TodayCheckIn({ today }: { today: MoodEntry | undefined }) {
  const uid = useUid()
  const [mood, setMood] = useState<MoodValue | null>(today?.mood ?? null)
  const [note, setNote] = useState(today?.note ?? '')
  const [saving, setSaving] = useState(false)
  const dirty = mood !== (today?.mood ?? null) || note !== (today?.note ?? '')

  const save = async () => {
    if (!mood) return
    setSaving(true)
    try {
      await saveMood(uid, mood, note.trim())
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="deco-card space-y-4 p-5 sm:p-6">
      <h2 className="deco-eyebrow">Hoy, {longDate.format(new Date())}</h2>
      <MoodPicker value={mood} onChange={setMood} />
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="¿Algo que quieras recordar de hoy? (opcional)"
        rows={2}
        maxLength={2000}
        aria-label="Nota del día"
      />
      <Button onClick={() => void save()} disabled={!mood || !dirty || saving}>
        {saving && <Loader2 className="animate-spin" />}
        {today && !dirty ? 'Registrado' : 'Guardar'}
      </Button>
    </section>
  )
}

function History({ moods, minutesByDay }: { moods: MoodEntry[]; minutesByDay: Map<string, number> }) {
  if (!moods.length) return null
  return (
    <section className="space-y-3">
      <h2 className="deco-eyebrow">Historial</h2>
      <ul className="divide-y rounded-lg border bg-card/60">
        {moods.slice(0, 30).map((m) => (
          <li key={m.id} className="flex items-start gap-3 px-4 py-3">
            <MoodIcon mood={m.mood} className="mt-0.5 size-5 shrink-0 text-gold" />
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-medium">{MOOD_LABELS[m.mood]}</span>
                <span className="text-muted-foreground"> · {longDate.format(parseDay(m.date))}</span>
              </p>
              {m.note && <p className="mt-0.5 font-serif text-base text-foreground/80">{m.note}</p>}
            </div>
            {minutesByDay.get(m.date) ? (
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {formatMinutes(minutesByDay.get(m.date)!)}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
