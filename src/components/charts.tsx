import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
  type TooltipValueType,
} from 'recharts'
import { MOOD_LABELS, type MoodValue } from '@/lib/moods'

export interface DayPoint {
  /** yyyy-mm-dd */
  day: string
  /** Etiqueta corta para el eje, p. ej. "8 oct" */
  label: string
  mood: MoodValue | null
  minutes: number
}

const AXIS = {
  stroke: 'var(--muted-foreground)',
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const

function ChartTooltip({ active, payload }: TooltipContentProps<TooltipValueType, string | number>) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload as DayPoint
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-foreground">{point.label}</p>
      <p className="text-muted-foreground">
        Ánimo: <span className="text-foreground">{point.mood ? MOOD_LABELS[point.mood] : 'sin registro'}</span>
      </p>
      <p className="text-muted-foreground">
        Lectura: <span className="tabular-nums text-foreground">{Math.round(point.minutes)} min</span>
      </p>
    </div>
  )
}

/** Ánimo diario (1–5) como línea; los días sin registro quedan como hueco. */
export function MoodLineChart({ data }: { data: DayPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" {...AXIS} interval="preserveStartEnd" minTickGap={24} />
        <YAxis
          {...AXIS}
          domain={[1, 5]}
          ticks={[1, 2, 3, 4, 5]}
          width={72}
          tickFormatter={(v: number) => MOOD_LABELS[v as MoodValue]}
        />
        <Tooltip
          content={ChartTooltip}
          cursor={{ stroke: 'var(--muted-foreground)', strokeDasharray: '3 3' }}
        />
        <Line
          type="monotone"
          dataKey="mood"
          stroke="var(--chart-1)"
          strokeWidth={2}
          connectNulls
          dot={{ r: 4, fill: 'var(--chart-1)', stroke: 'var(--card)', strokeWidth: 2 }}
          activeDot={{ r: 6, stroke: 'var(--card)', strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

/** Minutos leídos por día. Gráfico aparte: otra escala, nunca doble eje. */
export function MinutesBarChart({ data }: { data: DayPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }} barCategoryGap={2}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" {...AXIS} interval="preserveStartEnd" minTickGap={24} />
        <YAxis {...AXIS} width={72} allowDecimals={false} tickFormatter={(v: number) => `${v} min`} />
        <Tooltip content={ChartTooltip} cursor={{ fill: 'var(--accent)', opacity: 0.5 }} />
        <Bar
          dataKey="minutes"
          fill="var(--chart-2)"
          radius={[4, 4, 0, 0]}
          maxBarSize={18}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
