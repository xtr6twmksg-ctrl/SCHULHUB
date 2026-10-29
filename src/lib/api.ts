export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message)
  }
}

async function handle<T>(response: Response): Promise<T> {
  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    // keine JSON-Antwort
  }
  if (!response.ok) {
    const b = (body ?? {}) as { error?: string; code?: string }
    throw new ApiError(b.error ?? `Fehler ${response.status}`, response.status, b.code)
  }
  return body as T
}

export async function getJSON<T>(url: string, signal?: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, { signal, credentials: 'same-origin' })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    throw new ApiError('Keine Verbindung. Bist du online?', 0, 'offline')
  }
  return handle<T>(response)
}

export async function postJSON<T>(url: string, data: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    })
  } catch {
    throw new ApiError('Keine Verbindung. Bist du online?', 0, 'offline')
  }
  return handle<T>(response)
}
