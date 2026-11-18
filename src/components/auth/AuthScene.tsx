/**
 * Paisaje decorativo de las pantallas de acceso: cielo con bruma, montañas y bosque de pinos.
 * La escena es panorámica (1600×720) y se recorta con `slice`: en pantallas
 * verticales se ve el centro y en horizontales el paisaje completo.
 */

const W = 1600
const H = 720

/** Fila de pinos como un único path (triángulos escalonados), calculada una sola vez. */
function pineRow(baseY: number, spacing: number, minH: number, maxH: number, seed: number) {
  let s = seed
  const rand = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  let d = ''
  for (let x0 = -spacing; x0 <= W + spacing; x0 += spacing) {
    const x = x0 + (rand() - 0.5) * spacing * 0.6
    const h = minH + rand() * (maxH - minH)
    const w = h * 0.32
    const top = baseY - h
    // Tres pisos de ramas por pino, que bajan hasta la base de la fila
    for (let t = 0; t < 3; t++) {
      const tierTop = top + (h * t) / 4
      const tierBottom = t === 2 ? baseY + 2 : top + (h * (t + 1.6)) / 4
      const tierW = w * (0.5 + t * 0.28)
      d += `M${x.toFixed(1)} ${tierTop.toFixed(1)}L${(x + tierW).toFixed(1)} ${tierBottom.toFixed(1)}L${(x - tierW).toFixed(1)} ${tierBottom.toFixed(1)}Z`
    }
  }
  // Franja sólida desde un poco arriba de la base, para tapar los huecos entre pinos
  const solidTop = (baseY - minH * 0.8).toFixed(1)
  return d + `M-10 ${solidTop}H${W + 10}V${H}H-10Z`
}

const PINOS_LEJOS = pineRow(470, 12, 40, 70, 7)
const PINOS_MEDIO = pineRow(540, 18, 70, 120, 21)
const PINOS_CERCA = pineRow(640, 34, 150, 230, 42)

export function AuthScene({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="login-cielo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--auth-cielo-alto)" />
          <stop offset="0.55" stopColor="var(--auth-cielo-bajo)" />
        </linearGradient>
        <radialGradient id="login-sol" cx="800" cy="220" r="420" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--auth-luz)" stopOpacity="0.55" />
          <stop offset="1" stopColor="var(--auth-luz)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="login-bruma" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--auth-bruma)" stopOpacity="0" />
          <stop offset="0.6" stopColor="var(--auth-bruma)" stopOpacity="0.55" />
          <stop offset="1" stopColor="var(--auth-bruma)" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width={W} height={H} fill="url(#login-cielo)" />
      <rect width={W} height={H} fill="url(#login-sol)" />

      {/* Montañas: pico principal centrado en x=800 */}
      <path
        fill="var(--auth-montana-1)"
        d="M-10 300L120 250L230 280L330 220L430 260L520 230L600 260L640 250L690 200L730 150L765 175L800 205L840 240L890 210L940 250L1010 290L1080 240L1170 200L1260 250L1360 230L1450 270L1610 240V720H-10Z"
      />
      <path
        fill="var(--auth-montana-2)"
        d="M-10 360L100 330L210 360L320 320L420 350L520 330L600 360L650 340L710 360L770 320L830 365L900 330L960 360L1050 335L1150 365L1260 325L1370 355L1480 330L1610 350V720H-10Z"
      />
      <rect y="330" width={W} height="120" fill="url(#login-bruma)" />

      {/* Bosque, de atrás hacia adelante */}
      <path fill="var(--auth-pinos-1)" d={PINOS_LEJOS} />
      <rect y="420" width={W} height="110" fill="url(#login-bruma)" />
      <path fill="var(--auth-pinos-2)" d={PINOS_MEDIO} />
      <rect y="480" width={W} height="120" fill="url(#login-bruma)" opacity="0.7" />
      <path fill="var(--auth-pinos-3)" d={PINOS_CERCA} />
    </svg>
  )
}
