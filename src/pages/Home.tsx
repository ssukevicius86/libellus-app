import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/auth-context'

export default function Home() {
  const { user, profile, signOut } = useAuth()
  const name = profile?.displayName ?? user?.displayName ?? 'usuario'

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6">
      {profile?.photoURL && (
        <img
          src={profile.photoURL}
          alt=""
          referrerPolicy="no-referrer"
          className="size-16 rounded-full"
        />
      )}
      <h1 className="text-3xl font-semibold">Hola, {name}</h1>

      {profile ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Email</dt>
          <dd>{profile.email}</dd>
          <dt className="text-muted-foreground">Rol</dt>
          <dd>{profile.role ?? 'sin asignar'}</dd>
          <dt className="text-muted-foreground">Alta</dt>
          <dd>{profile.createdAt?.toDate().toLocaleString()}</dd>
        </dl>
      ) : (
        <p className="text-sm text-destructive">
          Perfil no disponible (revisa las reglas de Firestore).
        </p>
      )}

      <Button variant="outline" onClick={signOut}>
        <LogOut /> Salir
      </Button>
    </main>
  )
}
