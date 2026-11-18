import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { ArrowRight, Cake, Lock, Mail, User } from 'lucide-react'
import { authErrorMessage } from '@/components/auth/auth-errors'
import { AuthShell } from '@/components/auth/AuthShell'
import { FormField } from '@/components/auth/FormField'
import { Button } from '@/components/ui/button/button'
import { useAuth } from '@/context/auth-context'

const MIN_AGE = 13
const MAX_AGE = 120
// Al menos 8 caracteres, con una minúscula, una mayúscula y un número
const PASSWORD_PATTERN = '(?=.*\\d)(?=.*[a-z])(?=.*[A-Z]).{8,}'

/** Escena del registro: completando un formulario (recorte de la ilustración original img-crear-cuenta-2.png, guardada en el historial de git). */
const ILLUSTRATION = {
  src: '/ilustraciones/registro-escritorio-960.webp',
  srcSet: '/ilustraciones/registro-escritorio-480.webp 480w, /ilustraciones/registro-escritorio-960.webp 960w',
  sizes: '(width >= 56rem) 30rem, 100vw',
  width: 960,
  height: 1242,
  // Decorativa: el título ya dice de qué trata la pantalla
  alt: '',
  wall: 'linear-gradient(to right, #e9cfca, #efd7cf 45%, #f2dad4)',
}

/** Registro de una cuenta Libellus. */
export default function Register() {
  const { signUpWithEmail } = useAuth()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setError(null)
    setPending(true)
    try {
      await signUpWithEmail({
        email: String(data.get('email')).trim(),
        firstName: String(data.get('given-name')).trim(),
        lastName: String(data.get('family-name')).trim(),
        age: Number(data.get('age')),
        password: String(data.get('new-password')),
      })
      // Al crear la cuenta queda iniciada la sesión y AuthShell redirige
    } catch (err) {
      setError(authErrorMessage(err, 'No se pudo crear la cuenta. Intentá de nuevo.'))
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthShell
      title="Creá tu cuenta"
      description="Tu biblioteca y tu calma, en un solo lugar."
      illustration={ILLUSTRATION}
      footer={
        <>
          ¿Ya tenés cuenta?{' '}
          <Link to="/login/email" state={location.state}>
            Ingresá
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
          error="Escribí un email válido."
        />
        <FormField
          name="given-name"
          label="Nombre"
          icon={User}
          autoComplete="given-name"
          autoCapitalize="words"
          enterKeyHint="next"
          required
          maxLength={60}
          pattern=".*\S.*"
          error="Escribí tu nombre."
        />
        <FormField
          name="family-name"
          label="Apellido"
          icon={User}
          autoComplete="family-name"
          autoCapitalize="words"
          enterKeyHint="next"
          required
          maxLength={60}
          pattern=".*\S.*"
          error="Escribí tu apellido."
        />
        <FormField
          name="age"
          label="Edad"
          icon={Cake}
          type="number"
          inputMode="numeric"
          autoComplete="off"
          enterKeyHint="next"
          required
          min={MIN_AGE}
          max={MAX_AGE}
          step={1}
          error={`Escribí una edad entre ${MIN_AGE} y ${MAX_AGE}.`}
        />
        <FormField
          name="new-password"
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          icon={Lock}
          enterKeyHint="done"
          required
          minLength={8}
          pattern={PASSWORD_PATTERN}
          hint="Al menos 8 caracteres, con mayúsculas, minúsculas y números."
          error="No cumple los requisitos de arriba."
        />
        {error && (
          <p role="alert" className="auth-form__error">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={pending} className="auth-form__enviar">
          {pending ? (
            'Creando cuenta…'
          ) : (
            <>
              Crear cuenta <ArrowRight aria-hidden="true" />
            </>
          )}
        </Button>
      </form>
    </AuthShell>
  )
}
