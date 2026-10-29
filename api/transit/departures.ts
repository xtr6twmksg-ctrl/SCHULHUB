import { error, json } from '../_lib/http.js'
import { TransitError, delayMinutes, transitGet, type MotisPlace, type MotisStopTime } from '../_lib/transit.js'

const STOP_ID = /^[\w:.-]{3,80}$/

/** GET /api/transit/departures?stopId=…&n=20 – nächste Abfahrten an einer Haltestelle */
export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams
  const stopId = params.get('stopId') ?? ''
  const n = Math.min(Math.max(Number(params.get('n')) || 20, 1), 40)
  if (!STOP_ID.test(stopId)) return error('Ungültige Haltestelle.', 400)

  try {
    const data = await transitGet<{ stopTimes: MotisStopTime[]; place: MotisPlace }>('/v5/stoptimes', {
      stopId,
      n,
      // Steige der gleichen Station (z. B. beide Richtungen) mit einbeziehen
      radius: 100,
      language: 'de',
    })
    const departures = data.stopTimes.map((s) => {
      const scheduled = s.place.scheduledDeparture ?? s.place.departure ?? ''
      return {
        id: `${s.tripId}|${scheduled}`,
        line: s.routeShortName || s.displayName || '?',
        mode: s.mode,
        headsign: s.headsign,
        stop: s.place.name,
        track: s.place.track ?? null,
        scheduled,
        expected: s.realTime ? (s.place.departure ?? scheduled) : scheduled,
        realtime: s.realTime,
        delayMin: delayMinutes(s.realTime, s.place.scheduledDeparture, s.place.departure),
        cancelled: s.cancelled || s.tripCancelled,
        color: s.routeColor ?? null,
        textColor: s.routeTextColor ?? null,
        agency: s.agencyName,
      }
    })
    return json(
      { stop: data.place?.name ?? null, departures, fetchedAt: new Date().toISOString() },
      200,
      { 'cache-control': 'public, s-maxage=20, max-age=0' },
    )
  } catch (err) {
    return error(err instanceof TransitError ? err.message : 'Abfahrten konnten nicht geladen werden.', 502)
  }
}
