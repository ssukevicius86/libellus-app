import {
  disconnectAll,
  impulseResponse,
  midiToHz,
  pick,
  rand,
  scheduler,
  type CreateSource,
} from './shared'

// Progresión lenta Am – F – C – G (notas MIDI)
const CHORDS = [
  [57, 60, 64],
  [53, 57, 60],
  [48, 52, 55],
  [55, 59, 62],
]
// Pentatónica de La menor para la melodía (encaja sobre los cuatro acordes)
const MELODY = [69, 72, 74, 76, 79, 81, 84]
const CHORD_SECONDS = 9.6

export const createPiano: CreateSource = (ctx, out) => {
  const tone = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 3200, Q: 0.3 })
  const dry = new GainNode(ctx, { gain: 0.55 })
  const reverb = new ConvolverNode(ctx, { buffer: impulseResponse(ctx, 3.5, 2.8) })
  const wet = new GainNode(ctx, { gain: 0.5 })
  tone.connect(dry).connect(out)
  tone.connect(reverb).connect(wet).connect(out)

  /** Voz de "piano": fundamental + armónicos con caída exponencial. */
  const note = (t: number, midi: number, velocity: number) => {
    const f = midiToHz(midi)
    const decay = rand(2.4, 4) * (midi < 60 ? 1.4 : 1)
    const env = new GainNode(ctx, { gain: 0 })
    env.gain.setValueAtTime(0, t)
    env.gain.linearRampToValueAtTime(velocity, t + 0.006)
    env.gain.exponentialRampToValueAtTime(velocity * 0.35, t + 0.25)
    env.gain.exponentialRampToValueAtTime(0.0001, t + decay)
    env.connect(tone)

    const partials: [OscillatorType, number, number][] = [
      ['triangle', 1, 0.6],
      ['sine', 1.001, 0.5],
      ['sine', 2.002, 0.18],
      ['sine', 3.004, 0.06],
    ]
    for (const [type, ratio, gain] of partials) {
      const osc = new OscillatorNode(ctx, { type, frequency: f * ratio })
      const g = new GainNode(ctx, { gain })
      osc.connect(g).connect(env)
      osc.start(t)
      osc.stop(t + decay + 0.1)
      osc.onended = () => g.disconnect()
    }
    // Se libera al acabar la nota más larga
    window.setTimeout(() => env.disconnect(), (t - ctx.currentTime + decay + 0.3) * 1000)
  }

  const startedAt = ctx.currentTime
  let lastChord = -1

  const stopMusic = scheduler(ctx, (t) => {
    const chordIndex = Math.floor((t - startedAt) / CHORD_SECONDS) % CHORDS.length
    const chord = CHORDS[chordIndex]

    if (chordIndex !== lastChord) {
      // Al cambiar de acorde: bajo y acorde arpegiado suave
      lastChord = chordIndex
      note(t, chord[0] - 12, 0.22)
      chord.forEach((m, i) => note(t + 0.12 * (i + 1), m, 0.11))
      return rand(1.4, 2.2)
    }

    // Melodía: notas sueltas, a veces un par seguidas
    const m = pick(MELODY)
    note(t, m, rand(0.07, 0.13))
    if (Math.random() < 0.25) note(t + rand(0.25, 0.4), pick(MELODY), rand(0.05, 0.09))
    return pick([0.8, 1.2, 1.6, 2.4, 3.2])
  }, 0.2)

  return {
    stop: () => {
      stopMusic()
      disconnectAll([tone, dry, reverb, wet])
    },
  }
}
