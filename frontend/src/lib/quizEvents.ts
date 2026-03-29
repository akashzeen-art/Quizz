import type { QuizDto } from '../types'

/** Local calendar day key `YYYY-MM-DD` (not UTC). */
export function toIsoDateLocal(d: Date): string {
  const y = d.getFullYear()
  const mo = d.getMonth() + 1
  const day = d.getDate()
  return `${y}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Primary calendar day for a quiz: start date, or end date if no start.
 * Returns null if the quiz has no schedule timestamps.
 */
export function quizCalendarDate(q: QuizDto): string | null {
  const iso = q.startsAt || q.endsAt
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return toIsoDateLocal(d)
}

/** Soonest first; unscheduled upcoming last. */
export function compareUpcoming(a: QuizDto, b: QuizDto): number {
  const ta = a.startsAt ? new Date(a.startsAt).getTime() : Number.POSITIVE_INFINITY
  const tb = b.startsAt ? new Date(b.startsAt).getTime() : Number.POSITIVE_INFINITY
  return ta - tb
}

/** Most recently finished first. */
export function comparePastRecent(a: QuizDto, b: QuizDto): number {
  const ta = new Date(a.endsAt || a.startsAt || 0).getTime()
  const tb = new Date(b.endsAt || b.startsAt || 0).getTime()
  return tb - ta
}

/** Grouping for UI: live board, scheduled, or finished. */
export function eventBucket(q: QuizDto): 'live' | 'upcoming' | 'ended' {
  const now = Date.now()
  if (q.status === 'ended') return 'ended'
  if (q.endsAt) {
    const e = new Date(q.endsAt).getTime()
    if (!Number.isNaN(e) && now > e) return 'ended'
  }
  if (q.status === 'upcoming') {
    if (q.startsAt) {
      const s = new Date(q.startsAt).getTime()
      if (!Number.isNaN(s) && now >= s) return 'live'
    }
    return 'upcoming'
  }
  return 'live'
}

export function canJoinQuiz(q: QuizDto): boolean {
  const b = eventBucket(q)
  if (b === 'ended') return false
  if (b === 'upcoming') return false
  return true
}

const dtFmt = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function formatEventInstant(iso?: string): string | null {
  if (!iso) return null
  try {
    return dtFmt.format(new Date(iso))
  } catch {
    return null
  }
}

export function formatEventWindow(q: QuizDto): string {
  const a = formatEventInstant(q.startsAt)
  const b = formatEventInstant(q.endsAt)
  if (a && b) return `${a} → ${b}`
  if (a) return `Starts ${a}`
  if (b) return `Ends ${b}`
  return 'Schedule TBA'
}
