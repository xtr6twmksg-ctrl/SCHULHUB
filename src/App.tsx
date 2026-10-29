import { CalendarDays, House, Mail as MailIcon, Settings, TramFront, type LucideIcon } from 'lucide-react'
import { AppProvider, useApp, useRoute, type Route } from './lib/app'
import { Notice } from './components/ui'
import { Dashboard } from './pages/Dashboard'
import { Timetable } from './pages/Timetable'
import { Transit } from './pages/Transit'
import { Mail } from './pages/Mail'
import { More } from './pages/More'

const TABS: { route: Route; label: string; icon: LucideIcon }[] = [
  { route: 'start', label: 'Start', icon: House },
  { route: 'stundenplan', label: 'Stundenplan', icon: CalendarDays },
  { route: 'fahrplan', label: 'Fahrplan', icon: TramFront },
  { route: 'mail', label: 'E-Mail', icon: MailIcon },
  { route: 'mehr', label: 'Mehr', icon: Settings },
]

const PAGES: Record<Route, () => React.JSX.Element> = {
  start: Dashboard,
  stundenplan: Timetable,
  fahrplan: Transit,
  mail: Mail,
  mehr: More,
}

export default function App() {
  const [route, navigate] = useRoute()
  const Page = PAGES[route]
  return (
    <AppProvider navigate={navigate}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2">
        Zum Inhalt springen
      </a>
      <TabBar route={route} navigate={navigate} />
      <main id="main" className="pt-safe mx-auto max-w-5xl px-4 pb-32 md:px-8 md:pt-28 md:pb-16">
        <ConfigError />
        <Page key={route} />
      </main>
    </AppProvider>
  )
}

function ConfigError() {
  const { configError } = useApp()
  if (!configError) return null
  return (
    <div className="mb-4">
      <Notice tone="error" title="Server nicht erreichbar">
        {configError}
      </Notice>
    </div>
  )
}

function TabBar({ route, navigate }: { route: Route; navigate: (r: Route) => void }) {
  return (
    <nav
      aria-label="Hauptnavigation"
      className="glass-strong pb-safe fixed inset-x-3 bottom-3 z-40 rounded-[1.75rem] px-1.5 pt-1.5 md:inset-x-auto md:top-5 md:bottom-auto md:left-1/2 md:-translate-x-1/2 md:rounded-full md:p-1.5"
    >
      <ul className="flex items-stretch justify-around gap-1">
        <li className="hidden items-center pr-3 pl-4 md:flex">
          <span className="text-sm font-extrabold tracking-tight whitespace-nowrap text-navy-900">
            SCHULHUB <span className="text-navy-600">BS</span>
          </span>
        </li>
        {TABS.map(({ route: r, label, icon: Icon }) => {
          const active = r === route
          return (
            <li key={r} className="flex-1 md:flex-none">
              <a
                href={`#/${r}`}
                onClick={(e) => {
                  e.preventDefault()
                  navigate(r)
                }}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[1.25rem] px-1 text-[0.68rem] font-semibold transition duration-300 md:min-h-11 md:flex-row md:gap-2 md:rounded-full md:px-4 md:text-sm ${
                  active ? 'bg-navy-800 text-white shadow-md shadow-navy-900/25' : 'text-muted hover:text-navy-900'
                }`}
              >
                <Icon size={21} strokeWidth={active ? 2.4 : 2} aria-hidden className="md:size-[18px]" />
                {label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
