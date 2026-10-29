import type { RawPeriod } from './untis.js'

/** Aufbereitete Unterrichtsstunde, so wie sie die App anzeigt. */
export interface Lesson {
  id: number
  date: string // YYYY-MM-DD
  start: string // HH:MM
  end: string // HH:MM
  subject: string
  subjectLong?: string
  teachers: string[]
  rooms: string[]
  classes: string[]
  status: 'normal' | 'cancelled' | 'changed' | 'exam' | 'event'
  changes: string[]
  note?: string
}

const pad = (n: number) => String(n).padStart(2, '0')

export function untisDateToIso(d: number): string {
  const s = String(d)
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
}

export function untisTime(t: number): string {
  return `${pad(Math.floor(t / 100))}:${pad(t % 100)}`
}

const label = (r: { name?: string; longname?: string }) => r.name || r.longname || '?'

export function toLesson(p: RawPeriod): Lesson {
  const changes: string[] = []
  for (const r of p.ro ?? []) {
    if (r.orgid !== undefined) changes.push(`Raum geändert: ${r.orgname ?? 'vorher'} → ${label(r)}`)
  }
  for (const t of p.te ?? []) {
    if (t.orgid !== undefined) changes.push(`Vertretung: ${label(t)} statt ${t.orgname ?? 'Stammlehrkraft'}`)
  }
  for (const s of p.su ?? []) {
    if (s.orgid !== undefined) changes.push(`Fach geändert: ${label(s)} statt ${s.orgname ?? 'vorher'}`)
  }

  let status: Lesson['status'] = 'normal'
  if (p.code === 'cancelled') status = 'cancelled'
  else if (p.lstype === 'ex') status = 'exam'
  else if (p.lstype === 'oh' || p.lstype === 'sb' || p.lstype === 'bs') status = 'event'
  else if (p.code === 'irregular' || changes.length > 0) status = 'changed'

  const note = [p.substText, p.info, p.lstext].filter(Boolean).join(' · ') || undefined

  return {
    id: p.id,
    date: untisDateToIso(p.date),
    start: untisTime(p.startTime),
    end: untisTime(p.endTime),
    subject: p.su?.[0] ? label(p.su[0]) : p.lstext || p.activityType || 'Unterricht',
    subjectLong: p.su?.[0]?.longname,
    teachers: (p.te ?? []).map(label),
    rooms: (p.ro ?? []).map(label),
    classes: (p.kl ?? []).map(label),
    status,
    changes,
    note,
  }
}

export function sortLessons(lessons: Lesson[]): Lesson[] {
  return lessons.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
}
