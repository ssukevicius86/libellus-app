import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { Mail } from 'lucide-react'
import { authErrorMessage } from '@/components/auth/auth-errors'
import { AuthScene } from '@/components/auth/AuthScene'
import { GoogleIcon } from '@/components/auth/GoogleIcon'
import { ThemeToggle } from '@/components/auth/ThemeToggle'
import { useRedirectTarget } from '@/components/auth/auth-redirect'
import '@/components/auth/auth.css'
import { Imagotipo } from '@/components/brand'
import { Button } from '@/components/ui/button/button'
import { useAuth } from '@/context/auth-context'
import './Login.css'

const CANCELLED = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request']

export default function Login() {
  const { user, loading, signIn } = useAuth()
  const location = useLocation()
  const target = useRedirectTarget()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (user) return <Navigate to={target} replace />

  const handleGoogle = async () => {
    setError(null)
    setPending(true)
    try {
      await signIn()
    } catch (err) {
      const code = (err as { code?: string }).code
      setError(
        code && CANCELLED.includes(code)
          ? 'Cerraste la ventana de Google antes de terminar.'
          : authErrorMessage(err, 'No se pudo iniciar sesión. Intentá de nuevo.'),
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="auth login">
      <AuthScene className="auth__escena" />
      <ThemeToggle />

      <div className="auth__columna login__columna">
        <header className="login__marca">
          <Imagotipo className="auth__logo login__logo" />
          <h1 className="login__titulo">Tu santuario de lectura</h1>
          <p className="login__lema">
            Leé con calma. Seguí tu ritmo.
            <br />
            Guardá cada página.
          </p>
        </header>

        <div className="login__acciones">
          <Button asChild size="lg" variant="outline" className="auth__boton">
            <Link to="/login/email" state={location.state}>
              <Mail aria-hidden="true" /> Entrar con email
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={handleGoogle}
            disabled={loading || pending}
            className="auth__boton auth__boton--secundario"
          >
            <GoogleIcon mono /> {pending ? 'Entrando…' : 'Entrar con Google'}
          </Button>
          {error && (
            <p role="alert" className="auth__alerta">
              {error}
            </p>
          )}
          <p className="auth__nota">
            ¿No tenés cuenta?{' '}
            <Link to="/registro" state={location.state}>
              Creá una
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
