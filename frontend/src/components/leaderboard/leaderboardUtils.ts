import type { LeaderboardEntryDto } from '../../types'
import { dicebearUrl } from '../../constants/avatars'

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

const AVATAR_GRADIENTS = [
  'from-violet-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-sky-500 to-blue-600',
  'from-fuchsia-500 to-purple-600',
  'from-lime-500 to-green-600',
  'from-cyan-500 to-indigo-500',
]

export function avatarGradient(userId: string, isMe: boolean) {
  if (isMe) return 'from-violet-600 to-indigo-700'
  let h = 0
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length]
}

export function leaderboardAvatarUrl(row: LeaderboardEntryDto): string {
  const raw = row.avatarUrl?.trim()
  if (raw) {
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
    return raw.startsWith('/') ? raw : `/${raw}`
  }
  const seed = row.avatarSeed?.trim() || `lb-${row.userId || row.displayName || 'player'}`
  return dicebearUrl(seed)
}

export function prizeForRank(rank: number): string | undefined {
  if (rank === 1) return 'Bike'
  if (rank === 2) return '2 Door Fridge'
  if (rank === 3) return '10g Gold Coin'
  return undefined
}
