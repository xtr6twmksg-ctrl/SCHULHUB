import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react'
import { ApiError, postJSON } from '../lib/api'
import { useApp } from '../lib/app'
import type { Lesson } from '../lib/types'
import { Button, Notice } from './ui'

const STATUS: Record<Lesson['status'], { label: string; cls: string } | null> = {
  normal: null,
  cancelled: { label: 'Entfällt', cls: 'bg-red-100 text-red-800' },
  changed: { label: 'Geändert', cls: 'bg-amber-100 text-amber-900' },
  exam: { label: 'Prüfung', cls: 'bg-violet-100 text-violet-800' },
  event: { label: 'Sonderveranstaltung', cls: 'bg-sky-100 text-sky-800' },
}

export function LessonRow({ lesson, highlight }: { lesson: Lesson; highlight?: boolean }) {
  const status = STATUS[lesson.status]
  const cancelled = lesson.status === 'cancelled'
  return (
    <li
      className={`flex gap-4 rounded-2xl p-3 transition ${highlight ? 'bg-navy-800 text-white shadow-lg shadow-navy-900/25' : 'bg-white/55'}`}
      aria-current={highlight ? 'time' : undefined}
    >
      <div className={`w-12 shrink-0 text-sm tabular-nums ${highlight ? 'text-navy-100' : 'text-muted'}`}>
        <p className={`font-semibold ${highlight ? 'text-white' : 'text-ink'}`}>{lesson.start}</p>
        <p>{lesson.end}</p>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`font-semibold ${cancelled ? 'line-through opacity-70' : ''}`} title={lesson.subjectLong}>
            {lesson.subjectLong && lesson.subjectLong.length < 28 ? lesson.subjectLong : lesson.subject}
          </p>
          {status && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${status.cls}`}>{status.label}</span>}
        </div>
        <p className={`text-sm ${highlight ? 'text-navy-100' : 'text-muted'}`}>
          {[lesson.rooms.join(', ') && `Raum ${lesson.rooms.join(', ')}`, lesson.teachers.join(', ')].filter(Boolean).join(' · ') || '—'}
        </p>
        {lesson.changes.map((c) => (
          <p key={c} className={`mt-1 text-sm font-medium ${highlight ? 'text-amber-200' : 'text-amber-800'}`}>
            {c}
          </p>
        ))}
        {lesson.note && <p className={`mt-1 text-sm ${highlight ? 'text-navy-100' : 'text-slate-600'}`}>{lesson.note}</p>}
      </div>
    </li>
  )
}

/** Anmeldeformular für WebUntis. Das Passwort wird nicht gespeichert. */
export function UntisLogin() {
  const { config, reloadConfig } = useApp()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (config && !config.untis.configured) {
    return (
      <Notice tone="warn" title="WebUntis ist noch nicht eingerichtet">
        Auf dem Server fehlen die Angaben zur Schule (WEBUNTIS_SERVER, WEBUNTIS_SCHOOL) oder das SESSION_SECRET. Die Anleitung dazu steht in der README unter „WebUntis einrichten“.
      </Notice>
    )
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      await postJSON('/api/untis/login', { username, password, remember })
      setPassword('')
      await reloadConfig()
    } catch (error) {
      setErr(error instanceof ApiError ? error.message : 'Anmeldung fehlgeschlagen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-muted">
        Melde dich mit deinen WebUntis-Zugangsdaten{config?.untis.school ? ` (Schule „${config.untis.school}“)` : ''} an.
      </p>
      <input
        className="min-h-12 w-full rounded-2xl border border-white/80 bg-white/80 px-4 text-base shadow-sm outline-none focus:ring-2 focus:ring-navy-600"
        placeholder="Benutzername"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        aria-label="WebUntis-Benutzername"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <div className="relative">
        <input
          className="min-h-12 w-full rounded-2xl border border-white/80 bg-white/80 px-4 pr-12 text-base shadow-sm outline-none focus:ring-2 focus:ring-navy-600"
          placeholder="Passwort"
          type={show ? 'text' : 'password'}
          autoComplete="current-password"
          aria-label="WebUntis-Passwort"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute top-1/2 right-1.5 grid size-10 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-navy-50"
          aria-label={show ? 'Passwort verbergen' : 'Passwort anzeigen'}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl bg-white/55 px-4 text-sm font-medium">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="size-5 accent-navy-800"
        />
        Angemeldet bleiben
      </label>
      {err && <Notice tone="error">{err}</Notice>}
      <Button type="submit" icon={LogIn} disabled={busy || !username || !password} className="w-full">
        {busy ? 'Anmelden …' : 'Mit WebUntis verbinden'}
      </Button>
      <p className="flex gap-2 text-xs leading-relaxed text-muted">
        <ShieldCheck size={16} className="shrink-0 text-emerald-700" aria-hidden />
        {remember
          ? 'Deine Zugangsdaten werden verschlüsselt nur auf diesem Gerät (in einem geschützten Cookie) gespeichert, damit du bis zu 90 Tage angemeldet bleibst. Nicht auf fremden Geräten verwenden.'
          : 'Dein Passwort wird nur an WebUntis weitergegeben und nirgends gespeichert. Die Anmeldung gilt bis zu 8 Stunden.'}
      </p>
    </form>
  )
}
