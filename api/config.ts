import { json, readCookie } from './_lib/http.js'
import { SESSION_COOKIE, hasSessionSecret, openSession } from './_lib/session.js'
import { untisConfig } from './_lib/untis.js'

/** Welche Integrationen sind auf diesem Server eingerichtet? Enthält keine Geheimnisse. */
export function GET(request: Request): Response {
  const untis = untisConfig()
  return json({
    untis: {
      configured: Boolean(untis) && hasSessionSecret(),
      loggedIn: openSession(readCookie(request, SESSION_COOKIE)) !== null,
      school: untis?.school ?? null,
    },
    iserv: {
      url: process.env.ISERV_URL?.trim() || 'https://sp-gs.de',
      mailIntegration: false,
    },
    transit: { provider: 'Transitous (MOTIS)' },
  })
}
