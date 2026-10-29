import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, getJSON } from './api'

interface State<T> {
  data: T | null
  error: ApiError | null
  loading: boolean
  updatedAt: Date | null
}

/**
 * Lädt JSON von der eigenen API. Optional automatische Aktualisierung,
 * die pausiert, solange die App im Hintergrund ist.
 */
export function useFetch<T>(url: string | null, refreshMs?: number) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: Boolean(url), updatedAt: null })
  const controller = useRef<AbortController | null>(null)

  const load = useCallback(async () => {
    if (!url) return
    controller.current?.abort()
    const ac = new AbortController()
    controller.current = ac
    setState((s) => ({ ...s, loading: true }))
    try {
      const data = await getJSON<T>(url, ac.signal)
      if (!ac.signal.aborted) setState({ data, error: null, loading: false, updatedAt: new Date() })
    } catch (err) {
      if (ac.signal.aborted) return
      const e = err instanceof ApiError ? err : new ApiError('Unbekannter Fehler', 0)
      // Alte Daten behalten, damit bei kurzem Netzausfall nichts verschwindet
      setState((s) => ({ ...s, error: e, loading: false }))
    }
  }, [url])

  useEffect(() => {
    setState({ data: null, error: null, loading: Boolean(url), updatedAt: null })
    void load()
    return () => controller.current?.abort()
  }, [load, url])

  useEffect(() => {
    if (!refreshMs || !url) return
    const tick = () => {
      if (document.visibilityState === 'visible') void load()
    }
    const id = window.setInterval(tick, refreshMs)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [load, refreshMs, url])

  return { ...state, reload: load }
}
