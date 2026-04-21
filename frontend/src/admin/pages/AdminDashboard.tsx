import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  Activity,
  HelpCircle,
  Trash2,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  fetchAdminCharts,
  fetchAdminStats,
  resetAllData,
  adminApiError,
} from '../adminApi'
import type { AdminCharts, AdminStats } from '../types'

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [charts, setCharts] = useState<AdminCharts | null>(null)
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)

  async function handleReset() {
    if (!window.confirm('This will delete ALL users, quizzes, results and credit data. Admins and questions are kept. Continue?')) return
    setResetting(true)
    try {
      const result = await resetAllData()
      toast.success(`Cleared — users: ${result.deleted.users}, quizzes: ${result.deleted.quizzes}, questions: ${result.deleted.questions}, results: ${result.deleted.results}`)
      const [s, c] = await Promise.all([fetchAdminStats(), fetchAdminCharts(14)])
      setStats(s)
      setCharts(c)
    } catch (e) {
      toast.error(adminApiError(e))
    } finally {
      setResetting(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [s, c] = await Promise.all([fetchAdminStats(), fetchAdminCharts(14)])
        if (!cancelled) {
          setStats(s)
          setCharts(c)
        }
      } catch (e) {
        toast.error(adminApiError(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const merged =
    charts?.participationByDay.map((p, i) => ({
      date: p.date.slice(5),
      participation: p.value,
      uniquePlayers: charts.activeUsersByDay[i]?.value ?? 0,
    })) ?? []

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        Loading dashboard…
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            Overview · Active users = last {stats?.activeWindowMinutes ?? 15} minutes
          </p>
        </div>
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          icon={Users}
          label="Total users"
          value={stats?.totalUsers ?? 0}
          tone="violet"
        />
        <StatCard
          icon={Zap}
          label="Active"
          value={stats?.activeUsers ?? 0}
          tone="emerald"
        />
        <StatCard
          icon={Activity}
          label="Inactive"
          value={stats?.inactiveUsers ?? 0}
          tone="slate"
        />
        <StatCard
          icon={Trophy}
          label="Quizzes"
          value={stats?.totalQuizzes ?? 0}
          tone="amber"
        />
        <StatCard
          icon={HelpCircle}
          label="Questions"
          value={stats?.totalQuestions ?? 0}
          tone="sky"
        />
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-lg font-bold text-white">Engagement (14 days)</h2>
        <p className="mb-6 text-xs text-slate-500">
          Answer submissions per day · Unique players per day (from results)
        </p>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%" minHeight={288}>
            <LineChart data={merged}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: 12,
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="participation"
                name="Answers submitted"
                stroke="#a78bfa"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="uniquePlayers"
                name="Unique players"
                stroke="#34d399"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  tone: 'violet' | 'emerald' | 'slate' | 'amber' | 'sky'
}) {
  const ring =
    tone === 'violet'
      ? 'from-violet-500/20 to-violet-600/5'
      : tone === 'emerald'
        ? 'from-emerald-500/20 to-emerald-600/5'
        : tone === 'amber'
          ? 'from-amber-500/20 to-amber-600/5'
          : tone === 'sky'
            ? 'from-sky-500/20 to-sky-600/5'
            : 'from-slate-500/20 to-slate-600/5'
  const iconBg =
    tone === 'violet'
      ? 'bg-violet-500/20 text-violet-300'
      : tone === 'emerald'
        ? 'bg-emerald-500/20 text-emerald-300'
        : tone === 'amber'
          ? 'bg-amber-500/20 text-amber-300'
          : tone === 'sky'
            ? 'bg-sky-500/20 text-sky-300'
            : 'bg-slate-500/20 text-slate-300'

  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-gradient-to-br ${ring} p-4`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-3xl font-black tabular-nums text-white">{value}</p>
        </div>
        <div className={`rounded-xl p-2 ${iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}
