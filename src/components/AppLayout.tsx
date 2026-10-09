import { Suspense } from 'react'
import { BookOpen, HeartPulse, House, Library, Settings, type LucideIcon } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { cn } from '@/lib/utils'
import { AmbiencePlayer } from '@/components/ambience'
import { LotusIcon } from '@/components/deco'

const NAV: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/', label: 'Santuario', icon: House, end: true },
  { to: '/biblioteca', label: 'Biblioteca', icon: Library },
  { to: '/sesion', label: 'Leer', icon: BookOpen },
  { to: '/animo', label: 'Ánimo', icon: HeartPulse },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
]

export default function AppLayout() {
  const { pathname } = useLocation()
  // La sesión de lectura tiene su propio mezclador y modo inmersivo
  const inSession = pathname.startsWith('/sesion')

  return (
    <div className="min-h-svh md:pl-60">
      {/* Barra lateral (escritorio) */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r bg-sidebar/80 backdrop-blur md:flex">
        <div className="flex flex-col items-center gap-1 px-6 pt-8 pb-6 text-center">
          <LotusIcon className="h-9 text-gold" />
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
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium tracking-wide transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-gold'
                    : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
                )
              }
            >
              <Icon className="size-4" strokeWidth={1.6} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 md:pt-10 md:pb-12">
        <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
          <Outlet />
        </Suspense>
      </main>

      {/* Barra inferior (móvil) */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium tracking-wide',
                isActive ? 'text-gold' : 'text-muted-foreground',
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
