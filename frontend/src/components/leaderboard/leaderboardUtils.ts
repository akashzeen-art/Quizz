import type { LeaderboardEntryDto } from '../../types'

export type TabId = 'total' | 'daily' | 'weekly' | 'monthly' | 'points' | 'quiz'

export const GLOBAL_SORTS: { id: TabId; label: string; hint: string }[] = [
  { id: 'total',   label: 'All-time',   hint: 'Career score' },
  { id: 'daily',   label: 'Today',      hint: 'Resets midnight' },
  { id: 'weekly',  label: 'This week',  hint: 'Resets each week' },
  { id: 'monthly', label: 'This month', hint: 'Monthly climb' },
  { id: 'points',  label: 'Skill pts',  hint: 'Quiz skill points' },
]

export function scoreForTab(row: LeaderboardEntryDto, tab: TabId): number {
  const n = (v: number | undefined | null) => Number(v ?? 0)
  switch (tab) {
    case 'daily':   return n(row.dayScore)
    case 'weekly':  return n(row.weeklyScore)
    case 'monthly': return n(row.monthlyScore)
    case 'points':  return n(row.points)
    default:        return n(row.totalScore)
  }
}

export function initial(name: string) {
  const t = name.trim(); return t ? t[0].toUpperCase() : '?'
}

export function formatTime(ms: number) {
  const s = Math.round(ms / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

export function tabLabel(t: TabId) {
  if (t === 'quiz') return 'This Quiz'
  return GLOBAL_SORTS.find(s => s.id === t)?.label ?? t
}
