/**
 * Minimaler Client für die WebUntis JSON-RPC-API (Endpunkt /WebUntis/jsonrpc.do).
 *
 * Diese Schnittstelle ist von Untis dokumentiert ("WebUntis JSON-RPC API",
 * Dokument auf Anfrage bei Untis erhältlich). Sie arbeitet mit den normalen
 * WebUntis-Benutzerrechten: Man sieht nur, was man auch im Web-Portal sehen darf.
 * Es werden ausschließlich lesende Methoden verwendet.
 */

export class UntisError extends Error {
  constructor(
    message: string,
    public readonly code: number | 'network' | 'config',
  ) {
    super(message)
  }
}

export interface UntisConfig {
  server: string
  school: string
}

export function untisConfig(): UntisConfig | null {
  const server = process.env.WEBUNTIS_SERVER?.trim()
  const school = process.env.WEBUNTIS_SCHOOL?.trim()
  if (!server || !school) return null
  // Nur echte WebUntis-Hosts zulassen, damit die Funktion nicht als offener Proxy dient.
  if (!/^[a-z0-9-]+\.webuntis\.com$/i.test(server)) return null
  return { server, school }
}

/** Bekannte Fehlercodes der JSON-RPC-API */
export const UNTIS_NOT_AUTHENTICATED = -8520
export const UNTIS_BAD_CREDENTIALS = -8504
export const UNTIS_NO_RIGHT = -8509

export async function untisCall<T>(
  cfg: UntisConfig,
  method: string,
  params: unknown,
  sessionId?: string,
): Promise<T> {
  const url = `https://${cfg.server}/WebUntis/jsonrpc.do?school=${encodeURIComponent(cfg.school)}`
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json',
  }
  if (sessionId) headers.cookie = `JSESSIONID=${sessionId}`

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ id: String(Date.now()), jsonrpc: '2.0', method, params }),
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    throw new UntisError('WebUntis ist gerade nicht erreichbar.', 'network')
  }
  if (!response.ok) throw new UntisError(`WebUntis antwortet mit Status ${response.status}.`, 'network')

  const body = (await response.json()) as { result?: T; error?: { code: number; message: string } }
  if (body.error) throw new UntisError(body.error.message, body.error.code)
  return body.result as T
}

export interface AuthResult {
  sessionId: string
  personType: number
  personId: number
  klasseId?: number
}

export function authenticate(cfg: UntisConfig, user: string, password: string) {
  return untisCall<AuthResult>(cfg, 'authenticate', { user, password, client: 'SchulhubBS' })
}

export async function logout(cfg: UntisConfig, sessionId: string) {
  try {
    await untisCall(cfg, 'logout', {}, sessionId)
  } catch {
    // Abmelden ist "best effort" – die Sitzung läuft bei WebUntis ohnehin ab.
  }
}

interface Ref {
  id: number
  name?: string
  longname?: string
  orgid?: number
  orgname?: string
}

export interface RawPeriod {
  id: number
  date: number
  startTime: number
  endTime: number
  kl?: Ref[]
  te?: Ref[]
  su?: Ref[]
  ro?: Ref[]
  lstext?: string
  info?: string
  substText?: string
  lstype?: string
  code?: string
  activityType?: string
}

export function getTimetable(
  cfg: UntisConfig,
  sessionId: string,
  element: { id: number; type: number },
  startDate: number,
  endDate: number,
) {
  const fields = ['id', 'name', 'longname']
  return untisCall<RawPeriod[]>(
    cfg,
    'getTimetable',
    {
      options: {
        element,
        startDate,
        endDate,
        showInfo: true,
        showSubstText: true,
        showLsText: true,
        showStudentgroup: true,
        klasseFields: fields,
        teacherFields: fields,
        subjectFields: fields,
        roomFields: fields,
      },
    },
    sessionId,
  )
}
