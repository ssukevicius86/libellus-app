import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Loto lineal de la marca. Hereda el color del texto. */
export function LotusIcon({ className, ...props }: ComponentProps<'svg'>) {
  return (
    <svg
      viewBox="0 0 64 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('h-8 w-auto', className)}
      {...props}
    >
      <path d="M32 4c5 6 7 13 0 26-7-13-5-20 0-26Z" />
      <path d="M32 30c3-9 8-14 15-16-1 8-7 14-15 16Z" />
      <path d="M32 30c-3-9-8-14-15-16 1 8 7 14 15 16Z" />
      <path d="M32 30c7-5 15-6 22-4-5 5-13 6-22 4Z" />
      <path d="M32 30c-7-5-15-6-22-4 5 5 13 6 22 4Z" />
      <path d="M14 34h36M20 37h24" />
    </svg>
  )
}

/** Arco art déco con filetes dorados que enmarca contenido. */
export function DecoArch({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <svg
        viewBox="0 0 200 300"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full text-gold"
        fill="none"
        stroke="currentColor"
      >
        <path d="M4 300V100a96 96 0 0 1 192 0v200" strokeWidth="1.2" opacity="0.9" />
        <path d="M14 300V102a86 86 0 0 1 172 0v198" strokeWidth="0.6" opacity="0.5" />
        <path d="M24 300V104a76 76 0 0 1 152 0v196" strokeWidth="0.4" opacity="0.3" />
        <path d="M100 4v20M60 14l8 16M140 14l-8 16" strokeWidth="0.6" opacity="0.5" />
      </svg>
      <div className="relative">{children}</div>
    </div>
  )
}

/** Separador dorado con rombo central. */
export function DecoDivider({ className }: { className?: string }) {
  return (
    <div className={cn('deco-divider', className)} aria-hidden="true">
      <span className="size-1.5 rotate-45 border border-gold" />
    </div>
  )
}

/** Encabezado de página: antetítulo dorado + título en mayúsculas espaciadas. */
export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string
  title: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="deco-eyebrow mb-1">{eyebrow}</p>}
        <h1 className="deco-title text-2xl font-light sm:text-3xl">{title}</h1>
      </div>
      {children}
    </header>
  )
}
