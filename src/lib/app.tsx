import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useFetch } from './useFetch'
import type { AppConfig } from './types'

export type Route = 'start' | 'stundenplan' | 'fahrplan' | 'mail' | 'mehr'
const ROUTES: Route[] = ['start', 'stundenplan', 'fahrplan', 'mail', 'mehr']

function routeFromHash(): Route {
  const r = window.location.hash.replace(/^#\/?/, '') as Route
  return ROUTES.includes(r) ? r : 'start'
}

/** Einfaches Hash-Routing (#/fahrplan) – funktioniert auch als Homescreen-App ohne Server-Regeln. */
export function useRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState<Route>(routeFromHash)
  useEffect(() => {
    const onHash = () => {
      setRoute(routeFromHash())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return [route, (r) => (window.location.hash = `/${r}`)]
}

interface AppState {
  config: AppConfig | null
  configError: string | null
  reloadConfig: () => Promise<void>
  navigate: (r: Route) => void
}

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ navigate, children }: { navigate: (r: Route) => void; children: ReactNode }) {
  const { data, error, reload } = useFetch<AppConfig>('/api/config')
  return (
    <Ctx.Provider value={{ config: data, configError: error?.message ?? null, reloadConfig: reload, navigate }}>
      {children}
    </Ctx.Provider>
  )
}

export function useApp(): AppState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp außerhalb von AppProvider')
  return ctx
}
