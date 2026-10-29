import { cookieHeader, error, isSameOrigin, json, readCookie } from '../_lib/http.js'
import { SESSION_COOKIE, openSession } from '../_lib/session.js'
import { logout, untisConfig } from '../_lib/untis.js'

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return error('Ungültige Herkunft der Anfrage.', 403)
  const session = openSession(readCookie(request, SESSION_COOKIE))
  const cfg = untisConfig()
  if (session && cfg) await logout(cfg, session.sid)
  return json({ ok: true }, 200, { 'set-cookie': cookieHeader(request, SESSION_COOKIE, '', 0) })
}
