import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  CalendarClock,
  ChevronRight,
  CircleDot,
  Clock,
  MapPin,
  Radio,
  RefreshCw,
  Trophy,
} from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import * as api from '../api/client'
import type { QuizDto } from '../types'
import {
  canJoinQuiz,
  eventBucket,
  formatEventWindow,
} from '../lib/quizEvents'
import { AppBottomNav } from './AppBottomNav'
import { Skeleton } from './ui/Skeleton'

function statusStyles(bucket: ReturnType<typeof eventBucket>) {
  switch (bucket) {
    case 'live':
      return {
        label: 'Live',
        chip: 'bg-emerald-500 text-white shadow-emerald-500/30',
        ring: 'ring-emerald-400/40',
      }
    case 'upcoming':
      return {
        label: 'Upcoming',
        chip: 'bg-amber-500 text-white shadow-amber-500/30',
        ring: 'ring-amber-400/40',
      }
    default:
      return {
        label: 'Ended',
        chip: 'bg-slate-500 text-white shadow-slate-500/20',
        ring: 'ring-slate-300/40',
      }
  }
}

function EventCard({
  q,
  onJoin,
}: {
  q: QuizDto
  onJoin: (quiz: QuizDto) => void
}) {
  const bucket = eventBucket(q)
  const st = statusStyles(bucket)
  const joinable = canJoinQuiz(q)

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`overflow-hidden rounded-3xl bg-white shadow-lg ring-2 ring-slate-100 transition hover:shadow-xl ${st.ring}`}
    >
      <div className="relative">
        <img
          src={`https://picsum.photos/seed/quiz-event-${q.id}/640/240`}
          alt=""
          className="h-40 w-full object-cover"
        />
        <span
          className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide shadow-lg ${st.chip}`}
        >
          {bucket === 'live' && (
            <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          )}
          {st.label}
        </span>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-bold text-slate-900">{q.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-slate-600">{q.description}</p>

        <div className="mt-4 space-y-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 shrink-0 text-violet-500" />
            <span>{formatEventWindow(q)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-violet-500" />
            <span>Quiz arena · synced with your categories</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 shrink-0 text-violet-500" />
            <span>{q.questionCount} questions · scores count for leaderboard</span>
          </div>
        </div>

        <button
          type="button"
          disabled={!joinable}
          onClick={() => onJoin(q)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-violet-500/25 transition hover:from-violet-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {joinable ? (
            <>
              Enter quiz
              <ChevronRight className="h-4 w-4" />
            </>
          ) : bucket === 'ended' ? (
            'Event closed'
          ) : (
            <>
              <Clock className="h-4 w-4" />
              Not started yet
            </>
          )}
        </button>
      </div>
    </motion.article>
  )
}

function Section({
  title,
  icon: Icon,
  hint,
  empty,
  isEmpty,
  children,
}: {
  title: string
  icon: ComponentType<{ className?: string }>
  hint: string
  empty: string
  isEmpty: boolean
  children: ReactNode
}) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-violet-600" />
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <p className="text-[11px] text-slate-500">{hint}</p>
        </div>
      </div>
      {!isEmpty ? (
        <div className="space-y-4">{children}</div>
      ) : (
        <p className="rounded-2xl border border-dashed border-violet-200/80 bg-violet-50/40 py-8 text-center text-sm text-slate-600">
          {empty}
        </p>
      )}
    </section>
  )
}

export function EventsScreen() {
  const navigate = useNavigate()
  const [list, setList] = useState<QuizDto[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (silent?: boolean) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    try {
      const data = await api.fetchQuizList()
      setList(data)
    } catch (e) {
      toast.error(api.getApiErrorMessage(e))
      setList([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const { live, upcoming, ended } = useMemo(() => {
    const a: QuizDto[] = []
    const b: QuizDto[] = []
    const c: QuizDto[] = []
    for (const q of list ?? []) {
      const bucket = eventBucket(q)
      if (bucket === 'live') a.push(q)
      else if (bucket === 'upcoming') b.push(q)
      else c.push(q)
    }
    return { live: a, upcoming: b, ended: c }
  }, [list])

  function onJoin(q: QuizDto) {
    if (!canJoinQuiz(q)) {
      if (eventBucket(q) === 'ended') toast.message('This event has ended')
      else toast.message('This event has not started yet — check the schedule.')
      return
    }
    navigate(`/quiz/${q.id}/loading`)
  }

  async function openFirstJoinable() {
    const data = list ?? (await api.fetchQuizList())
    const hit = data.find((q) => canJoinQuiz(q))
    if (hit) navigate(`/quiz/${hit.id}/loading`)
    else toast.message('No live quizzes right now — see upcoming below')
  }

  return (
    <div className="app-screen min-h-[100dvh] pb-bottom-nav">
      <header className="relative sticky top-0 z-20 overflow-hidden border-b border-white/10 bg-gradient-to-r from-violet-600 via-purple-700 to-indigo-950 px-4 pb-6 shadow-[0_8px_32px_-8px_rgba(91,33,182,0.4)] safe-pt-header">
        <div
          className="pointer-events-none absolute -right-16 top-0 h-40 w-40 rounded-full bg-fuchsia-400/20 blur-2xl"
          aria-hidden
        />
        <div className="relative z-10 flex items-center justify-between gap-3">
          <button
            type="button"
            aria-label="Back"
            className="rounded-xl p-2 text-white hover:bg-white/10"
            onClick={() => navigate('/home')}
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            className="rounded-xl p-2 text-white hover:bg-white/10 disabled:opacity-40"
            disabled={loading || refreshing}
            aria-label="Refresh"
            onClick={() => void load(true)}
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 mt-3"
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-200">
            Quiz · events
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white">
            Events hub
          </h1>
          <p className="mt-1 max-w-md text-sm text-white/80">
            Live contests, scheduled drops, and recent finales. Join when a room
            is open — same rules as solo play, real leaderboard points.
          </p>
        </motion.div>
      </header>

      <main className="px-4 pt-6">
        <div className="app-card mb-8 grid grid-cols-3 gap-2 p-3">
          {[
            { n: live.length, label: 'Live', icon: Radio, c: 'text-emerald-600' },
            { n: upcoming.length, label: 'Soon', icon: CircleDot, c: 'text-amber-600' },
            { n: ended.length, label: 'Ended', icon: Clock, c: 'text-slate-500' },
          ].map((x) => (
            <div key={x.label} className="text-center">
              <x.icon className={`mx-auto h-5 w-5 ${x.c}`} />
              <p className="mt-1 text-xl font-black tabular-nums text-slate-900">{x.n}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {x.label}
              </p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-52 w-full rounded-3xl" />
            <Skeleton className="h-52 w-full rounded-3xl" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <div key="sections">
              <Section
                title="Live now"
                icon={Radio}
                hint="Join immediately — scores update on the board."
                empty="Nothing live at the moment."
                isEmpty={live.length === 0}
              >
                {live.map((q) => (
                  <EventCard key={q.id} q={q} onJoin={onJoin} />
                ))}
              </Section>

              <Section
                title="Starting soon"
                icon={CalendarClock}
                hint="Scheduled starts — buttons unlock when the room opens."
                empty="No upcoming events scheduled."
                isEmpty={upcoming.length === 0}
              >
                {upcoming.map((q) => (
                  <EventCard key={q.id} q={q} onJoin={onJoin} />
                ))}
              </Section>

              <Section
                title="Past events"
                icon={Clock}
                hint="Finished contests — browse what you missed."
                empty="No past events in the feed."
                isEmpty={ended.length === 0}
              >
                {ended.map((q) => (
                  <EventCard key={q.id} q={q} onJoin={onJoin} />
                ))}
              </Section>
            </div>
          </AnimatePresence>
        )}
      </main>

      <AppBottomNav
        active="events"
        onPlay={() => void openFirstJoinable()}
        onProfile={() => navigate('/profile')}
      />
    </div>
  )
}
