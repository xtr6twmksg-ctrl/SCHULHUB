import { cookieHeader, error, json, readCookie } from '../_lib/http.js'
import { sortLessons, toLesson } from '../_lib/lessons.js'
import { SESSION_COOKIE, openSession } from '../_lib/session.js'
import { UNTIS_NOT_AUTHENTICATED, UNTIS_NO_RIGHT, UntisError, getTimetable, untisConfig } from '../_lib/untis.js'

const DATE = /^\d{4}-\d{2}-\d{2}$/
const toUntisDate = (iso: string) => Number(iso.replaceAll('-', ''))

/** GET /api/untis/timetable?start=YYYY-MM-DD&end=YYYY-MM-DD – eigener Stundenplan */
export async function GET(request: Request): Promise<Response> {
  const cfg = untisConfig()
  if (!cfg) return error('WebUntis ist auf diesem Server noch nicht eingerichtet.', 503, 'not_configured')

  const session = openSession(readCookie(request, SESSION_COOKIE))
  if (!session) return error('Bitte bei WebUntis anmelden.', 401, 'not_logged_in')

  const params = new URL(request.url).searchParams
  const start = params.get('start') ?? ''
  const end = params.get('end') ?? start
  if (!DATE.test(start) || !DATE.test(end)) return error('Ungültiges Datum.', 400)
  const days = (Date.parse(end) - Date.parse(start)) / 86_400_000
  if (days < 0 || days > 14) return error('Zeitraum darf höchstens 14 Tage umfassen.', 400)

  try {
    const raw = await getTimetable(
      cfg,
      session.sid,
      { id: session.personId, type: session.personType },
      toUntisDate(start),
      toUntisDate(end),
    )
    return json({ lessons: sortLessons(raw.map(toLesson)), fetchedAt: new Date().toISOString() })
  } catch (err) {
    if (err instanceof UntisError) {
      if (err.code === UNTIS_NOT_AUTHENTICATED) {
        return json(
          { error: 'Deine WebUntis-Sitzung ist abgelaufen. Bitte erneut anmelden.', code: 'not_logged_in' },
          401,
          { 'set-cookie': cookieHeader(request, SESSION_COOKIE, '', 0) },
        )
      }
      if (err.code === UNTIS_NO_RIGHT) return error('Dein Konto darf diesen Stundenplan nicht abrufen.', 403, 'no_right')
      if (err.code === 'network') return error(err.message, 502, 'unreachable')
    }
    return error('Der Stundenplan konnte nicht geladen werden.', 502)
  }
}
