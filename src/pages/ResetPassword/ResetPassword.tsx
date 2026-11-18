import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { FirebaseError } from 'firebase/app'
import { Mail, Send } from 'lucide-react'
import { authErrorMessage } from '@/components/auth/auth-errors'
import { AuthShell } from '@/components/auth/AuthShell'
import { FormField } from '@/components/auth/FormField'
import { Button } from '@/components/ui/button/button'
import { useAuth } from '@/context/auth-context'

/** Envía el email de Firebase para elegir una contraseña nueva. */
export default function ResetPassword() {
  const { resetPassword } = useAuth()
  const location = useLocation()
  const initialEmail = (location.state as { email?: string } | null)?.email ?? ''
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const email = String(new FormData(event.currentTarget).get('email')).trim()
    setError(null)
    setPending(true)
    try {
      await resetPassword(email)
      setSentTo(email)
    } catch (err) {
      // No revelamos si el email tiene cuenta: mostramos el mismo mensaje
      if (err instanceof FirebaseError && err.code === 'auth/user-not-found') {
        setSentTo(email)
      } else {
        setError(authErrorMessage(err, 'No se pudo enviar el email. Intentá de nuevo.'))
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthShell
      title="Recuperá tu contraseña"
      description="Te mandamos un email con un enlace para elegir una contraseña nueva."
      footer={
        <>
          ¿Te acordaste?{' '}
          <Link to="/login/email" state={location.state}>
            Volvé a ingresar
          </Link>
        </>
      }
    >
      {sentTo ? (
        <p role="status" className="auth-form__exito">
          Si hay una cuenta con <strong>{sentTo}</strong>, ya te enviamos el enlace. Revisá tu bandeja de
          entrada y la carpeta de spam.
        </p>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          <FormField
            name="email"
            label="Email"
            type="email"
            icon={Mail}
            autoComplete="username"
            spellCheck={false}
            enterKeyHint="send"
            required
            defaultValue={initialEmail}
            error="Escribí un email válido."
          />
          {error && (
            <p role="alert" className="auth-form__error">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={pending} className="auth-form__enviar">
            {pending ? (
              'Enviando…'
            ) : (
              <>
                Enviar enlace <Send aria-hidden="true" />
              </>
            )}
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
