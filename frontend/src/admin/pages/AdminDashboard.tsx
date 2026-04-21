import { useEffect, useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts'
import {
  Activity,
  HelpCircle,
  Trash2,
  Trophy,
  Users,
  Zap,
  RefreshCw,
  TrendingUp,
  Radio,
  CalendarClock,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  fetchAdminCharts,
  fetchAdminStats,
  fetchAdminQuizzes,
  fetchAdminUsers,
  resetAllData,
  adminApiError,
} from '../adminApi'
import type { AdminCharts, AdminStats, AdminQuizSummary, AdminUserRow } from '../types'

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [charts, setCharts] = useState<AdminCharts | null>(null)
  const [quizzes, setQuizzes] = useState<AdminQuizSummary[]>([])
  const [recentUsers, setRecentUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  async function loadAll(silent = false) {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const [s, c, q, u] = await Promise.all([
        fetchAdminStats(),
        fetchAdminCharts(14),
        fetchAdminQuizzes(),
        fetchAdminUsers({ page: 0, size: 5, status: 'all' }),
      ])
      setStats(s)
      setCharts(c)
      setQuizzes(q)
      setRecentUsers(u.content)
      setLastUpdated(new Date())
    } catch (e) {
      toast.error(adminApiError(e))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadAll()
    const interval = setInterval(() => void loadAll(true), 30000)
    return () => clearInterval(interval)
  }, [])

  async function handleReset() {
    if (!window.confirm('This will delete ALL users, quizzes, results and credit data. Admins and questions are kept. Continue?')) return
    setResetting(true)
    try {
      const result = await resetAllData()
      toast.success(`Cleared — users: ${result.deleted.users}, quizzes: ${result.deleted.quizzes}, questions: ${result.deleted.questions}`)
      await loadAll(true)
    } catch (e) {
      toast.error(adminApiError(e))
    } finally {
      setResetting(false)
    }
  }

  const chartData = charts?.participationByDay.map((p, i) => ({
    date: p.date.slice(5),
    'Answers': p.value,
    'Players': charts.activeUsersByDay[i]?.value ?? 0,
  })) ?? []

  const liveQuizzes = quizzes.filter(q => q.status === 'live')
  const upcomingQuizzes = quizzes.filter(q => q.status === 'upcoming')
  const endedQuizzes = quizzes.filter(q => q.status === 'ended' || q.status === 'archived')

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-3 text-slate-400">
        <RefreshCw className="h-5 w-5 animate-spin" />
        Loading dashboard…
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Dashboard</h1>
          <p className="mt-1 text-xs text-slate-500">
            Auto-refreshes every 30s
            {lastUpdated && ` · Last updated ${lastUpdated.toLocaleTimeString()}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={refreshing}
            onClick={() => void loadAll(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            disabled={resetting}
            onClick={() => void handleReset()}
            className="flex items-center gap-2 rounded-xl border border-red-800/60 bg-red-950/60 px-4 py-2 text-sm font-bold text-red-400 transition hover:bg-red-900/60 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {resetting ? 'Clearing…' : 'Clear Data'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={Users} label="Total Users" value={stats?.totalUsers ?? 0} tone="violet" trend={null} />
        <StatCard icon={Zap} label="Active Now" value={stats?.activeUsers ?? 0} tone="emerald" trend={`Last ${stats?.activeWindowMinutes ?? 15} min`} />
        <StatCard icon={Activity} label="Inactive" value={stats?.inactiveUsers ?? 0} tone="slate" trend={null} />
        <StatCard icon={Trophy} label="Total Quizzes" value={stats?.totalQuizzes ?? 0} tone="amber" trend={`${liveQuizzes.length} live`} />
        <StatCard icon={HelpCircle} label="Questions" value={stats?.totalQuestions ?? 0} tone="sky" trend={null} />
      </div>

      {/* Quiz Status Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-800/40 bg-emerald-950/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400">
              <Radio className="h-4 w-4 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wide">Live Now</span>
            </div>
            <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-sm font-black text-emerald-300">{liveQuizzes.length}</span>
          </div>
          <div className="mt-3 space-y-1.5">
            {liveQuizzes.length === 0 ? (
              <p className="text-xs text-slate-500">No live quizzes</p>
            ) : liveQuizzes.slice(0, 3).map(q => (
              <p key={q.id} className="truncate text-xs font-medium text-emerald-200">{q.title}</p>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-800/40 bg-amber-950/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400">
              <CalendarClock className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wide">Upcoming</span>
            </div>
            <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-sm font-black text-amber-300">{upcomingQuizzes.length}</span>
          </div>
          <div className="mt-3 space-y-1.5">
            {upcomingQuizzes.length === 0 ? (
              <p className="text-xs text-slate-500">No upcoming quizzes</p>
            ) : upcomingQuizzes.slice(0, 3).map(q => (
              <div key={q.id}>
                <p className="truncate text-xs font-medium text-amber-200">{q.title}</p>
                {q.startsAt && <p className="text-[10px] text-amber-400/70">{new Date(q.startsAt).toLocaleString()}</p>}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/40 bg-slate-800/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wide">Ended</span>
            </div>
            <span className="rounded-full bg-slate-500/20 px-2.5 py-0.5 text-sm font-black text-slate-300">{endedQuizzes.length}</span>
          </div>
          <div className="mt-3 space-y-1.5">
            {endedQuizzes.length === 0 ? (
              <p className="text-xs text-slate-500">No ended quizzes</p>
            ) : endedQuizzes.slice(0, 3).map(q => (
              <p key={q.id} className="truncate text-xs font-medium text-slate-400">{q.title}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="mb-1 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-violet-400" />
            <h2 className="text-sm font-bold text-white">Answers Submitted (14 days)</h2>
          </div>
          <p className="mb-4 text-xs text-slate-500">Daily answer submissions</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%" minHeight={224}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="answers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#475569" fontSize={10} />
                <YAxis stroke="#475569" fontSize={10} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, fontSize: 12 }} />
                <Area type="monotone" dataKey="Answers" stroke="#a78bfa" strokeWidth={2} fill="url(#answers)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="mb-1 flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Unique Players (14 days)</h2>
          </div>
          <p className="mb-4 text-xs text-slate-500">Daily unique active players</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%" minHeight={224}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#475569" fontSize={10} />
                <YAxis stroke="#475569" fontSize={10} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="Players" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Players */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-violet-400" />
            <h2 className="text-sm font-bold text-white">Recent Players</h2>
          </div>
          <a href="/admin/players" className="text-xs font-semibold text-violet-400 hover:text-violet-300">View all →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-3 font-semibold">Name</th>
                <th className="pb-3 font-semibold">Email / Phone</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Score</th>
                <th className="pb-3 font-semibold">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-xs text-slate-500">No users yet</td></tr>
              ) : recentUsers.map(u => (
                <tr key={u.id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                  <td className="py-3 font-medium text-white">{u.displayName}</td>
                  <td className="py-3 text-xs text-slate-400">{u.email || u.phone || '—'}</td>
                  <td className="py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${u.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-600/40 text-slate-400'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3 tabular-nums text-violet-300">{u.totalScore}</td>
                  <td className="py-3 text-xs text-slate-500">{u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

function StatCard({
  icon: Icon, label, value, tone, trend,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  tone: 'violet' | 'emerald' | 'slate' | 'amber' | 'sky'
  trend: string | null
}) {
  const colors = {
    violet: { bg: 'from-violet-500/15 to-violet-600/5', border: 'border-violet-800/40', icon: 'bg-violet-500/20 text-violet-300', text: 'text-violet-300' },
    emerald: { bg: 'from-emerald-500/15 to-emerald-600/5', border: 'border-emerald-800/40', icon: 'bg-emerald-500/20 text-emerald-300', text: 'text-emerald-300' },
    amber: { bg: 'from-amber-500/15 to-amber-600/5', border: 'border-amber-800/40', icon: 'bg-amber-500/20 text-amber-300', text: 'text-amber-300' },
    sky: { bg: 'from-sky-500/15 to-sky-600/5', border: 'border-sky-800/40', icon: 'bg-sky-500/20 text-sky-300', text: 'text-sky-300' },
    slate: { bg: 'from-slate-500/15 to-slate-600/5', border: 'border-slate-700/40', icon: 'bg-slate-500/20 text-slate-300', text: 'text-slate-400' },
  }
  const c = colors[tone]
  return (
    <div className={`rounded-2xl border ${c.border} bg-gradient-to-br ${c.bg} p-4`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black tabular-nums text-white">{value.toLocaleString()}</p>
          {trend && <p className={`mt-1 text-[11px] font-semibold ${c.text}`}>{trend}</p>}
        </div>
        <div className={`shrink-0 rounded-xl p-2 ${c.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}
