import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Página no encontrada</h1>
      <Button asChild variant="link">
        <Link to="/">Volver al inicio</Link>
      </Button>
    </main>
  )
}
