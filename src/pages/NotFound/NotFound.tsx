import { Link } from 'react-router'
import { Button } from '@/components/ui/button/button'
import { DecoDivider, LotusIcon } from '@/components/deco'
import './NotFound.css'

export default function NotFound() {
  return (
    <main className="not-found-main-1">
      <LotusIcon className="not-found-lotusicon-2" />
      <h1 className="deco-title not-found-h1-3">Página no encontrada</h1>
      <DecoDivider className="not-found-decodivider-4" />
      <p className="texto-vacio">
        Esta página se perdió entre los estantes.
      </p>
      <Button asChild variant="outline">
        <Link to="/">Volver al santuario</Link>
      </Button>
    </main>
  )
}
