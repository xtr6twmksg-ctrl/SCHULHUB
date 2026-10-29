/** Kleine Helfer für die API-Funktionen (Web-Standard Request/Response). */

export function json(data: unknown, status = 200, extraHeaders: HeadersInit = {}): Response {
  const headers = new Headers(extraHeaders)
  headers.set('content-type', 'application/json; charset=utf-8')
  if (!headers.has('cache-control')) headers.set('cache-control', 'no-store')
  return new Response(JSON.stringify(data), { status, headers })
}

export function error(message: string, status: number, code?: string): Response {
  return json({ error: message, code }, status)
}

/** Läuft die Anfrage über HTTPS? (Vercel setzt x-forwarded-proto) */
export function isHttps(request: Request): boolean {
  const proto = request.headers.get('x-forwarded-proto')
  if (proto) return proto.split(',')[0].trim() === 'https'
  return new URL(request.url).protocol === 'https:'
}

/**
 * Schutz gegen Cross-Site-Anfragen: Schreibende Anfragen müssen von derselben
 * Herkunft kommen wie die App selbst.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return false
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie')
  if (!header) return undefined
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    if (k === name) return decodeURIComponent(rest.join('='))
  }
  return undefined
}

export function cookieHeader(
  request: Request,
  name: string,
  value: string,
  maxAgeSeconds: number,
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/api',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAgeSeconds}`,
  ]
  if (isHttps(request)) parts.push('Secure')
  return parts.join('; ')
}
