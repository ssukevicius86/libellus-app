import {
  disconnectAll,
  lfo,
  loopSource,
  noiseBuffer,
  pick,
  rand,
  scheduler,
  type CreateSource,
} from './shared'

type BirdCall = (time: number) => number

export const createForest: CreateSource = (ctx, out) => {
  // Viento entre los árboles
  const wind = loopSource(ctx, noiseBuffer(ctx, 'brown', 8))
  const windLp = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 420, Q: 0.4 })
  const windGain = new GainNode(ctx, { gain: 0.45 })
  wind.connect(windLp).connect(windGain).connect(out)
  const gust = lfo(ctx, windGain.gain, 0.045, 0.25)
  const gustTone = lfo(ctx, windLp.frequency, 0.03, 160)

  // Hojas que se mueven
  const leaves = loopSource(ctx, noiseBuffer(ctx, 'pink'))
  const leavesBp = new BiquadFilterNode(ctx, { type: 'bandpass', frequency: 2600, Q: 0.9 })
  const leavesGain = new GainNode(ctx, { gain: 0.05 })
  leaves.connect(leavesBp).connect(leavesGain).connect(out)
  const rustle = lfo(ctx, leavesGain.gain, 0.11, 0.04)

  const birdBus = new GainNode(ctx, { gain: 0.11 })
  birdBus.connect(out)

  /** Una nota de pájaro: barrido de frecuencia con envolvente corta. */
  const chirp = (t: number, from: number, to: number, dur: number, pan: number) => {
    const osc = new OscillatorNode(ctx, { type: 'sine', frequency: from })
    const env = new GainNode(ctx, { gain: 0 })
    const panner = new StereoPannerNode(ctx, { pan })
    osc.frequency.setValueAtTime(from, t)
    osc.frequency.exponentialRampToValueAtTime(to, t + dur)
    env.gain.setValueAtTime(0, t)
    env.gain.linearRampToValueAtTime(1, t + dur * 0.2)
    env.gain.exponentialRampToValueAtTime(0.001, t + dur)
    osc.connect(env).connect(panner).connect(birdBus)
    osc.start(t)
    osc.stop(t + dur + 0.05)
    osc.onended = () => panner.disconnect()
  }

  // Distintas "especies" para que no suene repetitivo
  const species: BirdCall[] = [
    // Trino rápido descendente
    (t) => {
      const base = rand(3200, 4200)
      const pan = rand(-0.8, 0.8)
      const notes = Math.floor(rand(4, 9))
      for (let i = 0; i < notes; i++) chirp(t + i * 0.07, base, base * 0.75, 0.06, pan)
      return notes * 0.07
    },
    // Silbido de dos notas
    (t) => {
      const base = rand(2200, 2900)
      const pan = rand(-0.8, 0.8)
      chirp(t, base * 1.25, base * 1.3, 0.22, pan)
      chirp(t + 0.3, base, base * 0.95, 0.3, pan)
      return 0.6
    },
    // Gorjeo ascendente
    (t) => {
      const base = rand(2600, 3600)
      const pan = rand(-0.8, 0.8)
      chirp(t, base, base * 1.6, 0.12, pan)
      chirp(t + 0.16, base * 1.1, base * 1.7, 0.1, pan)
      return 0.3
    },
  ]

  const stopBirds = scheduler(ctx, (t) => {
    const duration = pick(species)(t)
    // A veces responde otro pájaro enseguida
    return duration + (Math.random() < 0.3 ? rand(0.2, 0.6) : rand(1.8, 6))
  }, 1.2)

  return {
    stop: () => {
      stopBirds()
      disconnectAll([wind, windLp, windGain, gust, gustTone, leaves, leavesBp, leavesGain, rustle, birdBus])
    },
  }
}
