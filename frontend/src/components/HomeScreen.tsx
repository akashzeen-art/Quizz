import { AnimatePresence, motion } from 'framer-motion'
import {
  Banknote,
  Bike,
  Bookmark,
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Coins,
  Gift,
  HelpCircle,
  History,
  Car,
  Laptop,
  LifeBuoy,
  MapPin,
  Menu,
  Ticket,
  Tv,
  Smartphone,
  Sparkles,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import * as api from '../api/client'
import type { QuizDto } from '../types'
import { useApp } from '../context/AppContext'
import {
  canJoinQuiz,
  comparePastRecent,
  compareUpcoming,
  eventBucket,
  quizCalendarDate,
  toIsoDateLocal,
} from '../lib/quizEvents'
import { AppBottomNav } from './AppBottomNav'
import { AppTour } from './AppTour'
import { START_TOUR_EVENT } from '../tour/homeTourSteps'
import { LocationPickerSheet } from './LocationPickerSheet'
import { Skeleton } from './ui/Skeleton'

const PILL_COLORS = [
  'bg-red-500',
  'bg-orange-500',
  'bg-green-500',
  'bg-blue-500',
  'bg-pink-500',
  'bg-amber-500',
]

const PRIZE_TICKER_ITEMS: {
  label: string
  worth: string
  Icon: typeof Banknote
  tone:
    | 'from-fuchsia-500/25 to-violet-500/15'
    | 'from-amber-500/25 to-orange-500/15'
    | 'from-emerald-500/25 to-green-500/15'
    | 'from-sky-500/25 to-blue-500/15'
    | 'from-rose-500/25 to-pink-500/15'
}[] = [
  {
    label: 'Money',
    worth: '₹5,000',
    Icon: Banknote,
    tone: 'from-emerald-500/25 to-green-500/15',
  },
  {
    label: 'Bullet Bike',
    worth: '₹1,80,000',
    Icon: Bike,
    tone: 'from-amber-500/25 to-orange-500/15',
  },
  {
    label: 'iPhone',
    worth: '₹89,900',
    Icon: Smartphone,
    tone: 'from-sky-500/25 to-blue-500/15',
  },
  {
    label: 'Harley Davidson',
    worth: '₹8,50,000',
    Icon: Bike,
    tone: 'from-fuchsia-500/25 to-violet-500/15',
  },
  {
    label: 'Sports Car',
    worth: '₹12,00,000',
    Icon: Car,
    tone: 'from-rose-500/25 to-pink-500/15',
  },
  {
    label: 'Gaming Laptop',
    worth: '₹1,45,000',
    Icon: Laptop,
    tone: 'from-sky-500/25 to-blue-500/15',
  },
  {
    label: 'Travel Voucher',
    worth: '₹75,000',
    Icon: Ticket,
    tone: 'from-amber-500/25 to-orange-500/15',
  },
  {
    label: 'Smart TV',
    worth: '₹65,000',
    Icon: Tv,
    tone: 'from-fuchsia-500/25 to-violet-500/15',
  },
  {
    label: 'Mystery Gift',
    worth: 'Today only',
    Icon: Gift,
    tone: 'from-rose-500/25 to-pink-500/15',
  },
]

function monthGrid(year: number, month: number) {
  const first = new Date(year, month, 1)
  const startPad = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function HomeScreen() {
  const navigate = useNavigate()
  const { user, logout, setUser, refreshProfile } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)
  const [locationOpen, setLocationOpen] = useState(false)
  const [addCreditsOpen, setAddCreditsOpen] = useState(false)
  const [addCreditsRupees, setAddCreditsRupees] = useState('50')
  const [addCreditsBusy, setAddCreditsBusy] = useState(false)
  const [quizzes, setQuizzes] = useState<QuizDto[] | null>(null)
  const [eventSection, setEventSection] = useState<'active' | 'upcoming' | 'past'>('upcoming')
  const [leaderboard, setLeaderboard] = useState<
    Awaited<ReturnType<typeof api.fetchLeaderboard>> | null
  >(null)

  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const currencySymbol =
    typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('en-us')
      ? '$'
      : '₹'
  const credits = user?.credits ?? 0
  const cashBalance = Math.floor(credits / 2)

  const cal = useMemo(
    () => monthGrid(calendarMonth.getFullYear(), calendarMonth.getMonth()),
    [calendarMonth],
  )

  const calendarLabel = useMemo(
    () =>
      calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' }),
    [calendarMonth],
  )

  const { liveSidebar, upcomingSidebar, pastSidebar } = useMemo(() => {
    if (!quizzes) {
      return { liveSidebar: [], upcomingSidebar: [], pastSidebar: [] }
    }
    const live: QuizDto[] = []
    const upcoming: QuizDto[] = []
    const past: QuizDto[] = []
    for (const q of quizzes) {
      switch (eventBucket(q)) {
        case 'live':
          live.push(q)
          break
        case 'upcoming':
          upcoming.push(q)
          break
        default:
          past.push(q)
      }
    }
    upcoming.sort(compareUpcoming)
    past.sort(comparePastRecent)
    return {
      liveSidebar: live,
      upcomingSidebar: upcoming,
      pastSidebar: past.slice(0, 14),
    }
  }, [quizzes])

  const sectionedEvents = useMemo(() => {
    if (!quizzes) return []
    if (eventSection === 'active') return quizzes.filter((q) => eventBucket(q) === 'live')
    if (eventSection === 'past') return quizzes.filter((q) => eventBucket(q) === 'ended')
    return quizzes.filter((q) => eventBucket(q) === 'upcoming')
  }, [quizzes, eventSection])

  /** Per-day counts for calendar dots (live / upcoming / ended). */
  const dayEventStats = useMemo(() => {
    const m = new Map<
      string,
      { live: number; upcoming: number; ended: number }
    >()
    if (!quizzes) return m
    const todayKey = toIsoDateLocal(new Date())
    for (const q of quizzes) {
      const b = eventBucket(q)
      let key = quizCalendarDate(q)
      if (!key && b === 'live') key = todayKey
      if (!key) continue
      const row = m.get(key) ?? { live: 0, upcoming: 0, ended: 0 }
      if (b === 'live') row.live += 1
      else if (b === 'upcoming') row.upcoming += 1
      else row.ended += 1
      m.set(key, row)
    }
    return m
  }, [quizzes])

  const playedSet = useMemo(() => {
    const s = new Set<string>()
    ;(user?.playedDates || []).forEach((d) => s.add(d))
    return s
  }, [user?.playedDates])

  // Refresh scores every time user returns to this screen (tab focus or navigation)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshProfile()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refreshProfile])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [q, lb] = await Promise.all([
          api.fetchQuizList(),
          api.fetchLeaderboard(),
        ])
        if (!cancelled) {
          setQuizzes(q)
          setLeaderboard(lb)
        }
      } catch {
        if (!cancelled) toast.error('Could not load quizzes')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const displayName = user?.displayName || 'Player'
  const gameTag = user?.gameTag?.trim() || displayName
  const headerProfileImg = user ? api.resolveProfileImageUrl(user) : undefined

  function openFirstQuiz() {
    const hit = quizzes?.find((q) => canJoinQuiz(q))
    if (hit) navigate(`/quiz/${hit.id}/loading`)
    else if (quizzes?.length)
      toast.message('No joinable quiz right now — check Events for the schedule')
    else toast.message('No quizzes loaded yet')
  }

  function openMenuQuiz(q: QuizDto) {
    setMenuOpen(false)
    if (canJoinQuiz(q)) navigate(`/quiz/${q.id}/loading`)
    else navigate('/events')
  }

  function shiftCalendarMonth(delta: number) {
    setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1))
  }

  return (
    <div className="app-screen relative min-h-[100dvh] overflow-x-hidden pb-bottom-nav">
      <div className="relative overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-950 px-4 pb-8 shadow-[0_12px_40px_-8px_rgba(91,33,182,0.45)] safe-pt-header">
        <div
          className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-fuchsia-500/25 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-16 left-0 h-40 w-40 rounded-full bg-indigo-400/20 blur-2xl"
          aria-hidden
        />
        <div className="relative z-10 flex items-center justify-between">
          <button
            type="button"
            aria-label="Menu"
            data-tour="tour-menu"
            className="rounded-xl p-2 text-white hover:bg-white/10"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <button
            type="button"
            data-tour="tour-location"
            className="max-w-[55%] text-center"
            onClick={() => setLocationOpen(true)}
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-white/60">
              Current location
            </p>
            <p className="text-sm font-semibold leading-snug text-white underline decoration-white/30 decoration-dotted underline-offset-2">
              {user?.location?.trim() || 'Tap to set'}
            </p>
            <p className="text-xs text-white/80">{gameTag}</p>
          </button>
          <button
            type="button"
            aria-label="My Profile"
            title="My Profile"
            data-tour="tour-profile-header"
            className={`rounded-full bg-white/15 text-white hover:bg-white/25 ${
              headerProfileImg ? 'p-0.5' : 'p-2'
            }`}
            onClick={() => navigate('/profile')}
          >
            {headerProfileImg ? (
              <img
                src={headerProfileImg}
                alt=""
                className="h-9 w-9 rounded-full object-cover ring-2 ring-white/40"
              />
            ) : (
              <User className="h-5 w-5" />
            )}
          </button>
        </div>

        <div className="relative z-10 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/10 px-3 py-2.5 ring-1 ring-white/15 backdrop-blur-sm">
          <div className="flex min-w-0 items-center gap-2 text-white">
            <Coins className="h-5 w-5 shrink-0 text-amber-200" aria-hidden />
            <div className="truncate">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">
                Cash Balance
              </p>
              <p className="truncate tabular-nums">
                <span className="text-lg font-extrabold">
                  {currencySymbol}
                  {cashBalance.toLocaleString()}
                </span>{' '}
                <span className="text-xs font-semibold text-white/80">
                  ({credits.toLocaleString()} credits)
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white ring-1 ring-white/25 transition hover:bg-white/30"
            onClick={() => setAddCreditsOpen(true)}
          >
            Add credits
          </button>
        </div>

        <div
          data-tour="tour-categories"
          className="relative z-10 mt-5 min-h-[40px] overflow-hidden pb-1"
        >
          <motion.div
            className="flex w-max flex-nowrap gap-2 pr-2"
            animate={{ x: ['0%', '-50%'] }}
            transition={{ duration: 18, ease: 'linear', repeat: Infinity }}
          >
            {[...PRIZE_TICKER_ITEMS, ...PRIZE_TICKER_ITEMS].map((item, i) => {
              const Icon = item.Icon
              const pillColor = PILL_COLORS[i % PILL_COLORS.length]
              return (
                <span
                  key={`${item.label}-${item.worth}-${i}`}
                  className={[
                    'relative isolate shrink-0 overflow-hidden rounded-full px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-wide text-white',
                    'ring-1 ring-white/20 shadow-lg shadow-violet-900/35',
                    'bg-gradient-to-r',
                    item.tone,
                    'backdrop-blur-sm',
                    // outer glow tint per-chip
                    pillColor,
                  ].join(' ')}
                >
                  <span className="pointer-events-none absolute inset-0 opacity-70 blur-xl">
                    <span
                      className={`absolute -left-10 -top-10 h-24 w-24 rounded-full ${pillColor}`}
                    />
                    <span
                      className={`absolute -bottom-10 -right-10 h-24 w-24 rounded-full ${pillColor}`}
                    />
                  </span>

                  <span className="relative flex items-center gap-2">
                    <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20 shadow-[0_0_18px_rgba(255,255,255,0.18)]">
                      <Icon className="h-3.5 w-3.5 text-white drop-shadow" aria-hidden />
                      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full bg-amber-200/90 shadow-[0_0_10px_rgba(251,191,36,0.55)]" />
                    </span>
                    <span className="whitespace-nowrap">
                      {item.label}{' '}
                      <span className="font-black text-white/95">WORTH {item.worth}</span>
                    </span>
                  </span>
                </span>
              )
            })}
          </motion.div>
        </div>
      </div>

      <main className="px-4 pt-6">
        <section className="mb-6 grid grid-cols-3 gap-2" data-tour="tour-scores">
          {[
            { label: 'Day', value: user?.dayScore ?? 0 },
            { label: 'Week', value: user?.weeklyScore ?? 0 },
            { label: 'Month', value: user?.monthlyScore ?? 0 },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-2xl border border-violet-100/80 bg-gradient-to-b from-white to-violet-50/40 p-3 text-center shadow-md shadow-violet-500/5"
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {c.label} score
              </div>
              <div className="mt-1 bg-gradient-to-br from-slate-900 to-slate-700 bg-clip-text text-lg font-extrabold tabular-nums text-transparent">
                {c.value}
              </div>
            </div>
          ))}
        </section>

        <section className="mb-3">
          <div className="flex items-center gap-2 rounded-full bg-slate-100/90 p-1.5">
            {[
              { id: 'active', label: 'Active Quiz' },
              { id: 'upcoming', label: 'Upcoming Quiz' },
              { id: 'past', label: 'Past Quiz' },
            ].map((s) => {
              const active = eventSection === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setEventSection(s.id as 'active' | 'upcoming' | 'past')}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                    active
                      ? 'bg-white text-violet-700 shadow-sm ring-1 ring-violet-200'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </section>

        <div
          data-tour="tour-events"
          className="space-y-3 pb-4"
        >
          {!quizzes ? (
            <>
              <Skeleton className="h-40 w-full rounded-3xl" />
              <Skeleton className="h-40 w-full rounded-3xl" />
            </>
          ) : sectionedEvents.length === 0 ? (
            <div className="app-card flex w-full items-center justify-center rounded-2xl p-6 text-center text-xs font-semibold text-slate-500">
              No quizzes in this section yet.
            </div>
          ) : (
            sectionedEvents.map((q) => (
              <motion.div
                key={q.id}
                role="button"
                tabIndex={0}
                whileTap={{ scale: 0.98 }}
                className="w-full cursor-pointer overflow-hidden rounded-2xl border border-slate-200/60 bg-white text-left shadow-[0_10px_30px_-12px_rgba(15,23,42,0.15)] ring-1 ring-white/80 transition hover:shadow-lg"
                onClick={() => {
                  if (!canJoinQuiz(q)) {
                    if (eventBucket(q) === 'ended')
                      toast.message('This event has ended')
                    else toast.message('This event has not started yet')
                    return
                  }
                  navigate(`/quiz/${q.id}/loading`)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    if (!canJoinQuiz(q)) {
                      if (eventBucket(q) === 'ended')
                        toast.message('This event has ended')
                      else toast.message('This event has not started yet')
                      return
                    }
                    navigate(`/quiz/${q.id}/loading`)
                  }
                }}
              >
                <div className="relative">
                  <img
                    src={`https://picsum.photos/seed/event-${q.id}/560/200`}
                    alt=""
                    className="h-28 w-full object-cover"
                  />
                  <span className="absolute left-3 top-3 rounded-lg bg-white/95 px-2 py-1 text-[10px] font-bold uppercase text-violet-700 shadow">
                    {eventBucket(q) === 'live'
                      ? 'Live'
                      : eventBucket(q) === 'upcoming'
                        ? 'Soon'
                        : 'Ended'}
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    className="absolute right-3 top-3 cursor-pointer rounded-full bg-white/90 p-1.5 text-slate-600 shadow"
                    onClick={(e) => {
                      e.stopPropagation()
                      toast.message('Saved to list')
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        e.stopPropagation()
                        toast.message('Saved to list')
                      }
                    }}
                  >
                    <Bookmark className="h-4 w-4" aria-hidden />
                  </span>
                </div>
                <div className="p-3">
                  <div className="line-clamp-1 text-sm font-bold text-slate-900">
                    {q.title}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{q.description?.toLowerCase().startsWith('csv imported') ? '' : q.description}</p>
                  <div className="mt-2.5 flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-7 w-7 rounded-full border-2 border-white bg-gradient-to-br from-violet-400 to-fuchsia-500"
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-medium text-slate-400">Going</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
                    <MapPin className="h-3 w-3 shrink-0" />
                    Madison Square Garden, NY
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        <section className="mb-6" data-tour="tour-leaderboard-preview">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Leaderboard</h2>
            <button
              type="button"
              className="text-xs font-bold uppercase tracking-wide text-violet-600"
              onClick={() => navigate('/leaderboard')}
            >
              Full board
            </button>
          </div>
          <div className="app-card overflow-hidden rounded-2xl">
            {!leaderboard ? (
              <div className="space-y-2 p-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              leaderboard.slice(0, 8).map((row) => (
                <div
                  key={row.userId}
                  className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-xs font-medium text-slate-400">#{row.rank}</span>
                    <span className="text-sm font-medium text-slate-800">{row.displayName}</span>
                  </div>
                  <span className="text-sm font-bold text-violet-600">
                    {row.totalScore}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      <AppBottomNav
        active="home"
        onPlay={openFirstQuiz}
      />

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close menu overlay"
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-[min(100%,320px)] flex-col overflow-y-auto overflow-x-hidden border-r border-slate-200/80 bg-gradient-to-b from-white via-violet-50/20 to-violet-50/50 pb-6 shadow-2xl shadow-violet-900/10 safe-pb safe-pt-header"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            >
              <div className="flex shrink-0 items-start justify-between gap-3 px-4 pb-3 pt-2">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-700 shadow-sm ring-1 ring-violet-200/60">
                    <CalendarDays className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold leading-tight text-slate-900">
                      Calendar
                    </h2>
                    <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                      Schedule, live quizzes & play days
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  aria-label="Close menu"
                  onClick={() => setMenuOpen(false)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mx-4 mb-5 rounded-2xl border border-slate-200/90 bg-white/95 p-3 shadow-sm ring-1 ring-slate-100/80">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    aria-label="Previous month"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 active:scale-95"
                    onClick={() => shiftCalendarMonth(-1)}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <p className="min-w-0 flex-1 text-center text-sm font-semibold tabular-nums text-slate-800">
                    {calendarLabel}
                  </p>
                  <button
                    type="button"
                    aria-label="Next month"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 active:scale-95"
                    onClick={() => shiftCalendarMonth(1)}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
                <div className="mb-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-slate-600">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-sm ring-1 ring-emerald-600/20" />
                    Live
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-violet-500 shadow-sm ring-1 ring-violet-600/20" />
                    Upcoming
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-rose-400 shadow-sm ring-1 ring-rose-500/20" />
                    Past
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400 shadow-sm ring-1 ring-amber-500/25" />
                    You played
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-x-0.5 gap-y-1">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <div
                      key={`dow-${i}`}
                      className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400"
                    >
                      {d}
                    </div>
                  ))}
                  {(() => {
                    const todayDate = new Date()
                    return cal.map((cell, idx) => {
                      if (cell === null) {
                        return (
                          <div
                            key={`pad-${idx}`}
                            className="min-h-[3.25rem]"
                            aria-hidden
                          />
                        )
                      }
                      const y = calendarMonth.getFullYear()
                      const mo = calendarMonth.getMonth()
                      const iso = `${y}-${String(mo + 1).padStart(2, '0')}-${String(cell).padStart(2, '0')}`
                      const isToday =
                        y === todayDate.getFullYear() &&
                        mo === todayDate.getMonth() &&
                        cell === todayDate.getDate()
                      const played = playedSet.has(iso)
                      const stats = dayEventStats.get(iso)
                      return (
                        <div
                          key={iso}
                          className={`flex min-h-[3.25rem] flex-col items-center justify-center rounded-xl px-0.5 py-1 text-[11px] tabular-nums transition-colors ${
                            isToday
                              ? 'bg-violet-100 font-semibold text-violet-900 shadow-sm ring-1 ring-violet-300/90'
                              : played
                                ? 'bg-amber-50/90 text-slate-800 ring-1 ring-amber-200/90'
                                : 'text-slate-700 hover:bg-slate-50/90'
                          }`}
                        >
                          <span className="leading-none">{cell}</span>
                          <div className="mt-1 flex h-2 w-full items-center justify-center gap-0.5">
                            {stats && stats.live > 0 && (
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                                title={`${stats.live} live`}
                              />
                            )}
                            {stats && stats.upcoming > 0 && (
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-violet-500"
                                title={`${stats.upcoming} upcoming`}
                              />
                            )}
                            {stats && stats.ended > 0 && (
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-rose-400"
                                title={`${stats.ended} past`}
                              />
                            )}
                            {played && (
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-amber-500"
                                title="You played"
                              />
                            )}
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>

              <div className="mx-4 mb-4 space-y-4">
                <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-sm ring-1 ring-slate-100/60">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2 text-emerald-800">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                        <Zap className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-wide">
                        Live now
                      </span>
                    </div>
                    {quizzes && liveSidebar.length > 0 && (
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-emerald-800">
                        {liveSidebar.length}
                      </span>
                    )}
                  </div>
                  {!quizzes ? (
                    <Skeleton className="h-11 w-full rounded-xl" />
                  ) : liveSidebar.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200/90 bg-slate-50/90 px-3 py-2.5 text-center text-xs leading-relaxed text-slate-500">
                      No live quizzes right now.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {liveSidebar.map((q) => (
                        <li key={q.id}>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-xl border border-emerald-100/90 bg-emerald-50/90 px-3 py-2.5 text-left text-sm text-emerald-950 transition hover:border-emerald-200 hover:bg-emerald-100/80"
                            onClick={() => openMenuQuiz(q)}
                          >
                            <span className="line-clamp-2 min-h-[2.5rem] flex-1 font-medium leading-snug">
                              {q.title}
                            </span>
                            <span className="shrink-0 self-center rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                              Live
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-sm ring-1 ring-slate-100/60">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2 text-violet-900">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                        <CalendarClock className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-wide">
                        Upcoming
                      </span>
                    </div>
                    {quizzes && upcomingSidebar.length > 0 && (
                      <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-violet-900">
                        {upcomingSidebar.length}
                      </span>
                    )}
                  </div>
                  {!quizzes ? (
                    <Skeleton className="h-11 w-full rounded-xl" />
                  ) : upcomingSidebar.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200/90 bg-slate-50/90 px-3 py-2.5 text-center text-xs leading-relaxed text-slate-500">
                      Nothing scheduled.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {upcomingSidebar.map((q) => (
                        <li key={q.id}>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-xl border border-violet-100/90 bg-violet-50/80 px-3 py-2.5 text-left text-sm text-violet-950 transition hover:border-violet-200 hover:bg-violet-100/70"
                            onClick={() => openMenuQuiz(q)}
                          >
                            <span className="line-clamp-2 min-h-[2.5rem] flex-1 font-medium leading-snug">
                              {q.title}
                            </span>
                            <span className="shrink-0 self-center rounded-md bg-violet-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                              Soon
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-sm ring-1 ring-slate-100/60">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2 text-slate-700">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        <History className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-wide">
                        Past
                      </span>
                    </div>
                    {quizzes && pastSidebar.length > 0 && (
                      <span className="shrink-0 rounded-full bg-slate-200/90 px-2 py-0.5 text-[10px] font-bold tabular-nums text-slate-700">
                        {pastSidebar.length}
                      </span>
                    )}
                  </div>
                  {!quizzes ? (
                    <Skeleton className="h-11 w-full rounded-xl" />
                  ) : pastSidebar.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200/90 bg-slate-50/90 px-3 py-2.5 text-center text-xs leading-relaxed text-slate-500">
                      No finished events yet.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {pastSidebar.map((q) => (
                        <li key={q.id}>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/95 px-3 py-2.5 text-left text-sm text-slate-800 transition hover:border-slate-300 hover:bg-slate-100/90"
                            onClick={() => openMenuQuiz(q)}
                          >
                            <span className="line-clamp-2 min-h-[2.5rem] flex-1 font-medium leading-snug">
                              {q.title}
                            </span>
                            <span className="shrink-0 self-center rounded-md bg-slate-300/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-800">
                              Ended
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              <div className="mx-4 mt-auto border-t border-slate-200/80 pt-4">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl border border-violet-200/90 bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-left text-sm font-semibold text-white shadow-md shadow-violet-500/20 transition hover:brightness-105 active:scale-[0.99]"
                  onClick={() => {
                    setMenuOpen(false)
                    navigate('/events')
                  }}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
                    <Users className="h-4 w-4 shrink-0" />
                  </span>
                  <span className="flex-1 leading-snug">
                    Open events hub
                    <span className="mt-0.5 block text-[11px] font-normal text-white/85">
                      Browse all quizzes
                    </span>
                  </span>
                </button>

                <div className="mt-3 space-y-1.5">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-800 transition hover:bg-slate-100/90"
                    onClick={() => {
                      toast.message('Support: help@skillquiz.demo')
                      setMenuOpen(false)
                    }}
                  >
                    <LifeBuoy className="h-4 w-4 shrink-0 text-violet-600" />
                    Support
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-800 transition hover:bg-slate-100/90"
                    onClick={() => {
                      toast.message('FAQ: Tap a live quiz to begin.')
                      setMenuOpen(false)
                    }}
                  >
                    <HelpCircle className="h-4 w-4 shrink-0 text-violet-600" />
                    FAQ
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl border border-violet-100 bg-violet-50/90 px-3 py-2.5 text-left text-sm font-medium text-violet-900 transition hover:bg-violet-100"
                    onClick={() => {
                      window.dispatchEvent(new Event(START_TOUR_EVENT))
                      setMenuOpen(false)
                    }}
                  >
                    <Sparkles className="h-4 w-4 shrink-0 text-violet-600" />
                    App tour
                  </button>
                </div>

                <button
                  type="button"
                  className="mt-5 w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
                  onClick={() => {
                    logout()
                    setMenuOpen(false)
                    navigate('/auth', { replace: true })
                  }}
                >
                  Sign out
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AppTour />

      {addCreditsOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-4 sm:items-center"
          role="dialog"
          aria-modal
          aria-labelledby="add-credits-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close dialog"
            disabled={addCreditsBusy}
            onClick={() => {
              if (!addCreditsBusy) setAddCreditsOpen(false)
            }}
          />
          <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl ring-1 ring-slate-200/80">
            <h2
              id="add-credits-title"
              className="text-lg font-extrabold tracking-tight text-slate-900"
            >
              Add credits
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              ₹1 = 2 credits (e.g. ₹50 → 100 credits). This simulates a top-up until a payment
              provider is connected.
            </p>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Amount (₹)
              <input
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base font-semibold text-slate-900 outline-none ring-violet-500/0 transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/25"
                value={addCreditsRupees}
                onChange={(e) => setAddCreditsRupees(e.target.value)}
                disabled={addCreditsBusy}
              />
            </label>
            <p className="mt-2 text-sm font-medium text-violet-700">
              ≈{' '}
              {Math.max(0, Math.floor(Number.parseFloat(addCreditsRupees) || 0)) * 2} credits
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                disabled={addCreditsBusy}
                onClick={() => setAddCreditsOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-md shadow-violet-500/25 transition hover:brightness-105 disabled:opacity-50"
                disabled={addCreditsBusy}
                onClick={() => {
                  void (async () => {
                    const rupees = Math.floor(Number.parseFloat(addCreditsRupees) || 0)
                    if (rupees < 1) {
                      toast.error('Enter at least ₹1')
                      return
                    }
                    setAddCreditsBusy(true)
                    try {
                      await api.addWalletCredits({ amountRupees: rupees })
                      await refreshProfile()
                      toast.success(`Added ${rupees * 2} credits`)
                      setAddCreditsOpen(false)
                    } catch (e) {
                      toast.error(api.getApiErrorMessage(e))
                    } finally {
                      setAddCreditsBusy(false)
                    }
                  })()
                }}
              >
                {addCreditsBusy ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <LocationPickerSheet
        open={locationOpen}
        onClose={() => setLocationOpen(false)}
        initial={user?.location}
        onSave={async (location) => {
          if (!user) {
            toast.error('Not signed in')
            throw new Error('no user')
          }
          try {
            const { profile, synced } = await api.saveUserLocation(
              location,
              user,
            )
            setUser(profile)
            if (synced) {
              toast.success(location ? 'Location saved' : 'Location cleared')
            } else {
              toast.message(
                location
                  ? 'Saved on this device. Start the backend to sync to your account.'
                  : 'Location cleared locally. Start the backend to sync.',
                { duration: 4500 },
              )
            }
          } catch (e) {
            toast.error(api.getApiErrorMessage(e))
            throw e
          }
        }}
      />
    </div>
  )
}
