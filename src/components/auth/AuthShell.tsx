import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { Imagotipo } from '@/components/brand'
import { useAuth } from '@/context/auth-context'
import { ThemeToggle } from './ThemeToggle'
import { useRedirectTarget } from './auth-redirect'
import './auth.css'

interface AuthShellProps {
  title: string
  description?: ReactNode
  /** Ilustración que se apoya sobre el borde superior del formulario. */
  illustration?: {
    src: string
    srcSet?: string
    sizes?: string
    width: number
    height: number
    alt?: string
    /** Color de la pared de la ilustración (CSS), para extenderla arriba del personaje. */
    wall?: string
  }
  children: ReactNode
  footer?: ReactNode
}

/** Paisaje + panel para las pantallas de acceso con formulario. */
export function AuthShell({ title, description, illustration, children, footer }: AuthShellProps) {
  const { user } = useAuth()
  const location = useLocation()
  const target = useRedirectTarget()
  // Si la imagen todavía no existe o falla, el panel se ve bien sin ella
  const [illustrationFailed, setIllustrationFailed] = useState(false)
  const showIllustration = illustration && !illustrationFailed

  if (user) return <Navigate to={target} replace />

  return (
    <main className="auth auth--formulario">
      <div className="auth__sala" aria-hidden="true" />
      <ThemeToggle />
      <div className="auth__columna">
        <Link to="/login" state={location.state} className="auth-3d auth__volver">
          <ArrowLeft aria-hidden="true" /> Volver
        </Link>
        <section className="auth-panel" aria-labelledby="auth-titulo">
          <header className="auth-panel__encabezado">
            <Imagotipo className="auth-panel__logo" />
            <h1 id="auth-titulo" className="auth-panel__titulo">
              {title}
            </h1>
            {description && <p className="auth-panel__descripcion">{description}</p>}
          </header>
          {showIllustration && (
            <img
              className="auth-panel__ilustracion"
              src={illustration.src}
              srcSet={illustration.srcSet}
              sizes={illustration.sizes}
              width={illustration.width}
              height={illustration.height}
              alt={illustration.alt ?? ''}
              style={illustration.wall ? ({ '--auth-pared': illustration.wall } as CSSProperties) : undefined}
              decoding="async"
              onError={() => setIllustrationFailed(true)}
            />
          )}
          <div className="auth-panel__tarjeta">
            {children}
          </div>
          {footer && <p className="auth-panel__pie">{footer}</p>}
        </section>
        <div className="auth-pedestal" aria-hidden="true" />
      </div>
    </main>
  )
}
