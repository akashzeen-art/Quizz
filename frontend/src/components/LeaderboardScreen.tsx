import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  Crown,
  Medal,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import * as api from '../api/client'
import type { LeaderboardEntryDto, LeaderboardSort } from '../types'
import { useApp } from '../context/AppContext'
import { canJoinQuiz } from '../lib/quizEvents'
import { AppBottomNav } from './AppBottomNav'
import { Skeleton } from './ui/Skeleton'

const SORTS: { id: LeaderboardSort; label: string; hint: string }[] = [
  { id: 'total', label: 'All-time', hint: 'Career score' },
  { id: 'weekly', label: 'This week', hint: 'Resets each week' },
  { id: 'monthly', label: 'This month', hint: 'Monthly climb' },
  { id: 'points', label: 'Skill pts', hint: 'Quiz skill points' },
]

function scoreForSort(row: LeaderboardEntryDto, sort: LeaderboardSort): number {
  const n = (v: number | undefined | null) => Number(v ?? 0)
  switch (sort) {
    case 'weekly':
      return n(row.weeklyScore)
    case 'monthly':
      return n(row.monthlyScore)
    case 'points':
      return n(row.points)
    default:
      return n(row.totalScore)
  }
}

function initial(displayName: string) {
  const t = displayName.trim()
  if (!t) return '?'
  return t.slice(0, 1).toUpperCase()
}

export function LeaderboardScreen() {
  const navigate = useNavigate()
  const { user } = useApp()
  const [sort, setSort] = useState<LeaderboardSort>('total')
  const [rows, setRows] = useState<LeaderboardEntryDto[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (silent?: boolean) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    try {
      const data = await api.fetchLeaderboard(sort)
      setRows(data)
    } catch (e) {
      toast.error(api.getApiErrorMessage(e))
      setRows([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [sort])

  useEffect(() => {
    void load()
  }, [load])

  const myRow = useMemo(() => {
    if (!user?.id || !rows) return null
    return rows.find((r) => r.userId === user.id) ?? null
  }, [rows, user?.id])

  const showPodium = (rows?.length ?? 0) >= 3
  const top3 = showPodium && rows ? rows.slice(0, 3) : []
  const rest =
    showPodium && rows ? rows.slice(3) : rows ?? []

  async function openFirstQuiz() {
    try {
      const list = await api.fetchQuizList()
      const hit = list.find((q) => canJoinQuiz(q))
      if (hit) navigate(`/quiz/${hit.id}/loading`)
      else if (list.length)
        toast.message('No joinable quiz now — open Events for the schedule')
      else toast.message('No quizzes yet')
    } catch {
      toast.error('Could not load quizzes')
    }
  }

  return (
    <div className="app-screen min-h-[100dvh] pb-bottom-nav">
      <header className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-950 px-4 pb-10 shadow-[0_12px_40px_-8px_rgba(91,33,182,0.35)] safe-pt-header">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-8 left-10 h-32 w-32 rounded-full bg-amber-400/20 blur-2xl"
          aria-hidden
        />

        <div className="relative flex items-center justify-between gap-3">
          <button
            type="button"
            aria-label="Back"
            className="rounded-xl p-2 text-white hover:bg-white/10"
            onClick={() => navigate('/home')}
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2 text-white/90">
            <button
              type="button"
              className="rounded-xl p-2 hover:bg-white/10 disabled:opacity-40"
              disabled={loading || refreshing}
              aria-label="Refresh leaderboard"
              onClick={() => void load(true)}
            >
              <RefreshCw
                className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mt-4 text-center"
        >
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
            <Sparkles className="h-3 w-3" />
            Live standings
          </div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white">
            Leaderboard
          </h1>
          <p className="mx-auto mt-1 max-w-sm text-sm text-white/75">
            Rankings update when players finish quizzes. Switch tabs to compare
            scores.
          </p>
        </motion.div>
      </header>

      <div className="relative z-10 -mt-6 px-4">
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SORTS.map((s) => {
            const active = sort === s.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSort(s.id)}
                className={`shrink-0 rounded-2xl border px-4 py-2.5 text-left transition ${
                  active
                    ? 'border-violet-500 bg-white text-violet-900 shadow-md shadow-violet-500/15'
                    : 'border-slate-200/80 bg-white/80 text-slate-600 backdrop-blur-sm'
                }`}
              >
                <p className="text-xs font-bold">{s.label}</p>
                <p className="text-[10px] text-slate-500">{s.hint}</p>
              </button>
            )
          })}
        </div>

        {user && !myRow && !loading && rows && rows.length > 0 && (
          <p className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm text-slate-600 shadow-sm">
            You&apos;re outside the top 100 on this view. Play quizzes to climb the
            ranks.
          </p>
        )}

        {myRow && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center justify-between rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-bold text-white shadow">
                #{myRow.rank}
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800/80">
                  You
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {myRow.displayName}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-black tabular-nums text-violet-700">
                {scoreForSort(myRow, sort).toLocaleString()}
              </p>
              <p className="text-[10px] font-medium text-slate-500">
                {SORTS.find((s) => s.id === sort)?.label}
              </p>
            </div>
          </motion.div>
        )}

        <section className="mt-5">
          {loading ? (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : !rows?.length ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-500">
              <TrendingUp className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 font-semibold text-slate-700">No players yet</p>
              <p className="mt-1 text-sm">Play a quiz to appear on the board.</p>
              <button
                type="button"
                className="mt-6 rounded-full bg-violet-600 px-6 py-2.5 text-sm font-bold text-white"
                onClick={() => void openFirstQuiz()}
              >
                Play now
              </button>
            </div>
          ) : (
            <>
              {top3.length > 0 && (
                <div className="mb-6 flex items-end justify-center gap-2 sm:gap-4">
                  <AnimatePresence mode="popLayout">
                    {[1, 0, 2].map((idx) => {
                      const row = top3[idx]
                      if (!row) return null
                      const order = idx + 1
                      const h =
                        order === 1 ? 'h-36' : order === 2 ? 'h-28' : 'h-24'
                      const score = scoreForSort(row, sort)
                      return (
                        <motion.div
                          key={row.userId + sort}
                          layout
                          initial={{ opacity: 0, y: 24 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ type: 'spring', damping: 22, delay: order * 0.05 }}
                          className={`flex w-[30%] max-w-[7.5rem] flex-col items-center ${
                            order === 1 ? 'z-10' : ''
                          }`}
                        >
                          <div
                            className={`relative flex w-full flex-col items-center rounded-2xl border-2 bg-white shadow-lg ${
                              order === 1
                                ? 'border-amber-400 shadow-amber-500/20'
                                : order === 2
                                  ? 'border-slate-200'
                                  : 'border-amber-700/30'
                            } ${h} justify-end pb-3 pt-2`}
                          >
                            {order === 1 && (
                              <Crown className="absolute -top-7 h-8 w-8 text-amber-400 drop-shadow" />
                            )}
                            {order === 2 && (
                              <Medal className="absolute -top-6 h-7 w-7 text-slate-400" />
                            )}
                            {order === 3 && (
                              <Medal className="absolute -top-6 h-7 w-7 text-amber-700" />
                            )}
                            <div
                              className={`mb-2 flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white shadow-inner ${
                                order === 1
                                  ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                                  : order === 2
                                    ? 'bg-gradient-to-br from-slate-400 to-slate-600'
                                    : 'bg-gradient-to-br from-amber-700 to-amber-900'
                              }`}
                            >
                              {initial(row.displayName)}
                            </div>
                            <p className="max-w-full truncate px-1 text-center text-[11px] font-bold text-slate-800">
                              {row.displayName}
                            </p>
                            <p className="mt-0.5 text-sm font-black tabular-nums text-violet-600">
                              {score.toLocaleString()}
                            </p>
                          </div>
                          <span className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            #{row.rank}
                          </span>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              )}

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Rank
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Player · all stats
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600">
                    {SORTS.find((s) => s.id === sort)?.label}
                  </span>
                </div>
                <ul className="divide-y divide-slate-100">
                  {rest.map((row, i) => {
                    const isMe = user?.id === row.userId
                    const main = scoreForSort(row, sort)
                    return (
                      <motion.li
                        key={row.userId}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(i * 0.02, 0.4) }}
                        className={`flex items-center gap-3 px-3 py-3 sm:px-4 ${
                          isMe
                            ? 'bg-violet-50/90 ring-1 ring-inset ring-violet-200/80'
                            : ''
                        }`}
                      >
                        <span className="w-8 shrink-0 text-center text-xs font-bold tabular-nums text-slate-400">
                          #{row.rank}
                        </span>
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                              isMe
                                ? 'bg-violet-600'
                                : 'bg-gradient-to-br from-slate-500 to-slate-700'
                            }`}
                          >
                            {initial(row.displayName)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {row.displayName}
                              {isMe ? (
                                <span className="ml-2 rounded-md bg-violet-600/10 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">
                                  You
                                </span>
                              ) : null}
                            </p>
                            <p className="truncate text-[10px] text-slate-500">
                              Total {row.totalScore.toLocaleString()} · W{' '}
                              {row.weeklyScore.toLocaleString()} · M{' '}
                              {row.monthlyScore.toLocaleString()} · Pts{' '}
                              {row.points.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 text-sm font-black tabular-nums text-violet-600">
                          {main.toLocaleString()}
                        </span>
                      </motion.li>
                    )
                  })}
                </ul>
              </div>

              {rows.length >= 100 && (
                <p className="mt-3 text-center text-[10px] text-slate-400">
                  Showing top 100 · keep playing to climb
                </p>
              )}
            </>
          )}
        </section>
      </div>

      <AppBottomNav
        active="leaderboard"
        onPlay={() => void openFirstQuiz()}
        onProfile={() => navigate('/profile')}
      />
    </div>
  )
}
