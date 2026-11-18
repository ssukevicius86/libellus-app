import { useLocation } from 'react-router'

/** Ruta a la que volver después de ingresar (la guarda ProtectedRoute en el state). */
export function useRedirectTarget() {
  const location = useLocation()
  return (location.state as { from?: string } | null)?.from ?? '/'
}
