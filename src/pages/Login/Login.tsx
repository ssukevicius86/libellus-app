import { useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { FirebaseError } from 'firebase/app'
import { LogIn } from 'lucide-react'
import { DecoArch, DecoDivider, LotusIcon } from '@/components/deco'
import { Button } from '@/components/ui/button/button'
import { useAuth } from '@/context/auth-context'
import './Login.css'

const CANCELLED = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request']

export default function Login() {
  const { user, loading, signIn } = useAuth()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (user) {
    const from = (location.state as { from?: string } | null)?.from ?? '/'
    return <Navigate to={from} replace />
  }

  const handleSignIn = async () => {
    setError(null)
    setPending(true)
    try {
      await signIn()
    } catch (err) {
      if (err instanceof FirebaseError && CANCELLED.includes(err.code)) {
        setError('Cerraste la ventana de Google antes de terminar.')
      } else if (err instanceof FirebaseError && err.code === 'auth/popup-blocked') {
        setError('El navegador bloqueó la ventana emergente. Permitila e intentá de nuevo.')
      } else {
        console.error(err)
        setError('No se pudo iniciar sesión. Intentá de nuevo.')
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="login-main-1">
      <DecoArch className="login-decoarch-2">
        <div className="login-div-3">
          <LotusIcon className="login-lotusicon-4" />
          <div className="login-div-5">
            <h1 className="login-h1-6">Libellus</h1>
            <p className="login-p-7">
              Santuario digital de lectura
            </p>
          </div>
          <DecoDivider className="login-decodivider-8" />
          <p className="login-p-9">
            Tu biblioteca, tu atmósfera y tu calma, en un solo lugar.
          </p>
          <Button size="lg" onClick={handleSignIn} disabled={loading || pending} className="login-button-10">
            <LogIn /> Entrar con Google
          </Button>
          {error && (
            <p role="alert" className="texto-error">
              {error}
            </p>
          )}
        </div>
      </DecoArch>
    </main>
  )
}
