import { useCallback, useSyncExternalStore } from 'react'

/**
 * Instalación de la PWA (Web Install API con fallback a beforeinstallprompt).
 * El evento se captura a nivel de módulo porque puede dispararse antes de que
 * se monte cualquier componente.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface Navigator {
    install?: (options?: { manifest: string; manifestId?: string }) => Promise<unknown>
  }
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}

export type InstallResult = 'installed' | 'dismissed' | 'error'

const supportsWebInstall =
  typeof Navigator !== 'undefined' && typeof Navigator.prototype.install === 'function'

let deferredPrompt: BeforeInstallPromptEvent | null = null
let installed =
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (navigator as Navigator & { standalone?: boolean }).standalone === true)

const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    installed = true
    emit()
  })
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getCanInstall = () => !installed && (supportsWebInstall || deferredPrompt !== null)

export function useInstallApp() {
  const canInstall = useSyncExternalStore(subscribe, getCanInstall, () => false)

  // Debe llamarse directamente desde el click para conservar la activación del usuario
  const install = useCallback(async (): Promise<InstallResult> => {
    try {
      if (supportsWebInstall) {
        await navigator.install!()
        installed = true
        emit()
        return 'installed'
      }
      if (deferredPrompt) {
        // El evento es de un solo uso: se descarta antes de esperar la respuesta
        const promptEvent = deferredPrompt
        deferredPrompt = null
        emit()
        await promptEvent.prompt()
        const { outcome } = await promptEvent.userChoice
        return outcome === 'accepted' ? 'installed' : 'dismissed'
      }
      return 'error'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'dismissed'
      console.error('No se pudo instalar la app', error)
      return 'error'
    }
  }, [])

  return { canInstall, install }
}
