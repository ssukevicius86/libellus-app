import { useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { Eye, EyeOff, type LucideIcon } from 'lucide-react'
import { Input } from '@/components/ui/input/input'
import { Label } from '@/components/ui/label/label'

interface FormFieldProps extends Omit<ComponentProps<'input'>, 'id'> {
  name: string
  label: string
  /** Mensaje que se muestra cuando el valor no es válido. */
  error: string
  /** Ayuda o reglas, se muestran arriba del campo para que el teclado no las tape. */
  hint?: ReactNode
  /** Contenido extra a la derecha de la etiqueta (por ej. "¿Olvidaste tu contraseña?"). */
  aside?: ReactNode
  /** Ícono decorativo dentro de un círculo a la izquierda del campo. */
  icon?: LucideIcon
}

/**
 * Campo de formulario con validación nativa. El error se muestra recién cuando el
 * navegador marca el campo como `:user-invalid` (después de editarlo y salir, o al
 * intentar enviar), y se enlaza por `aria-describedby` solo mientras está visible.
 * Los campos de contraseña incluyen un botón para mostrarla.
 */
export function FormField({
  name,
  label,
  error,
  hint,
  aside,
  icon: Icon,
  type = 'text',
  ...inputProps
}: FormFieldProps) {
  const baseId = useId()
  const inputId = `${name}-${baseId}`
  const hintId = `${inputId}-ayuda`
  const errorId = `${inputId}-error`

  const ref = useRef<HTMLInputElement>(null)
  const [invalid, setInvalid] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'

  const check = () => {
    const el = ref.current
    if (!el) return
    let userInvalid: boolean
    try {
      userInvalid = el.matches(':user-invalid')
    } catch {
      // Navegadores sin :user-invalid: validamos solo cuando el usuario ya interactuó
      userInvalid = !el.validity.valid
    }
    setInvalid(userInvalid)
  }

  // Al enviar con errores el navegador dispara `invalid` en cada campo y aplica
  // :user-invalid justo después. Lo escuchamos de forma nativa en el elemento.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onInvalid = () => setTimeout(check)
    el.addEventListener('invalid', onInvalid)
    return () => el.removeEventListener('invalid', onInvalid)
  })

  const describedBy = [hint ? hintId : null, invalid ? errorId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className="campo" data-invalido={invalid}>
      <div className="campo__cabecera">
        <Label htmlFor={inputId}>{label}</Label>
        {aside}
      </div>
      {hint && (
        <div id={hintId} className="campo__ayuda">
          {hint}
        </div>
      )}
      <div
        className={[
          'campo__control',
          isPassword && 'campo__control--con-boton',
          Icon && 'campo__control--con-icono',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {Icon && (
          <span className="campo__icono" aria-hidden="true">
            <Icon />
          </span>
        )}
        <Input
          ref={ref}
          id={inputId}
          name={name}
          type={isPassword && revealed ? 'text' : type}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          onBlur={check}
          // Al corregir, el error desaparece en cuanto el valor vuelve a ser válido
          onInput={() => invalid && check()}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            className="campo__mostrar"
            aria-label={revealed ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={revealed}
            aria-controls={inputId}
            onClick={() => setRevealed((r) => !r)}
          >
            {revealed ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </button>
        )}
      </div>
      <p id={errorId} className="campo__error">
        {error}
      </p>
    </div>
  )
}
