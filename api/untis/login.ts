import { cookieHeader, error, isSameOrigin, json } from '../_lib/http.js'
import { REMEMBER_MAX_AGE, SESSION_COOKIE, SESSION_MAX_AGE, hasSessionSecret, sealSession } from '../_lib/session.js'
import { UNTIS_BAD_CREDENTIALS, UntisError, authenticate, untisConfig } from '../_lib/untis.js'

/**
 * Anmeldung bei WebUntis.
 * Benutzername und Passwort werden an WebUntis weitergereicht und nie
 * protokolliert. Zurück kommt ein verschlüsseltes Cookie mit der
 * WebUntis-Sitzungskennung – bei "Angemeldet bleiben" zusätzlich mit den
 * verschlüsselten Zugangsdaten für die automatische Neuanmeldung.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return error('Ungültige Herkunft der Anfrage.', 403)
  const cfg = untisConfig()
  if (!cfg) return error('WebUntis ist auf diesem Server noch nicht eingerichtet.', 503, 'not_configured')
  if (!hasSessionSecret()) return error('SESSION_SECRET fehlt auf dem Server.', 503, 'not_configured')

  let body: { username?: unknown; password?: unknown; remember?: unknown }
  try {
    body = await request.json()
  } catch {
    return error('Ungültige Anfrage.', 400)
  }
  const username = typeof body.username === 'string' ? body.username.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!username || !password || username.length > 100 || password.length > 200) {
    return error('Bitte Benutzername und Passwort eingeben.', 400)
  }

  const remember = body.remember === true
  const maxAge = remember ? REMEMBER_MAX_AGE : SESSION_MAX_AGE

  try {
    const auth = await authenticate(cfg, username, password)
    const token = sealSession({
      sid: auth.sessionId,
      personId: auth.personId,
      personType: auth.personType,
      klasseId: auth.klasseId,
      exp: Date.now() + maxAge * 1000,
      ...(remember ? { cred: { u: username, p: password } } : {}),
    })
    return json({ ok: true }, 200, { 'set-cookie': cookieHeader(request, SESSION_COOKIE, token, maxAge) })
  } catch (err) {
    if (err instanceof UntisError) {
      if (err.code === UNTIS_BAD_CREDENTIALS) return error('Benutzername oder Passwort ist falsch.', 401, 'bad_credentials')
      if (err.code === 'network') return error(err.message, 502, 'unreachable')
      return error('WebUntis hat die Anmeldung abgelehnt.', 401, 'rejected')
    }
    return error('Anmeldung fehlgeschlagen.', 500)
  }
}
