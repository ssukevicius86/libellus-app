import {
  disconnectAll,
  lfo,
  loopSource,
  noiseBuffer,
  rand,
  type CreateSource,
} from './shared'

/** Gotas pre-renderizadas en un buffer en bucle (no depende de timers). */
function dropsBuffer(ctx: AudioContext, seconds = 7): AudioBuffer {
  const sr = ctx.sampleRate
  const buffer = ctx.createBuffer(2, Math.floor(sr * seconds), sr)
  const margin = Math.floor(sr * 0.06)
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch)
    const drops = Math.floor(seconds * 55)
    for (let d = 0; d < drops; d++) {
      const start = Math.floor(rand(0, data.length - margin))
      const len = Math.floor(sr * rand(0.004, 0.02))
      const amp = rand(0.05, 0.4) ** 2
      // Ráfaga de ruido con caída exponencial y algo de resonancia
      const ring = rand(0.15, 0.45)
      let prev = 0
      for (let i = 0; i < len; i++) {
        const env = Math.exp((-6 * i) / len)
        prev = (Math.random() * 2 - 1) * (1 - ring) + prev * ring
        data[start + i] += prev * env * amp
      }
    }
  }
  return buffer
}

export const createRain: CreateSource = (ctx, out) => {
  // Siseo de fondo
  const hiss = loopSource(ctx, noiseBuffer(ctx, 'white'))
  const hissHp = new BiquadFilterNode(ctx, { type: 'highpass', frequency: 500 })
  const hissLp = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 7000 })
  const hissGain = new GainNode(ctx, { gain: 0.18 })
  hiss.connect(hissHp).connect(hissLp).connect(hissGain).connect(out)

  // Cuerpo grave de la lluvia
  const body = loopSource(ctx, noiseBuffer(ctx, 'pink'))
  const bodyBp = new BiquadFilterNode(ctx, { type: 'bandpass', frequency: 900, Q: 0.6 })
  const bodyGain = new GainNode(ctx, { gain: 0.55 })
  body.connect(bodyBp).connect(bodyGain).connect(out)

  // Gotas sobre la ventana
  const drops = loopSource(ctx, dropsBuffer(ctx))
  const dropsBp = new BiquadFilterNode(ctx, { type: 'bandpass', frequency: 3200, Q: 0.8 })
  const dropsGain = new GainNode(ctx, { gain: 0.9 })
  drops.connect(dropsBp).connect(dropsGain).connect(out)

  // La intensidad sube y baja lentamente
  const swell = lfo(ctx, bodyGain.gain, 0.05, 0.15)
  const swell2 = lfo(ctx, hissGain.gain, 0.031, 0.05)

  return {
    stop: () =>
      disconnectAll([hiss, hissHp, hissLp, hissGain, body, bodyBp, bodyGain, drops, dropsBp, dropsGain, swell, swell2]),
  }
}
