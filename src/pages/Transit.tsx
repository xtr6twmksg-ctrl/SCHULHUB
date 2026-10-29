import { useMemo, useState, type FormEvent } from 'react'
import { ArrowDownUp, Clock, Footprints, Route as RouteIcon, Search, Star, TramFront } from 'lucide-react'
import { useFavoriteStops } from '../lib/storage'
import { formatTime } from '../lib/time'
import type { DeparturesResponse, Itinerary, PlanResponse, Stop } from '../lib/types'
import { useFetch } from '../lib/useFetch'
import { DepartureRow, LineBadge, RealtimeTag, SourceNote, StopSearch } from '../components/transit'
import { Button, Card, ErrorState, Notice, PageHeader, Segmented, Skeleton, UpdatedAt } from '../components/ui'

type Tab = 'abfahrten' | 'verbindung'

export function Transit() {
  const [tab, setTab] = useState<Tab>('abfahrten')
  return (
    <>
      <PageHeader title="Bus & Bahn" subtitle="Braunschweig" />
      <div className="mb-4">
        <Segmented
          label="Ansicht"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'abfahrten', label: 'Abfahrten' },
            { value: 'verbindung', label: 'Verbindung' },
          ]}
        />
      </div>
      {tab === 'abfahrten' ? <Departures /> : <Planner />}
      <div className="mt-6">
        <SourceNote />
      </div>
    </>
  )
}

function Departures() {
  const { stops: favorites, isFavorite, toggle } = useFavoriteStops()
  const [stop, setStop] = useState<Stop | null>(() => favorites[0] ?? null)
  const [line, setLine] = useState<string | null>(null)

  const { data, error, loading, updatedAt, reload } = useFetch<DeparturesResponse>(
    stop ? `/api/transit/departures?stopId=${encodeURIComponent(stop.id)}&n=30` : null,
    30_000,
  )

  const departures = useMemo(
    () => (data?.departures ?? []).filter((d) => Date.parse(d.expected) > Date.now() - 60_000),
    [data],
  )
  const lines = useMemo(() => [...new Set(departures.map((d) => d.line))].sort((a, b) => a.localeCompare(b, 'de', { numeric: true })), [departures])
  const shown = line ? departures.filter((d) => d.line === line) : departures
  const realtimeCount = departures.filter((d) => d.realtime).length

  const select = (s: Stop) => {
    setStop(s)
    setLine(null)
  }

  return (
    <div className="space-y-4">
      <div className="relative z-20">
        <StopSearch label="Haltestelle suchen" onSelect={select} value={stop} favorites={favorites} />
      </div>

      {favorites.length > 0 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" aria-label="Favoriten">
          {favorites.map((f) => (
            <button
              key={f.id}
              onClick={() => select(f)}
              className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition ${
                stop?.id === f.id ? 'bg-navy-800 text-white' : 'glass text-navy-900'
              }`}
            >
              <Star size={13} className={stop?.id === f.id ? 'fill-white' : 'fill-amber-400 text-amber-400'} aria-hidden />
              {f.name.replace(/^Braunschweig,\s*/, '')}
            </button>
          ))}
        </div>
      )}

      {!stop ? (
        <Card>
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Search size={28} className="text-navy-700" aria-hidden />
            <p className="font-semibold">Haltestelle suchen</p>
            <p className="max-w-sm text-sm text-muted">Gib oben den Namen einer Haltestelle ein, z. B. „Rathaus“ oder „Hauptbahnhof“. Mit dem Stern speicherst du sie für die Startseite.</p>
          </div>
        </Card>
      ) : (
        <Card
          title={stop.name}
          icon={TramFront}
          action={
            <div className="flex items-center gap-1">
              <UpdatedAt at={updatedAt} loading={loading} onRefresh={reload} />
              <button
                onClick={() => toggle(stop)}
                className="grid size-10 place-items-center rounded-full hover:bg-white/70"
                aria-pressed={isFavorite(stop.id)}
                aria-label={isFavorite(stop.id) ? 'Aus Favoriten entfernen' : 'Als Favorit speichern'}
              >
                <Star size={20} className={isFavorite(stop.id) ? 'fill-amber-400 text-amber-400' : 'text-muted'} />
              </button>
            </div>
          }
        >
          {lines.length > 1 && (
            <div className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Nach Linie filtern">
              <button
                onClick={() => setLine(null)}
                aria-pressed={line === null}
                className={`min-h-9 shrink-0 rounded-full px-3 text-sm font-semibold ${line === null ? 'bg-navy-800 text-white' : 'bg-white/70 text-navy-900'}`}
              >
                Alle
              </button>
              {lines.map((l) => (
                <button
                  key={l}
                  onClick={() => setLine(line === l ? null : l)}
                  aria-pressed={line === l}
                  className={`min-h-9 min-w-10 shrink-0 rounded-full px-3 text-sm font-semibold tabular-nums ${line === l ? 'bg-navy-800 text-white' : 'bg-white/70 text-navy-900'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          )}

          {error && !data ? (
            <ErrorState message={error.message} onRetry={reload} offline={error.code === 'offline'} />
          ) : !data ? (
            <Skeleton lines={5} />
          ) : shown.length === 0 ? (
            <p className="py-4 text-center text-muted">Keine Abfahrten in nächster Zeit.</p>
          ) : (
            <>
              {error && <Notice tone="warn">Aktualisierung fehlgeschlagen – angezeigt wird der letzte Stand.</Notice>}
              {realtimeCount === 0 && (
                <p className="mb-1 rounded-xl bg-slate-100/80 px-3 py-2 text-xs text-slate-700">
                  Für diese Abfahrten liegen keine Echtzeitdaten vor. Alle Zeiten sind Fahrplanzeiten – Verspätungen können nicht angezeigt werden.
                </p>
              )}
              <ul className="divide-y divide-navy-900/6">
                {shown.map((d) => (
                  <DepartureRow key={d.id} d={d} />
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">Aktualisiert sich automatisch alle 30 Sekunden.</p>
            </>
          )}
        </Card>
      )}
    </div>
  )
}

function localDateTimeValue(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function Planner() {
  const { stops: favorites } = useFavoriteStops()
  const [from, setFrom] = useState<Stop | null>(null)
  const [to, setTo] = useState<Stop | null>(null)
  const [time, setTime] = useState(localDateTimeValue)
  const [arriveBy, setArriveBy] = useState(false)
  const [query, setQuery] = useState<string | null>(null)

  const { data, error, loading, updatedAt, reload } = useFetch<PlanResponse>(query)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!from || !to) return
    const params = new URLSearchParams({ from: from.id, to: to.id, arriveBy: String(arriveBy) })
    if (time) params.set('time', new Date(time).toISOString())
    setQuery(`/api/transit/plan?${params}`)
  }

  return (
    <div className="space-y-4">
      <Card>
        <form onSubmit={submit} className="space-y-3">
          <div className="relative z-30">
            <StopSearch label="Start" placeholder="Von (Haltestelle)" onSelect={setFrom} value={from} favorites={favorites} />
          </div>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => (setFrom(to), setTo(from))}
              className="grid size-10 place-items-center rounded-full bg-white/70 text-navy-800 hover:bg-white"
              aria-label="Start und Ziel tauschen"
            >
              <ArrowDownUp size={18} />
            </button>
          </div>
          <div className="relative z-20">
            <StopSearch label="Ziel" placeholder="Nach (Haltestelle)" onSelect={setTo} value={to} favorites={favorites} />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Segmented
              label="Zeitbezug"
              value={arriveBy ? 'an' : 'ab'}
              onChange={(v) => setArriveBy(v === 'an')}
              options={[
                { value: 'ab', label: 'Abfahrt' },
                { value: 'an', label: 'Ankunft' },
              ]}
            />
            <label className="flex flex-1 items-center gap-2 rounded-2xl border border-white/80 bg-white/75 px-3 shadow-sm">
              <Clock size={18} className="text-muted" aria-hidden />
              <span className="sr-only">Datum und Uhrzeit</span>
              <input type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} className="min-h-12 w-full bg-transparent text-base outline-none" />
            </label>
          </div>
          <Button type="submit" icon={RouteIcon} disabled={!from || !to || loading} className="w-full">
            {loading ? 'Suche …' : 'Verbindungen suchen'}
          </Button>
        </form>
      </Card>

      {query &&
        (error ? (
          <ErrorState message={error.message} onRetry={reload} offline={error.code === 'offline'} />
        ) : !data ? (
          <Skeleton lines={3} />
        ) : data.itineraries.length === 0 ? (
          <Notice title="Keine Verbindung gefunden">Probiere eine andere Uhrzeit oder Haltestelle.</Notice>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-end">
              <UpdatedAt at={updatedAt} loading={loading} onRefresh={reload} />
            </div>
            {data.itineraries.map((it, i) => (
              <ItineraryCard key={`${it.start}-${i}`} it={it} delay={i * 50} />
            ))}
          </div>
        ))}
    </div>
  )
}

function ItineraryCard({ it, delay }: { it: Itinerary; delay: number }) {
  const [open, setOpen] = useState(false)
  const transitLegs = it.legs.filter((l) => l.mode !== 'WALK')
  const anyRealtime = it.legs.some((l) => l.realtime)
  return (
    <Card delay={delay}>
      <button className="w-full text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-xl font-bold tabular-nums text-navy-900">
            {formatTime(it.start)} – {formatTime(it.end)}
          </p>
          <p className="text-sm text-muted">
            {it.durationMin} min · {it.transfers === 0 ? 'direkt' : `${it.transfers}× umsteigen`}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {transitLegs.length === 0 ? (
            <span className="inline-flex items-center gap-1 text-sm text-muted">
              <Footprints size={14} aria-hidden /> nur Fußweg
            </span>
          ) : (
            transitLegs.map((l, i) => <LineBadge key={i} line={l.line ?? '?'} mode={l.mode} color={l.color} textColor={l.textColor} />)
          )}
          {!anyRealtime && <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Fahrplan</span>}
        </div>
      </button>
      {open && (
        <ol className="mt-4 space-y-3 border-t border-navy-900/8 pt-4">
          {it.legs.map((l, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="w-11 shrink-0 font-semibold tabular-nums">{formatTime(l.start)}</span>
              <div className="min-w-0 flex-1">
                {l.mode === 'WALK' ? (
                  <p className="flex items-center gap-1.5 text-muted">
                    <Footprints size={14} aria-hidden /> {l.from === l.to ? 'Umsteigen' : `${l.durationMin} min Fußweg bis ${l.to}`}
                  </p>
                ) : (
                  <>
                    <p className="flex flex-wrap items-center gap-2">
                      <LineBadge line={l.line ?? '?'} mode={l.mode} color={l.color} textColor={l.textColor} />
                      <span className="font-semibold">{l.headsign ?? l.to}</span>
                      <RealtimeTag realtime={l.realtime} delayMin={l.delayMin} cancelled={l.cancelled} />
                    </p>
                    <p className="mt-1 text-muted">
                      {l.from} → {l.to} (an {formatTime(l.end)})
                    </p>
                  </>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}
