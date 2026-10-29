import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

/**
 * Verschlüsseltes Sitzungs-Cookie (AES-256-GCM, HttpOnly).
 *
 * Normalfall: gespeichert wird nur die WebUntis-Sitzungskennung und die eigene
 * Personen-ID. Nur wenn "Angemeldet bleiben" gewählt wurde, liegen zusätzlich
 * Benutzername und Passwort verschlüsselt im Cookie, damit sich der Server bei
 * WebUntis automatisch neu anmelden kann. Ohne SESSION_SECRET kann niemand den
 * Inhalt lesen oder verändern, und JavaScript im Browser kommt nicht heran.
 */

export interface UntisSession {
  sid: string
  personId: number
  personType: number
  klasseId?: number
  /** Ablaufzeit in ms seit 1970 */
  exp: number
  /** Nur bei "Angemeldet bleiben" */
  cred?: { u: string; p: string }
}

export const SESSION_COOKIE = 'sh_untis'
export const SESSION_MAX_AGE = 60 * 60 * 8 // 8 Stunden
export const REMEMBER_MAX_AGE = 60 * 60 * 24 * 90 // 90 Tage

/** Verbleibende Lebensdauer des Cookies in Sekunden */
export const remainingSeconds = (session: UntisSession) => Math.max(0, Math.floor((session.exp - Date.now()) / 1000))

function key(): Buffer | null {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) return null
  return createHash('sha256').update(secret).digest()
}

export function hasSessionSecret(): boolean {
  return key() !== null
}

export function sealSession(session: UntisSession): string {
  const k = key()
  if (!k) throw new Error('SESSION_SECRET fehlt oder ist zu kurz')
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', k, iv)
  const data = Buffer.concat([cipher.update(JSON.stringify(session), 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64url')).join('.')
}

export function openSession(token: string | undefined): UntisSession | null {
  const k = key()
  if (!k || !token) return null
  try {
    const [iv, tag, data] = token.split('.').map((p) => Buffer.from(p, 'base64url'))
    const decipher = createDecipheriv('aes-256-gcm', k, iv)
    decipher.setAuthTag(tag)
    const plain = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
    const session = JSON.parse(plain) as UntisSession
    if (typeof session.exp !== 'number' || session.exp < Date.now()) return null
    return session
  } catch {
    return null
  }
}
