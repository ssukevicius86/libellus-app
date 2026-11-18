import { Suspense } from 'react'
import { BookOpen, HeartPulse, House, Library, UserRound, type LucideIcon } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { cn } from '@/lib/utils'
import { AmbiencePlayer } from '@/components/ambience'
import { Isotipo } from '@/components/brand'

const NAV: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/', label: 'Santuario', icon: House, end: true },
  { to: '/biblioteca', label: 'Biblioteca', icon: Library },
  { to: '/sesion', label: 'Leer', icon: BookOpen },
  { to: '/animo', label: 'Ánimo', icon: HeartPulse },
  // Sin `end`: queda activo también en /perfil/ajustes
  { to: '/perfil', label: 'Perfil', icon: UserRound },
]

export default function AppLayout() {
  const { pathname } = useLocation()
  // La sesión de lectura tiene su propio mezclador y modo inmersivo
  const inSession = pathname.startsWith('/sesion')

  return (
    <div className="min-h-svh md:pl-66">
      {/* Formas orgánicas decorativas del fondo */}
      <div className="formas-fondo" aria-hidden="true">
        <span className="forma forma--1" />
        <span className="forma forma--2" />
        <span className="forma forma--3" />
        <span className="forma forma--4" />
      </div>

      {/* Barra lateral (escritorio) */}
      <aside className="panel-flotante fixed inset-y-3 left-3 z-20 hidden w-60 flex-col overflow-y-auto md:flex">
        <div className="flex flex-col items-center gap-1 px-6 pt-8 pb-6 text-center">
          <Isotipo label="" className="h-9" />
          <p className="font-serif text-3xl text-gold">Libellus</p>
          <p className="text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
            Santuario digital de lectura
          </p>
        </div>
        <nav className="flex flex-col gap-1 px-3" aria-label="Principal">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium tracking-wide transition-[color,background-color,box-shadow]',
                  isActive
                    ? 'text-foreground [box-shadow:var(--relieve-hundido)] dark:text-gold'
                    : 'text-muted-foreground hover:text-foreground hover:[box-shadow:var(--relieve-boton)]',
                )
              }
            >
              <Icon className="size-4" strokeWidth={1.6} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-6 md:pt-10 md:pb-12">
        <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
          <Outlet />
        </Suspense>
      </main>

      {/* Barra inferior (móvil) */}
      <nav
        aria-label="Principal"
        className="panel-flotante fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-20 grid grid-cols-5 p-1 md:hidden"
      >
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-medium tracking-wide transition-[color,background-color,box-shadow]',
                isActive
                  ? 'text-foreground [box-shadow:var(--relieve-hundido)] dark:text-gold'
                  : 'text-muted-foreground',
              )
            }
          >
            <Icon className="size-5" strokeWidth={1.6} />
            {label}
          </NavLink>
        ))}
      </nav>

      {!inSession && <AmbiencePlayer />}
    </div>
  )
}
