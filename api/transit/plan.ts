import { error, json } from '../_lib/http.js'
import { TransitError, delayMinutes, transitGet, type MotisItinerary } from '../_lib/transit.js'

const STOP_ID = /^[\w:.-]{3,80}$/

/** GET /api/transit/plan?from=…&to=…&time=ISO&arriveBy=false – Verbindungssuche */
export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  const time = params.get('time')
  const arriveBy = params.get('arriveBy') === 'true'
  if (!STOP_ID.test(from) || !STOP_ID.test(to)) return error('Bitte Start und Ziel auswählen.', 400)
  if (from === to) return error('Start und Ziel sind gleich.', 400)
  if (time && Number.isNaN(Date.parse(time))) return error('Ungültige Zeit.', 400)

  try {
    const data = await transitGet<{ itineraries: MotisItinerary[] }>('/v5/plan', {
      fromPlace: from,
      toPlace: to,
      ...(time ? { time: new Date(time).toISOString() } : {}),
      arriveBy,
      language: 'de',
    })
    const itineraries = data.itineraries.map((it) => ({
      start: it.startTime,
      end: it.endTime,
      durationMin: Math.round(it.duration / 60),
      transfers: it.transfers,
      legs: it.legs.map((l) => ({
        mode: l.mode,
        line: l.routeShortName || l.displayName || null,
        headsign: l.headsign ?? null,
        from: l.from.name,
        to: l.to.name,
        start: l.startTime,
        end: l.endTime,
        scheduledStart: l.scheduledStartTime,
        realtime: l.realTime,
        delayMin: delayMinutes(l.realTime, l.scheduledStartTime, l.startTime),
        cancelled: Boolean(l.cancelled),
        durationMin: Math.round(l.duration / 60),
        color: l.routeColor ?? null,
        textColor: l.routeTextColor ?? null,
      })),
    }))
    return json(
      { itineraries, fetchedAt: new Date().toISOString() },
      200,
      { 'cache-control': 'public, s-maxage=60, max-age=0' },
    )
  } catch (err) {
    return error(err instanceof TransitError ? err.message : 'Verbindungssuche fehlgeschlagen.', 502)
  }
}
