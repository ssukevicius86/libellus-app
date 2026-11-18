import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { ArrowRight, Lock, Mail } from 'lucide-react'
import { authErrorMessage } from '@/components/auth/auth-errors'
import { AuthShell } from '@/components/auth/AuthShell'
import { FormField } from '@/components/auth/FormField'
import { GoogleIcon } from '@/components/auth/GoogleIcon'
import { Button } from '@/components/ui/button/button'
import { useAuth } from '@/context/auth-context'

/** Escena que ocupa el ancho del panel, debajo del título (recorte de public/img-login-2.jpg). */
const ILLUSTRATION = {
  src: '/ilustraciones/lectura-sala-960.webp',
  srcSet: '/ilustraciones/lectura-sala-480.webp 480w, /ilustraciones/lectura-sala-960.webp 960w',
  sizes: '(width >= 56rem) 26rem, 100vw',
  width: 960,
  height: 936,
  // Decorativa: el título ya dice de qué trata la pantalla
  alt: '',
  wall: 'linear-gradient(to right, #ead2ce, #efdcd5 45%, #f4e0d9)',
}

/** Ingreso con cuenta Libellus (email y contraseña). */
export default function EmailSignIn() {
  const { signInWithEmail, signIn } = useAuth()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<'email' | 'google' | null>(null)
  const [email, setEmail] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setError(null)
    setPending('email')
    try {
      await signInWithEmail(String(data.get('email')).trim(), String(data.get('password')))
      // Al ingresar, AuthShell redirige solo
    } catch (err) {
      setError(authErrorMessage(err, 'No se pudo ingresar. Intentá de nuevo.'))
    } finally {
      setPending(null)
    }
  }

  const handleGoogle = async () => {
    setError(null)
    setPending('google')
    try {
      await signIn()
    } catch (err) {
      setError(authErrorMessage(err, 'No se pudo ingresar con Google. Intentá de nuevo.'))
    } finally {
      setPending(null)
    }
  }

  return (
    <AuthShell
      title="¡Hola de nuevo!"
      description="Ingresá para seguir con tu lectura."
      illustration={ILLUSTRATION}
      footer={
        <>
          ¿No tenés cuenta?{' '}
          <Link to="/registro" state={location.state}>
            Creá una
          </Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <FormField
          name="email"
          label="Email"
          type="email"
          icon={Mail}
          autoComplete="username"
          spellCheck={false}
          enterKeyHint="next"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error="Escribí un email válido."
        />
        <FormField
          name="password"
          label="Contraseña"
          type="password"
          icon={Lock}
          autoComplete="current-password"
          enterKeyHint="done"
          required
          error="Escribí tu contraseña."
        />
        <p className="auth-form__extra">
          <Link to="/recuperar" state={{ ...(location.state ?? {}), email }}>
            ¿Olvidaste tu contraseña?
          </Link>
        </p>
        {error && (
          <p role="alert" className="auth-form__error">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={pending !== null} className="auth-form__enviar">
          {pending === 'email' ? (
            'Ingresando…'
          ) : (
            <>
              Ingresar <ArrowRight aria-hidden="true" />
            </>
          )}
        </Button>
      </form>

      <p className="auth-separador">o continuá con</p>
      <div className="auth-sociales">
        <button
          type="button"
          className="auth-social"
          onClick={handleGoogle}
          disabled={pending !== null}
          aria-label="Continuar con Google"
        >
          <GoogleIcon />
        </button>
      </div>
    </AuthShell>
  )
}
