import { FirebaseError } from 'firebase/app'

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'El email o la contraseña no son correctos.',
  'auth/wrong-password': 'El email o la contraseña no son correctos.',
  'auth/user-not-found': 'El email o la contraseña no son correctos.',
  'auth/invalid-email': 'Ese email no es válido.',
  'auth/user-disabled': 'Esta cuenta está deshabilitada. Escribinos si creés que es un error.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese email. Probá ingresar o recuperar la contraseña.',
  'auth/weak-password': 'La contraseña es muy débil. Usá al menos 8 caracteres, con mayúsculas, minúsculas y números.',
  'auth/password-does-not-meet-requirements':
    'La contraseña no cumple los requisitos. Usá al menos 8 caracteres, con mayúsculas, minúsculas y números.',
  'auth/too-many-requests': 'Hubo demasiados intentos. Esperá unos minutos y probá de nuevo.',
  'auth/network-request-failed': 'No hay conexión. Revisá tu internet y probá de nuevo.',
  'auth/operation-not-allowed': 'El ingreso con email todavía no está habilitado.',
  'auth/popup-closed-by-user': 'Cerraste la ventana de Google antes de terminar.',
  'auth/cancelled-popup-request': 'Cerraste la ventana de Google antes de terminar.',
  'auth/popup-blocked': 'El navegador bloqueó la ventana emergente. Permitila e intentá de nuevo.',
}

/** Traduce un error de Firebase Auth a un mensaje para mostrar. */
export function authErrorMessage(err: unknown, fallback = 'Algo salió mal. Intentá de nuevo.'): string {
  if (err instanceof FirebaseError && MESSAGES[err.code]) return MESSAGES[err.code]
  console.error(err)
  return fallback
}
