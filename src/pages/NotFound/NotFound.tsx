import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { DecoDivider, LotusIcon } from '@/components/deco'

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-5 p-6 text-center">
      <LotusIcon className="h-10 text-gold" />
      <h1 className="deco-title text-2xl font-light">Página no encontrada</h1>
      <DecoDivider className="w-40" />
      <p className="font-serif text-lg italic text-muted-foreground">
        Esta página se perdió entre los estantes.
      </p>
      <Button asChild variant="outline">
        <Link to="/">Volver al santuario</Link>
      </Button>
    </main>
  )
}
