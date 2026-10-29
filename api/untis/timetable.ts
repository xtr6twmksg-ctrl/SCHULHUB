import { cookieHeader, error, json, readCookie } from '../_lib/http.js'
import { sortLessons, toLesson } from '../_lib/lessons.js'
import { SESSION_COOKIE, openSession, remainingSeconds, sealSession, type UntisSession } from '../_lib/session.js'
import {
  UNTIS_NOT_AUTHENTICATED,
  UNTIS_NO_RIGHT,
  UntisError,
  authenticate,
  getTimetable,
  untisConfig,
  type UntisConfig,
} from '../_lib/untis.js'

const DATE = /^\d{4}-\d{2}-\d{2}$/
const toUntisDate = (iso: string) => Number(iso.replaceAll('-', ''))

const loggedOut = (request: Request, message: string) =>
  json({ error: message, code: 'not_logged_in' }, 401, {
    'set-cookie': cookieHeader(request, SESSION_COOKIE, '', 0),
  })

/**
 * Bei "Angemeldet bleiben": neue WebUntis-Sitzung mit den gespeicherten
 * Zugangsdaten holen. Gibt null zurück, wenn das nicht (mehr) möglich ist.
 */
async function renew(cfg: UntisConfig, session: UntisSession): Promise<UntisSession | null> {
  if (!session.cred) return null
  try {
    const auth = await authenticate(cfg, session.cred.u, session.cred.p)
    return { ...session, sid: auth.sessionId, personId: auth.personId, personType: auth.personType, klasseId: auth.klasseId }
  } catch (err) {
    // Netzwerkfehler weiterreichen; abgelehnte Zugangsdaten (z. B. Passwort geändert) = abgemeldet
    if (err instanceof UntisError && err.code === 'network') throw err
    return null
  }
}

/** GET /api/untis/timetable?start=YYYY-MM-DD&end=YYYY-MM-DD – eigener Stundenplan */
export async function GET(request: Request): Promise<Response> {
  const cfg = untisConfig()
  if (!cfg) return error('WebUntis ist auf diesem Server noch nicht eingerichtet.', 503, 'not_configured')

  let session = openSession(readCookie(request, SESSION_COOKIE))
  if (!session) return error('Bitte bei WebUntis anmelden.', 401, 'not_logged_in')

  const params = new URL(request.url).searchParams
  const start = params.get('start') ?? ''
  const end = params.get('end') ?? start
  if (!DATE.test(start) || !DATE.test(end)) return error('Ungültiges Datum.', 400)
  const days = (Date.parse(end) - Date.parse(start)) / 86_400_000
  if (days < 0 || days > 14) return error('Zeitraum darf höchstens 14 Tage umfassen.', 400)

  const load = (s: UntisSession) =>
    getTimetable(cfg, s.sid, { id: s.personId, type: s.personType }, toUntisDate(start), toUntisDate(end))

  try {
    let renewed = false
    let raw
    try {
      raw = await load(session)
    } catch (err) {
      if (!(err instanceof UntisError && err.code === UNTIS_NOT_AUTHENTICATED)) throw err
      const fresh = await renew(cfg, session)
      if (!fresh) return loggedOut(request, 'Deine WebUntis-Sitzung ist abgelaufen. Bitte erneut anmelden.')
      session = fresh
      renewed = true
      raw = await load(session)
    }
    const headers: HeadersInit = renewed
      ? { 'set-cookie': cookieHeader(request, SESSION_COOKIE, sealSession(session), remainingSeconds(session)) }
      : {}
    return json({ lessons: sortLessons(raw.map(toLesson)), fetchedAt: new Date().toISOString() }, 200, headers)
  } catch (err) {
    if (err instanceof UntisError) {
      if (err.code === UNTIS_NOT_AUTHENTICATED) return loggedOut(request, 'Bitte erneut bei WebUntis anmelden.')
      if (err.code === UNTIS_NO_RIGHT) return error('Dein Konto darf diesen Stundenplan nicht abrufen.', 403, 'no_right')
      if (err.code === 'network') return error(err.message, 502, 'unreachable')
    }
    return error('Der Stundenplan konnte nicht geladen werden.', 502)
  }
}
