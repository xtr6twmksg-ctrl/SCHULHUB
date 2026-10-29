import { error, json } from '../_lib/http.js'
import { BS_CENTER, TransitError, distanceKm, transitGet, type MotisMatch } from '../_lib/transit.js'

const norm = (s: string) => s.toLocaleLowerCase('de').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

function geocode(text: string) {
  return transitGet<MotisMatch[]>('/v1/geocode', {
    text,
    type: 'STOP',
    place: `${BS_CENTER.lat},${BS_CENTER.lon}`,
    placeBias: 50,
    numResults: 40,
    language: 'de',
  })
}

/** GET /api/transit/stops?q=Rathaus – Haltestellensuche im Raum Braunschweig */
export async function GET(request: Request): Promise<Response> {
  const q = new URL(request.url).searchParams.get('q')?.trim() ?? ''
  if (q.length < 2 || q.length > 80) return error('Bitte mindestens 2 Zeichen eingeben.', 400)

  try {
    // Der Suchdienst ist deutschlandweit. Darum zusätzlich mit "Braunschweig" suchen
    // und nur Treffer in der Region (35 km) behalten.
    const lists = await Promise.all(/braunschweig/i.test(q) ? [geocode(q)] : [geocode(q), geocode(`Braunschweig ${q}`)])
    const tokens = norm(q).split(' ').filter((t) => t && t !== 'braunschweig')

    const seen = new Set<string>()
    const stops = lists
      .flat()
      .filter((m) => m.type === 'STOP' && distanceKm(m, BS_CENTER) < 35)
      .filter((m) => (seen.has(m.name) ? false : (seen.add(m.name), true)))
      .map((m) => {
        const name = norm(m.name)
        const hits = tokens.filter((t) => name.includes(t)).length
        // Ranking: passt zum Suchtext > liegt in Braunschweig > Entfernung
        const score = hits * 100 + (name.startsWith('braunschweig') ? 20 : 0) - distanceKm(m, BS_CENTER)
        return { m, hits, score }
      })
      .filter(({ hits }) => tokens.length === 0 || hits > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(({ m }) => ({ id: m.id, name: m.name, lat: m.lat, lon: m.lon }))
    return json({ stops }, 200, { 'cache-control': 'public, s-maxage=86400, max-age=300' })
  } catch (err) {
    return error(err instanceof TransitError ? err.message : 'Suche fehlgeschlagen.', 502)
  }
}
