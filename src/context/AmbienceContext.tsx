import { useEffect, useState, type ReactNode } from 'react'
import { AmbienceEngine, type AmbienceId } from '@/lib/ambience'
import { AmbienceContext } from './ambience-context'

const STORAGE_KEY = 'libellus:ambience'

interface Levels {
  volumes: Record<AmbienceId, number>
  masterVolume: number
}

const DEFAULT_LEVELS: Levels = {
  volumes: { rain: 0.7, piano: 0.5, forest: 0.6 },
  masterVolume: 0.8,
}

function loadLevels(): Levels {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_LEVELS
    const saved = JSON.parse(raw) as Partial<Levels>
    return {
      volumes: { ...DEFAULT_LEVELS.volumes, ...saved.volumes },
      masterVolume: saved.masterVolume ?? DEFAULT_LEVELS.masterVolume,
    }
  } catch {
    return DEFAULT_LEVELS
  }
}

// Un solo motor para toda la app: el sonido sobrevive a los cambios de ruta
const engine = new AmbienceEngine()

export function AmbienceProvider({ children }: { children: ReactNode }) {
  const [levels, setLevels] = useState<Levels>(() => {
    const initial = loadLevels()
    engine.setMasterVolume(initial.masterVolume)
    return initial
  })
  const [playing, setPlaying] = useState<AmbienceId[]>([])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(levels))
    } catch {
      // Sin almacenamiento: los niveles duran la sesión
    }
  }, [levels])

  const value = {
    playing,
    volumes: levels.volumes,
    masterVolume: levels.masterVolume,
    toggle: (id: AmbienceId) => {
      if (playing.includes(id)) {
        engine.stop(id)
        setPlaying(playing.filter((p) => p !== id))
      } else {
        engine.start(id, levels.volumes[id])
        setPlaying([...playing, id])
      }
    },
    setVolume: (id: AmbienceId, volume: number) => {
      engine.setVolume(id, volume)
      setLevels((l) => ({ ...l, volumes: { ...l.volumes, [id]: volume } }))
    },
    setMasterVolume: (volume: number) => {
      engine.setMasterVolume(volume)
      setLevels((l) => ({ ...l, masterVolume: volume }))
    },
    stopAll: () => {
      engine.stopAll()
      setPlaying([])
    },
    prime: () => engine.prime(),
    chime: () => engine.chime(),
  }

  return <AmbienceContext.Provider value={value}>{children}</AmbienceContext.Provider>
}
