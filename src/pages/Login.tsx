import { useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { FirebaseError } from 'firebase/app'
import { BookOpen, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/auth-context'

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
        setError('Has cerrado la ventana de Google antes de terminar.')
      } else if (err instanceof FirebaseError && err.code === 'auth/popup-blocked') {
        setError('El navegador ha bloqueado la ventana emergente. Permítela e inténtalo de nuevo.')
      } else {
        console.error(err)
        setError('No se pudo iniciar sesión. Inténtalo de nuevo.')
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6">
      <BookOpen className="size-12" />
      <h1 className="text-3xl font-semibold">Libellus</h1>
      <Button onClick={handleSignIn} disabled={loading || pending}>
        <LogIn /> Entrar con Google
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </main>
  )
}
