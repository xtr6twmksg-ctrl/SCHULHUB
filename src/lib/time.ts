/** Datums- und Zeithelfer. Alle Angaben in Braunschweiger Ortszeit. */

export const TZ = 'Europe/Berlin'

const isoDateFmt = new Intl.DateTimeFormat('sv-SE', { timeZone: TZ })
const hmFmt = new Intl.DateTimeFormat('de-DE', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
const hmsFmt = new Intl.DateTimeFormat('de-DE', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

/** YYYY-MM-DD des angegebenen Zeitpunkts in Berlin */
export const isoDate = (d: Date = new Date()) => isoDateFmt.format(d)

/** "YYYY-MM-DD HH:MM" in Berlin – zum Vergleichen mit Stundenplan-Zeiten */
export const nowKey = (d: Date = new Date()) => `${isoDate(d)} ${hmFmt.format(d)}`

export const formatTime = (iso: string) => hmFmt.format(new Date(iso))
export const formatClock = (iso: string | Date) => hmsFmt.format(typeof iso === 'string' ? new Date(iso) : iso)

/** Rechnet mit einem Datum ohne Uhrzeit (YYYY-MM-DD) */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** 0 = Montag … 6 = Sonntag */
export function weekday(iso: string): number {
  return (new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7
}

export const mondayOf = (iso: string) => addDays(iso, -weekday(iso))

export function formatDay(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }) {
  return new Intl.DateTimeFormat('de-DE', { ...opts, timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`))
}

export function relativeDay(iso: string): string {
  const today = isoDate()
  if (iso === today) return 'Heute'
  if (iso === addDays(today, 1)) return 'Morgen'
  return formatDay(iso, { weekday: 'long', day: 'numeric', month: 'numeric' })
}

/** Minuten bis zu einem Zeitpunkt (gerundet, kann negativ sein) */
export const minutesUntil = (iso: string) => Math.round((Date.parse(iso) - Date.now()) / 60_000)

export function greeting(d: Date = new Date()): string {
  const h = Number(new Intl.DateTimeFormat('de-DE', { timeZone: TZ, hour: 'numeric', hour12: false }).format(d))
  if (h < 5) return 'Gute Nacht'
  if (h < 11) return 'Guten Morgen'
  if (h < 17) return 'Hallo'
  if (h < 22) return 'Guten Abend'
  return 'Gute Nacht'
}
