import { useEffect, useId, useState } from 'react'
import { Bus, Radio, Search, Star, TramFront, TrainFront, X } from 'lucide-react'
import { useFetch } from '../lib/useFetch'
import { formatTime, minutesUntil } from '../lib/time'
import type { Departure, Stop } from '../lib/types'

const MODE_LABEL: Record<string, string> = { TRAM: 'Straßenbahn', BUS: 'Bus', WALK: 'Fußweg' }
export const modeLabel = (mode: string) => MODE_LABEL[mode] ?? (mode.includes('RAIL') || mode === 'SUBURBAN' ? 'Zug' : 'Linie')

export function ModeIcon({ mode, size = 14 }: { mode: string; size?: number }) {
  if (mode === 'TRAM') return <TramFront size={size} aria-hidden />
  if (mode === 'BUS' || mode === 'COACH') return <Bus size={size} aria-hidden />
  return <TrainFront size={size} aria-hidden />
}

/** Linien-Kennzeichen. Nutzt die Linienfarbe aus den Fahrplandaten, falls vorhanden. */
export function LineBadge({ line, mode, color, textColor }: { line: string; mode: string; color?: string | null; textColor?: string | null }) {
  const valid = (c?: string | null) => (c && /^[0-9a-f]{6}$/i.test(c) ? `#${c}` : undefined)
  const bg = valid(color)
  const fallback = mode === 'TRAM' ? 'bg-navy-800 text-white' : mode === 'BUS' ? 'bg-sky-700 text-white' : 'bg-slate-700 text-white'
  return (
    <span
      className={`inline-flex h-8 min-w-11 shrink-0 items-center justify-center gap-1 rounded-xl px-2 text-sm font-bold tabular-nums ${bg ? '' : fallback}`}
      style={bg ? { background: bg, color: valid(textColor) ?? '#fff' } : undefined}
      aria-label={`${modeLabel(mode)} ${line}`}
    >
      <ModeIcon mode={mode} size={13} />
      {line}
    </span>
  )
}

/** Kennzeichnet, ob Echtzeit- oder nur Fahrplandaten vorliegen. */
export function RealtimeTag({ realtime, delayMin, cancelled }: { realtime: boolean; delayMin: number | null; cancelled?: boolean }) {
  if (cancelled) return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">Fällt aus</span>
  if (!realtime) return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Fahrplan</span>
  if (delayMin !== null && delayMin > 0)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
        <Radio size={11} aria-hidden />+{delayMin} min
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
      <Radio size={11} aria-hidden />
      pünktlich
    </span>
  )
}

export function DepartureRow({ d }: { d: Departure }) {
  const mins = minutesUntil(d.expected)
  const when = mins <= 0 ? 'jetzt' : mins < 60 ? `${mins} min` : formatTime(d.expected)
  return (
    <li className={`flex items-center gap-3 py-2.5 ${d.cancelled ? 'opacity-60' : ''}`}>
      <LineBadge line={d.line} mode={d.mode} color={d.color} textColor={d.textColor} />
      <div className="min-w-0 flex-1">
        <p className={`truncate font-semibold ${d.cancelled ? 'line-through' : ''}`}>{d.headsign}</p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span>
            {d.realtime && d.delayMin ? (
              <>
                <s className="mr-1">{formatTime(d.scheduled)}</s>
                {formatTime(d.expected)}
              </>
            ) : (
              formatTime(d.scheduled)
            )}
            {d.track ? ` · Steig ${d.track}` : ''}
          </span>
          <RealtimeTag realtime={d.realtime} delayMin={d.delayMin} cancelled={d.cancelled} />
        </p>
      </div>
      <span className="text-right text-lg font-bold text-navy-900 tabular-nums">{d.cancelled ? '—' : when}</span>
    </li>
  )
}

/** Haltestellensuche mit Vorschlagsliste */
export function StopSearch({
  label,
  placeholder = 'Haltestelle suchen',
  onSelect,
  value,
  favorites,
}: {
  label: string
  placeholder?: string
  onSelect: (stop: Stop) => void
  value?: Stop | null
  favorites?: Stop[]
}) {
  const id = useId()
  const [text, setText] = useState(value?.name ?? '')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => setText(value?.name ?? ''), [value])
  useEffect(() => {
    const t = window.setTimeout(() => setQuery(text.trim()), 300)
    return () => window.clearTimeout(t)
  }, [text])

  const searching = open && query.length >= 2 && query !== value?.name
  const { data, loading, error } = useFetch<{ stops: Stop[] }>(searching ? `/api/transit/stops?q=${encodeURIComponent(query)}` : null)
  const suggestions = searching ? (data?.stops ?? []) : open && !text ? (favorites ?? []) : []

  const choose = (s: Stop) => {
    onSelect(s)
    setText(s.name)
    setOpen(false)
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-2xl border border-white/80 bg-white/75 px-3 shadow-sm focus-within:ring-2 focus-within:ring-navy-600">
        <Search size={18} className="text-muted" aria-hidden />
        <input
          id={id}
          type="text"
          enterKeyHint="search"
          autoComplete="off"
          value={text}
          placeholder={placeholder}
          onChange={(e) => {
            setText(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          className="min-h-12 w-full bg-transparent text-base outline-none placeholder:text-slate-400"
        />
        {text && (
          <button type="button" onClick={() => (setText(''), setOpen(true))} className="grid size-9 place-items-center rounded-full text-muted hover:bg-navy-50" aria-label="Eingabe löschen">
            <X size={16} />
          </button>
        )}
      </div>
      {open && (suggestions.length > 0 || (searching && (loading || error || data))) && (
        <ul role="listbox" className="glass-strong animate-rise absolute inset-x-0 top-full z-30 mt-2 max-h-80 overflow-auto rounded-2xl p-1.5">
          {searching && loading && !data && <li className="px-3 py-3 text-sm text-muted">Suche …</li>}
          {searching && error && <li className="px-3 py-3 text-sm text-red-800">{error.message}</li>}
          {searching && data && suggestions.length === 0 && <li className="px-3 py-3 text-sm text-muted">Keine Haltestelle in Braunschweig gefunden.</li>}
          {!searching && suggestions.length > 0 && <li className="px-3 pt-2 pb-1 text-xs font-semibold text-muted uppercase">Favoriten</li>}
          {suggestions.map((s) => (
            <li key={s.id} role="option" aria-selected={false}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(s)}
                className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left hover:bg-navy-50"
              >
                {!searching && <Star size={14} className="fill-amber-400 text-amber-400" aria-hidden />}
                {s.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function SourceNote() {
  return (
    <p className="px-2 text-center text-xs leading-relaxed text-muted">
      Fahrplandaten:{' '}
      <a className="underline" href="https://transitous.org/sources/" target="_blank" rel="noopener noreferrer">
        Transitous
      </a>{' '}
      (u. a. BSVG/VBN-Fahrplandaten), Fußwege auf Basis von ©{' '}
      <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
        OpenStreetMap
      </a>
      -Mitwirkende. „Fahrplan“ = keine Echtzeitdaten verfügbar, Zeiten laut Fahrplan.
    </p>
  )
}
