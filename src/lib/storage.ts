import { useCallback, useSyncExternalStore } from 'react'
import type { Stop } from './types'

/**
 * Lokale Einstellungen – bleiben nur auf diesem Gerät (localStorage).
 * Gespeichert werden ausschließlich Lieblings-Haltestellen, keine persönlichen Daten.
 */

const KEY = 'schulhub.favoriteStops'
const listeners = new Set<() => void>()

function read(): Stop[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(parsed)
      ? parsed.filter((s): s is Stop => typeof s?.id === 'string' && typeof s?.name === 'string')
      : []
  } catch {
    return []
  }
}

let cache = read()

function write(stops: Stop[]) {
  cache = stops
  try {
    localStorage.setItem(KEY, JSON.stringify(stops.map(({ id, name }) => ({ id, name }))))
  } catch {
    // privater Modus o. Ä. – dann nur für diese Sitzung merken
  }
  listeners.forEach((l) => l())
}

export function useFavoriteStops() {
  const stops = useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => cache,
  )
  const isFavorite = useCallback((id: string) => stops.some((s) => s.id === id), [stops])
  const toggle = useCallback(
    (stop: Stop) => write(isFavorite(stop.id) ? cache.filter((s) => s.id !== stop.id) : [stop, ...cache].slice(0, 8)),
    [isFavorite],
  )
  return { stops, isFavorite, toggle }
}
