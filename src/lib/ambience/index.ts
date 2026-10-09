import { createForest } from './forest'
import { createPiano } from './piano'
import { createRain } from './rain'
import type { AmbienceSource, CreateSource } from './shared'

export type AmbienceId = 'rain' | 'piano' | 'forest'

export const AMBIENCES: { id: AmbienceId; label: string; description: string }[] = [
  { id: 'rain', label: 'Lluvia', description: 'Gotas sobre la ventana' },
  { id: 'piano', label: 'Piano', description: 'Arpegios lentos y serenos' },
  { id: 'forest', label: 'Bosque', description: 'Viento, hojas y pájaros' },
]

const FACTORIES: Record<AmbienceId, CreateSource> = {
  rain: createRain,
  piano: createPiano,
  forest: createForest,
}

const FADE = 1.2

interface Channel {
  gain: GainNode
  source: AmbienceSource
}

/** Mezclador de ambientes: un GainNode por canal hacia un master. */
export class AmbienceEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private channels = new Map<AmbienceId, Channel>()
  private masterVolume = 0.8

  /** Debe llamarse desde un gesto del usuario (requisito de autoplay). */
  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.master = new GainNode(this.ctx, { gain: this.masterVolume })
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  /** Prepara el audio dentro de un gesto para poder sonar después (p. ej. al acabar el timer). */
  prime() {
    this.ensureContext()
  }

  /** Campana suave de fin de sesión. */
  chime() {
    const ctx = this.ensureContext()
    const out = new GainNode(ctx, { gain: 0.25 })
    out.connect(ctx.destination)
    const t = ctx.currentTime + 0.05
    // Dos campanadas en quinta, con parciales inarmónicos de campana
    ;[[880, 0], [1318.5, 0.45]].forEach(([f, delay]) => {
      for (const [ratio, gain] of [[1, 0.6], [2.76, 0.2], [5.4, 0.08]]) {
        const osc = new OscillatorNode(ctx, { type: 'sine', frequency: f * ratio })
        const env = new GainNode(ctx, { gain: 0 })
        env.gain.setValueAtTime(0, t + delay)
        env.gain.linearRampToValueAtTime(gain, t + delay + 0.01)
        env.gain.exponentialRampToValueAtTime(0.0001, t + delay + 3.5 / ratio)
        osc.connect(env).connect(out)
        osc.start(t + delay)
        osc.stop(t + delay + 4)
      }
    })
    window.setTimeout(() => out.disconnect(), 5000)
  }

  start(id: AmbienceId, volume: number) {
    if (this.channels.has(id)) return
    const ctx = this.ensureContext()
    const gain = new GainNode(ctx, { gain: 0 })
    gain.connect(this.master!)
    gain.gain.setTargetAtTime(volume, ctx.currentTime, FADE / 3)
    this.channels.set(id, { gain, source: FACTORIES[id](ctx, gain) })
  }

  stop(id: AmbienceId) {
    const channel = this.channels.get(id)
    if (!channel || !this.ctx) return
    this.channels.delete(id)
    channel.gain.gain.setTargetAtTime(0, this.ctx.currentTime, FADE / 4)
    window.setTimeout(() => {
      channel.source.stop()
      channel.gain.disconnect()
    }, FADE * 1000 + 200)
  }

  stopAll() {
    for (const id of [...this.channels.keys()]) this.stop(id)
  }

  setVolume(id: AmbienceId, volume: number) {
    const channel = this.channels.get(id)
    if (channel && this.ctx) channel.gain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.1)
  }

  setMasterVolume(volume: number) {
    this.masterVolume = volume
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.1)
  }
}
