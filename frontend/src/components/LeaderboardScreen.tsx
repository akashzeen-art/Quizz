import confetti from 'canvas-confetti'
import { motion } from 'framer-motion'
import { ArrowLeft, RefreshCw, Sparkles, TrendingUp, Trophy } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import * as api from '../api/client'
import type { LeaderboardEntryDto } from '../types'
import { useApp } from '../context/AppContext'
import { canJoinQuiz } from '../lib/quizEvents'
import { AppBottomNav } from './AppBottomNav'
import { Skeleton } from './ui/Skeleton'
import { LeaderboardTabs } from './leaderboard/LeaderboardTabs'
import { LeaderboardPodium } from './leaderboard/LeaderboardPodium'
import { LeaderboardRows } from './leaderboard/LeaderboardRows'
import { scoreForTab, tabLabel, formatTime, type TabId } from './leaderboard/leaderboardUtils'

export function LeaderboardScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const fromQuiz = location.state as {
    fromQuiz?: boolean; score?: number; correct?: number; total?: number; quizId?: string
  } | null
  const { user } = useApp()

  const hasQuizTab = !!fromQuiz?.fromQuiz && !!fromQuiz?.quizId
  const [tab, setTab] = useState<TabId>(hasQuizTab ? 'quiz' : 'total')
  const [rows, setRows] = useState<LeaderboardEntryDto[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [myRank, setMyRank] = useState<number | null>(null)

  const load = useCallback(async (silent?: boolean, forceRefresh?: boolean) => {
    if (silent) setRefreshing(true); else setLoading(true)
    try {
      const data = tab === 'quiz' && fromQuiz?.quizId
        ? await api.fetchQuizLeaderboardCached(fromQuiz.quizId, !!forceRefresh)
        : await api.fetchLeaderboardCached(
            tab as api.WalletBalanceDto extends never ? never : Parameters<typeof api.fetchLeaderboard>[0],
            !!forceRefresh,
          )
      setRows(data)
    } catch (e) {
      toast.error(api.getApiErrorMessage(e)); setRows([])
    } finally {
      setLoading(false); setRefreshing(false)
    }
  }, [tab, fromQuiz?.quizId])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') void load(true, false) }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  useEffect(() => {
    if (!fromQuiz?.fromQuiz) return
    const colors = ['#7c3aed', '#f59e0b', '#10b981', '#f43f5e', '#3b82f6', '#ec4899']
    confetti({ particleCount: 120, spread: 100, origin: { y: 0.5 }, colors })
    const end = Date.now() + 2500
    const cannon = () => {
      confetti({ particleCount: 10, angle: 60, spread: 65, origin: { x: 0 }, colors })
      confetti({ particleCount: 10, angle: 120, spread: 65, origin: { x: 1 }, colors })
      if (Date.now() < end) requestAnimationFrame(cannon)
    }
    setTimeout(() => requestAnimationFrame(cannon), 300)
    api.fetchMyRank('total').then(setMyRank).catch(() => {})
    const t = setTimeout(() => void load(true, true), 1500)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const myRow = useMemo(() => {
    if (!user?.id || !rows) return null
    return rows.find((r) => r.userId === user.id) ?? null
  }, [rows, user?.id])

  const showPodium = (rows?.length ?? 0) >= 3
  const top3 = showPodium && rows ? rows.slice(0, 3) : []
  const rest = showPodium && rows ? rows.slice(3) : rows ?? []

  async function openFirstQuiz() {
    try {
      const list = await api.fetchQuizList()
      const hit = list.find((q) => canJoinQuiz(q))
      if (hit) navigate(`/quiz/${hit.id}/loading`)
      else toast.message('No joinable quiz now')
    } catch { toast.error('Could not load quizzes') }
  }

  return (
    <div className="app-screen min-h-[100dvh] pb-bottom-nav">
      {/* Header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-950 px-4 pb-10 shadow-[0_12px_40px_-8px_rgba(91,33,182,0.35)] safe-pt-header">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 left-10 h-32 w-32 rounded-full bg-amber-400/20 blur-2xl" />
        <div className="relative flex items-center justify-between gap-3">
          <button type="button" aria-label="Back" className="rounded-xl p-2 text-white hover:bg-white/10" onClick={() => navigate('/home')}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <button type="button" className="rounded-xl p-2 text-white/90 hover:bg-white/10 disabled:opacity-40"
            disabled={loading || refreshing} onClick={() => void load(true, true)}>
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative mt-4 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
            <Sparkles className="h-3 w-3" /> Live standings
          </div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white">Leaderboard</h1>
          <p className="mx-auto mt-1 max-w-sm text-sm text-white/75">Rankings update after every quiz.</p>

          {fromQuiz?.fromQuiz && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.2 }}
              className="mx-auto mt-4 inline-flex items-center gap-3 rounded-2xl border border-white/20 bg-white/15 px-5 py-3 backdrop-blur-sm">
              <span className="text-2xl">🎉</span>
              <div className="text-left">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-white/60">Your result</p>
                <p className="text-lg font-extrabold tabular-nums text-white">
                  {fromQuiz.score ?? 0} pts · {fromQuiz.correct ?? 0}/{fromQuiz.total ?? 0} correct
                </p>
                {myRank && myRank > 0 && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs font-bold text-amber-300">
                    <Trophy className="h-3.5 w-3.5" /> Rank #{myRank} overall
                  </p>
                )}
              </div>
              <span className="text-2xl">✨</span>
            </motion.div>
          )}
        </motion.div>
      </header>

      <div className="relative z-10 -mt-6 px-4">
        <LeaderboardTabs tab={tab} hasQuizTab={hasQuizTab} onChange={setTab} />

        {/* My row */}
        {user && !myRow && !loading && rows && rows.length > 0 && (
          <p className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm text-slate-600 shadow-sm">
            You're outside the top 100. Play quizzes to climb!
          </p>
        )}
        {myRow && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center justify-between rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-bold text-white shadow">
                #{myRow.rank}
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800/80">You</p>
                <p className="text-sm font-bold text-slate-900">{myRow.displayName}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-black tabular-nums text-violet-700">{scoreForTab(myRow, tab).toLocaleString()}</p>
              <p className="text-[10px] font-medium text-slate-500">{tabLabel(tab)}</p>
              {tab === 'quiz' && myRow.totalTimeMs > 0 && (
                <p className="text-[10px] text-slate-400">⏱ {formatTime(myRow.totalTimeMs)}</p>
              )}
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
              <button type="button" className="mt-6 rounded-full bg-violet-600 px-6 py-2.5 text-sm font-bold text-white" onClick={() => void openFirstQuiz()}>
                Play now
              </button>
            </div>
          ) : (
            <>
              {top3.length > 0 && <LeaderboardPodium top3={top3} tab={tab} />}
              <LeaderboardRows rows={rest} tab={tab} myUserId={user?.id} />
              {rows.length >= 100 && <p className="mt-3 text-center text-[10px] text-slate-400">Showing top 100 · keep playing to climb</p>}
            </>
          )}
        </section>
      </div>

      <AppBottomNav active="leaderboard" onPlay={() => void openFirstQuiz()} />
    </div>
  )
}
