/** Una fuente sonora conectada a `out`; `stop` libera nodos y timers. */
export interface AmbienceSource {
  stop(): void
}

export type CreateSource = (ctx: AudioContext, out: AudioNode) => AmbienceSource

export type NoiseColor = 'white' | 'pink' | 'brown'

export const rand = (min: number, max: number) => min + Math.random() * (max - min)
export const pick = <T>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)]
export const midiToHz = (m: number) => 440 * 2 ** ((m - 69) / 12)

/** Buffer estéreo de ruido para reproducir en bucle. */
export function noiseBuffer(ctx: AudioContext, color: NoiseColor, seconds = 6): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds)
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch)
    // Estado de los filtros de Paul Kellet (pink) e integrador (brown)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1
      if (color === 'white') {
        data[i] = white * 0.5
      } else if (color === 'pink') {
        b0 = 0.99886 * b0 + white * 0.0555179
        b1 = 0.99332 * b1 + white * 0.0750759
        b2 = 0.969 * b2 + white * 0.153852
        b3 = 0.8665 * b3 + white * 0.3104856
        b4 = 0.55 * b4 + white * 0.5329522
        b5 = -0.7616 * b5 - white * 0.016898
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
        b6 = white * 0.115926
      } else {
        last = (last + 0.02 * white) / 1.02
        data[i] = last * 3.5
      }
    }
    seamless(data)
  }
  return buffer
}

/**
 * Resta la deriva lineal para que el último sample empalme con el primero.
 * En ruido rosa/marrón el salto del bucle se oye como un "clic" periódico.
 */
export function seamless(data: Float32Array) {
  const n = data.length - 1
  const drift = data[n] - data[0]
  for (let i = 0; i <= n; i++) data[i] -= (drift * i) / n
}

export function loopSource(ctx: AudioContext, buffer: AudioBuffer): AudioBufferSourceNode {
  const src = ctx.createBufferSource()
  src.buffer = buffer
  src.loop = true
  // Arranca en un punto aleatorio para que dos capas iguales no suenen en fase
  src.start(ctx.currentTime, rand(0, buffer.duration))
  return src
}

/** LFO que modula un AudioParam alrededor de su valor actual. */
export function lfo(ctx: AudioContext, target: AudioParam, freq: number, depth: number) {
  const osc = ctx.createOscillator()
  const amount = ctx.createGain()
  osc.frequency.value = freq
  amount.gain.value = depth
  osc.connect(amount).connect(target)
  osc.start()
  return osc
}

/**
 * Programa eventos con antelación sobre el reloj del AudioContext, así siguen
 * sonando a tiempo aunque el navegador ralentice los timers en segundo plano.
 * `schedule(time)` programa un evento en `time` y devuelve segundos hasta el siguiente.
 */
export function scheduler(ctx: AudioContext, schedule: (time: number) => number, startIn = 0.3) {
  let next = ctx.currentTime + startIn
  let timer: number | undefined
  const tick = () => {
    while (next < ctx.currentTime + 1.5) next += Math.max(0.02, schedule(next))
    timer = window.setTimeout(tick, 250)
  }
  tick()
  return () => window.clearTimeout(timer)
}

/** Respuesta impulsional sintética para una reverb suave. */
export function impulseResponse(ctx: AudioContext, seconds = 3, decay = 2.5): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds)
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay
    }
  }
  return buffer
}

export function disconnectAll(nodes: AudioNode[]) {
  for (const node of nodes) {
    if (node instanceof AudioScheduledSourceNode) {
      try {
        node.stop()
      } catch {
        // Ya detenido
      }
    }
    node.disconnect()
  }
}
