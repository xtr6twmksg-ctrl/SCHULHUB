/**
 * Zugriff auf Transitous (https://transitous.org), einen freien, gemeinnützigen
 * Fahrplandienst auf Basis von MOTIS. Für Braunschweig nutzt er die offiziellen
 * GTFS-Fahrplandaten (u. a. der BSVG) und – wo vorhanden – Echtzeitdaten.
 *
 * Nutzungsbedingungen: https://transitous.org/api/
 *  - jede Anfrage braucht einen User-Agent mit Kontaktmöglichkeit
 *  - nur nicht-kommerzielle Open-Source-Projekte
 *  - Quellenangabe mit Link auf https://transitous.org/sources/
 */

const BASE = 'https://api.transitous.org/api'

/** Mittelpunkt von Braunschweig – für die Gewichtung der Haltestellensuche */
export const BS_CENTER = { lat: 52.2643, lon: 10.5236 }

export class TransitError extends Error {}

function userAgent(): string {
  const contact = process.env.TRANSIT_CONTACT?.trim() || 'Kontakt nicht konfiguriert'
  return `SchulhubBS/0.1 (${contact})`
}

export async function transitGet<T>(path: string, params: Record<string, string | number | boolean>): Promise<T> {
  const url = new URL(BASE + path)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
  let response: Response
  try {
    response = await fetch(url, {
      headers: { 'user-agent': userAgent(), accept: 'application/json' },
      signal: AbortSignal.timeout(12_000),
    })
  } catch {
    throw new TransitError('Der Fahrplandienst ist gerade nicht erreichbar.')
  }
  if (!response.ok) throw new TransitError(`Der Fahrplandienst antwortet mit Status ${response.status}.`)
  return (await response.json()) as T
}

export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLon = (b.lon - a.lon) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(h))
}

/** Verspätung in Minuten, aber nur wenn wirklich Echtzeitdaten vorliegen. */
export function delayMinutes(realTime: boolean, scheduled?: string, actual?: string): number | null {
  if (!realTime || !scheduled || !actual) return null
  return Math.round((Date.parse(actual) - Date.parse(scheduled)) / 60_000)
}

// --- Typen der MOTIS-API (nur die genutzten Felder) ---

export interface MotisPlace {
  name: string
  lat: number
  lon: number
  stopId?: string
  arrival?: string
  departure?: string
  scheduledArrival?: string
  scheduledDeparture?: string
  track?: string
  cancelled?: boolean
}

export interface MotisMatch {
  type: 'ADDRESS' | 'PLACE' | 'STOP'
  name: string
  id: string
  lat: number
  lon: number
  areas?: { name: string }[]
}

export interface MotisStopTime {
  place: MotisPlace
  mode: string
  realTime: boolean
  headsign: string
  agencyName: string
  tripId: string
  routeShortName: string
  displayName?: string
  routeColor?: string
  routeTextColor?: string
  cancelled: boolean
  tripCancelled: boolean
}

export interface MotisLeg {
  mode: string
  startTime: string
  endTime: string
  scheduledStartTime: string
  scheduledEndTime: string
  realTime: boolean
  duration: number
  from: MotisPlace
  to: MotisPlace
  headsign?: string
  routeShortName?: string
  displayName?: string
  routeColor?: string
  routeTextColor?: string
  cancelled?: boolean
}

export interface MotisItinerary {
  duration: number
  startTime: string
  endTime: string
  transfers: number
  legs: MotisLeg[]
}
