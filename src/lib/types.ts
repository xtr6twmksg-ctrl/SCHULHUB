/** Antwort-Typen der eigenen API (siehe Ordner api/). */

export interface AppConfig {
  untis: { configured: boolean; loggedIn: boolean; school: string | null }
  iserv: { url: string; mailIntegration: boolean }
  transit: { provider: string }
}

export interface Lesson {
  id: number
  date: string
  start: string
  end: string
  subject: string
  subjectLong?: string
  teachers: string[]
  rooms: string[]
  classes: string[]
  status: 'normal' | 'cancelled' | 'changed' | 'exam' | 'event'
  changes: string[]
  note?: string
}

export interface TimetableResponse {
  lessons: Lesson[]
  fetchedAt: string
}

export interface Stop {
  id: string
  name: string
  lat?: number
  lon?: number
}

export interface Departure {
  id: string
  line: string
  mode: string
  headsign: string
  stop: string
  track: string | null
  scheduled: string
  expected: string
  realtime: boolean
  delayMin: number | null
  cancelled: boolean
  color: string | null
  textColor: string | null
  agency: string
}

export interface DeparturesResponse {
  stop: string | null
  departures: Departure[]
  fetchedAt: string
}

export interface Leg {
  mode: string
  line: string | null
  headsign: string | null
  from: string
  to: string
  start: string
  end: string
  scheduledStart: string
  realtime: boolean
  delayMin: number | null
  cancelled: boolean
  durationMin: number
  color: string | null
  textColor: string | null
}

export interface Itinerary {
  start: string
  end: string
  durationMin: number
  transfers: number
  legs: Leg[]
}

export interface PlanResponse {
  itineraries: Itinerary[]
  fetchedAt: string
}
