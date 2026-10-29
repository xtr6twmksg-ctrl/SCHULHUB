import { useEffect } from 'react'
import { ArrowRight, BellRing, CalendarDays, Clock, Mail, MapPin, Settings, TramFront } from 'lucide-react'
import { useApp, type Route } from '../lib/app'
import { useFavoriteStops } from '../lib/storage'
import { addDays, formatDay, greeting, isoDate, nowKey, relativeDay } from '../lib/time'
import type { DeparturesResponse, Lesson, TimetableResponse } from '../lib/types'
import { useFetch } from '../lib/useFetch'
import { DepartureRow } from '../components/transit'
import { LessonRow } from '../components/untis'
import { Button, Card, ErrorState, Notice, PageHeader, Skeleton, UpdatedAt } from '../components/ui'

export function Dashboard() {
  const today = isoDate()
  return (
    <>
      <PageHeader title={greeting()} subtitle={formatDay(today)} />
      <div className="grid gap-4 md:grid-cols-2">
        <SchoolCards today={today} />
        <TransitCard />
        <MailCard />
        <QuickAccess />
      </div>
    </>
  )
}

function useLessons(today: string) {
  const { config } = useApp()
  const loggedIn = Boolean(config?.untis.configured && config.untis.loggedIn)
  // eine Woche voraus, damit auch nach dem Wochenende die nächste Stunde gefunden wird
  return useFetch<TimetableResponse>(loggedIn ? `/api/untis/timetable?start=${today}&end=${addDays(today, 6)}` : null, 5 * 60_000)
}

function SchoolCards({ today }: { today: string }) {
  const { config, navigate, reloadConfig } = useApp()
  const { data, error, loading, updatedAt, reload } = useLessons(today)

  // Sitzung bei WebUntis abgelaufen → Anmeldestatus neu laden
  useEffect(() => {
    if (error?.code === 'not_logged_in' && config?.untis.loggedIn) void reloadConfig()
  }, [error, config, reloadConfig])

  if (!config) {
    return (
      <Card title="Nächste Stunde" icon={Clock} className="md:col-span-2">
        <Skeleton lines={2} />
      </Card>
    )
  }

  if (!config.untis.configured || !config.untis.loggedIn || error?.code === 'not_logged_in') {
    return (
      <Card title="Stundenplan" icon={CalendarDays} className="md:col-span-2">
        <Notice
          title={config.untis.configured ? 'Nicht mit WebUntis verbunden' : 'WebUntis ist noch nicht eingerichtet'}
          action={<Button onClick={() => navigate('stundenplan')} icon={ArrowRight}>Zum Stundenplan</Button>}
        >
          Stundenplan, nächste Stunde und Vertretungen erscheinen hier, sobald du verbunden bist.
        </Notice>
      </Card>
    )
  }

  const lessons = data?.lessons ?? []
  const now = nowKey()
  const next = lessons.find((l) => l.status !== 'cancelled' && `${l.date} ${l.end}` > now)
  const running = next && `${next.date} ${next.start}` <= now
  const todays = lessons.filter((l) => l.date === today)
  const schoolDays = [...new Set(lessons.map((l) => l.date))].slice(0, 2)
  const changes = lessons.filter((l) => l.status !== 'normal' && schoolDays.includes(l.date))

  return (
    <>
      <Card title={running ? 'Jetzt' : 'Nächste Stunde'} icon={Clock} action={<UpdatedAt at={updatedAt} loading={loading} onRefresh={reload} />}>
        {error && !data ? (
          <ErrorState message={error.message} onRetry={reload} offline={error.code === 'offline'} />
        ) : !data ? (
          <Skeleton lines={1} />
        ) : next ? (
          <NextLesson lesson={next} running={Boolean(running)} />
        ) : (
          <p className="text-muted">In den nächsten 7 Tagen steht kein Unterricht im Plan.</p>
        )}
      </Card>

      <Card title="Vertretungen" icon={BellRing} delay={60}>
        {!data ? (
          error ? <p className="text-sm text-muted">Nicht verfügbar.</p> : <Skeleton lines={1} />
        ) : changes.length === 0 ? (
          <p className="text-muted">Keine Änderungen für {schoolDays.map(relativeDay).join(' und ') || 'die nächsten Tage'}.</p>
        ) : (
          <ul className="space-y-2">
            {changes.slice(0, 4).map((l) => (
              <li key={l.id} className="rounded-2xl bg-white/55 p-3 text-sm">
                <p className="font-semibold">
                  {relativeDay(l.date)}, {l.start} · {l.subject}{' '}
                  <span className={l.status === 'cancelled' ? 'text-red-700' : 'text-amber-800'}>
                    {l.status === 'cancelled' ? 'entfällt' : l.status === 'exam' ? 'Prüfung' : 'geändert'}
                  </span>
                </p>
                {[...l.changes, l.note].filter(Boolean).map((c) => (
                  <p key={c} className="text-muted">{c}</p>
                ))}
              </li>
            ))}
            {changes.length > 4 && (
              <li>
                <Button variant="ghost" onClick={() => navigate('stundenplan')}>Alle {changes.length} Änderungen</Button>
              </li>
            )}
          </ul>
        )}
      </Card>

      <Card title="Heute" icon={CalendarDays} className="md:col-span-2" delay={120} action={<Button variant="ghost" onClick={() => navigate('stundenplan')}>Woche</Button>}>
        {!data ? (
          error ? <p className="text-sm text-muted">Nicht verfügbar.</p> : <Skeleton lines={3} />
        ) : todays.length === 0 ? (
          <p className="text-muted">Heute kein Unterricht laut WebUntis.</p>
        ) : (
          <ul className="space-y-2">
            {todays.map((l) => (
              <LessonRow key={l.id} lesson={l} highlight={l.id === next?.id && Boolean(running)} />
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}

function NextLesson({ lesson, running }: { lesson: Lesson; running: boolean }) {
  return (
    <div>
      <p className="text-sm font-medium text-muted">
        {running ? `bis ${lesson.end}` : `${relativeDay(lesson.date)}, ${lesson.start} – ${lesson.end}`}
      </p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-navy-900">{lesson.subjectLong || lesson.subject}</p>
      <p className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted">
        {lesson.rooms.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <MapPin size={14} aria-hidden /> Raum {lesson.rooms.join(', ')}
          </span>
        )}
        {lesson.teachers.length > 0 && <span>{lesson.teachers.join(', ')}</span>}
      </p>
      {lesson.changes.map((c) => (
        <p key={c} className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">{c}</p>
      ))}
    </div>
  )
}

function TransitCard() {
  const { navigate } = useApp()
  const { stops } = useFavoriteStops()
  const stop = stops[0]
  const { data, error, loading, updatedAt, reload } = useFetch<DeparturesResponse>(
    stop ? `/api/transit/departures?stopId=${encodeURIComponent(stop.id)}&n=8` : null,
    30_000,
  )
  const upcoming = (data?.departures ?? []).filter((d) => Date.parse(d.expected) > Date.now() - 60_000).slice(0, 4)
  const hasRealtime = upcoming.some((d) => d.realtime)

  return (
    <Card
      title={stop ? stop.name : 'Abfahrten'}
      icon={TramFront}
      delay={180}
      action={stop && <UpdatedAt at={updatedAt} loading={loading} onRefresh={reload} />}
    >
      {!stop ? (
        <Notice title="Noch keine Haltestelle gewählt" action={<Button onClick={() => navigate('fahrplan')} icon={ArrowRight}>Haltestelle wählen</Button>}>
          Markiere im Fahrplan eine Haltestelle mit dem Stern – dann erscheinen hier die nächsten Abfahrten.
        </Notice>
      ) : error && !data ? (
        <ErrorState message={error.message} onRetry={reload} offline={error.code === 'offline'} />
      ) : !data ? (
        <Skeleton lines={3} />
      ) : upcoming.length === 0 ? (
        <p className="text-muted">Keine Abfahrten in nächster Zeit.</p>
      ) : (
        <>
          <ul className="divide-y divide-navy-900/6">
            {upcoming.map((d) => (
              <DepartureRow key={d.id} d={d} />
            ))}
          </ul>
          {!hasRealtime && <p className="mt-2 text-xs text-muted">Keine Echtzeitdaten verfügbar – Zeiten laut Fahrplan.</p>}
        </>
      )}
    </Card>
  )
}

function MailCard() {
  const { config, navigate } = useApp()
  return (
    <Card title="IServ E-Mail" icon={Mail} delay={240}>
      <p className="text-muted">
        Ungelesene E-Mails können hier noch nicht angezeigt werden – IServ bietet dafür keine freigegebene Schnittstelle für Apps wie diese.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button href={config?.iserv.url ?? 'https://sp-gs.de'} icon={Mail}>IServ öffnen</Button>
        <Button variant="secondary" onClick={() => navigate('mail')}>Mehr erfahren</Button>
      </div>
    </Card>
  )
}

const QUICK: { route: Route; label: string; icon: typeof Mail }[] = [
  { route: 'stundenplan', label: 'Stundenplan', icon: CalendarDays },
  { route: 'fahrplan', label: 'Bus & Bahn', icon: TramFront },
  { route: 'mail', label: 'E-Mail', icon: Mail },
  { route: 'mehr', label: 'Einstellungen', icon: Settings },
]

function QuickAccess() {
  const { navigate } = useApp()
  return (
    <Card title="Schnellzugriff" delay={300}>
      <div className="grid grid-cols-4 gap-2">
        {QUICK.map(({ route, label, icon: Icon }) => (
          <button
            key={route}
            onClick={() => navigate(route)}
            className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl bg-white/60 text-xs font-semibold text-navy-900 transition active:scale-95 hover:bg-white"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-navy-800 text-white">
              <Icon size={19} aria-hidden />
            </span>
            {label}
          </button>
        ))}
      </div>
    </Card>
  )
}
