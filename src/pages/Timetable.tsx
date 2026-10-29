import { useEffect, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, LogOut } from 'lucide-react'
import { postJSON } from '../lib/api'
import { useApp } from '../lib/app'
import { addDays, formatDay, isoDate, mondayOf, nowKey, weekday } from '../lib/time'
import type { TimetableResponse } from '../lib/types'
import { useFetch } from '../lib/useFetch'
import { LessonRow, UntisLogin } from '../components/untis'
import { Button, Card, ErrorState, PageHeader, Skeleton, UpdatedAt } from '../components/ui'

export function Timetable() {
  const { config, reloadConfig } = useApp()
  const loggedIn = Boolean(config?.untis.configured && config.untis.loggedIn)
  const today = isoDate()
  // Am Wochenende direkt die kommende Woche zeigen
  const [monday, setMonday] = useState(() => mondayOf(weekday(today) >= 5 ? addDays(today, 7) : today))
  const [day, setDay] = useState(() => (weekday(today) >= 5 ? mondayOf(addDays(today, 7)) : today))

  const { data, error, loading, updatedAt, reload } = useFetch<TimetableResponse>(
    loggedIn ? `/api/untis/timetable?start=${monday}&end=${addDays(monday, 4)}` : null,
    5 * 60_000,
  )

  useEffect(() => {
    if (error?.code === 'not_logged_in') void reloadConfig()
  }, [error, reloadConfig])

  const shiftWeek = (delta: number) => {
    const m = addDays(monday, delta * 7)
    setMonday(m)
    setDay(m)
  }

  const logout = async () => {
    await postJSON('/api/untis/logout', {}).catch(() => undefined)
    await reloadConfig()
  }

  if (!config) return <Skeleton lines={4} />

  if (!loggedIn) {
    return (
      <>
        <PageHeader title="Stundenplan" subtitle="WebUntis" />
        <Card title="Anmelden" icon={CalendarDays} className="mx-auto max-w-lg">
          <UntisLogin />
        </Card>
      </>
    )
  }

  const days = Array.from({ length: 5 }, (_, i) => addDays(monday, i))
  const lessons = (data?.lessons ?? []).filter((l) => l.date === day)
  const now = nowKey()
  const changesPerDay = (d: string) => (data?.lessons ?? []).filter((l) => l.date === d && l.status !== 'normal').length

  return (
    <>
      <PageHeader
        title="Stundenplan"
        subtitle={`KW ${weekNumber(monday)} · ${formatDay(monday, { day: 'numeric', month: 'short' })} – ${formatDay(addDays(monday, 4), { day: 'numeric', month: 'short' })}`}
        action={<UpdatedAt at={updatedAt} loading={loading} onRefresh={reload} />}
      />

      <div className="glass animate-rise mb-4 flex items-center gap-1 rounded-[1.5rem] p-1.5">
        <button onClick={() => shiftWeek(-1)} className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-white/70" aria-label="Vorherige Woche">
          <ChevronLeft size={20} />
        </button>
        <div className="grid flex-1 grid-cols-5 gap-1" role="tablist" aria-label="Wochentag">
          {days.map((d) => {
            const selected = d === day
            const n = changesPerDay(d)
            return (
              <button
                key={d}
                role="tab"
                aria-selected={selected}
                onClick={() => setDay(d)}
                className={`relative flex min-h-14 flex-col items-center justify-center rounded-2xl text-sm transition duration-300 ${
                  selected ? 'bg-navy-800 text-white shadow-md' : d === today ? 'text-navy-700 font-semibold' : 'text-ink hover:bg-white/70'
                }`}
              >
                <span className="text-xs opacity-80">{formatDay(d, { weekday: 'short' })}</span>
                <span className="text-base font-semibold tabular-nums">{formatDay(d, { day: 'numeric' })}</span>
                {n > 0 && <span className="absolute top-1.5 right-2 size-2 rounded-full bg-amber-500" aria-label={`${n} Änderungen`} />}
              </button>
            )
          })}
        </div>
        <button onClick={() => shiftWeek(1)} className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-white/70" aria-label="Nächste Woche">
          <ChevronRight size={20} />
        </button>
      </div>

      <Card title={formatDay(day)} icon={CalendarDays}>
        {error && !data ? (
          <ErrorState message={error.message} onRetry={reload} offline={error.code === 'offline'} />
        ) : !data ? (
          <Skeleton lines={5} />
        ) : lessons.length === 0 ? (
          <p className="py-6 text-center text-muted">An diesem Tag ist laut WebUntis kein Unterricht eingetragen.</p>
        ) : (
          <ul className="space-y-2">
            {lessons.map((l) => (
              <LessonRow key={l.id} lesson={l} highlight={`${l.date} ${l.start}` <= now && `${l.date} ${l.end}` > now && l.status !== 'cancelled'} />
            ))}
          </ul>
        )}
      </Card>

      <div className="mt-6 flex justify-center">
        <Button variant="ghost" icon={LogOut} onClick={logout}>
          Von WebUntis abmelden
        </Button>
      </div>
    </>
  )
}

/** ISO-Kalenderwoche */
function weekNumber(iso: string): number {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7))
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  return 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7)
}
