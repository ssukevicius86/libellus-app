import { useState, type ComponentProps } from 'react'
import { Download } from 'lucide-react'
import { useInstallApp } from '@/hooks/useInstallApp'
import { Button } from '@/components/ui/button/button'

const MESSAGES = {
  installed: '¡Libellus quedó instalada!',
  dismissed: 'Instalación cancelada.',
  error: 'No se pudo iniciar la instalación.',
} as const

type Props = Omit<ComponentProps<typeof Button>, 'onClick' | 'children'> & {
  label?: string
}

/** Botón para instalar la PWA. No se muestra si el navegador no lo permite o ya está instalada. */
export function InstallAppButton({ label = 'Instalar app', ...props }: Props) {
  const { canInstall, install } = useInstallApp()
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  return (
    <>
      {canInstall && (
        <Button
          type="button"
          {...props}
          aria-disabled={busy || undefined}
          onClick={async () => {
            if (busy) return
            // aria-disabled en lugar de disabled para no perder el foco
            setBusy(true)
            setStatus(MESSAGES[await install()])
            setBusy(false)
          }}
        >
          <Download /> {label}
        </Button>
      )}
      <p role="status" className="sr-only">
        {status}
      </p>
    </>
  )
}
