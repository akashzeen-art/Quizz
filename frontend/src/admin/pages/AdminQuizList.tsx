import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, Eye, Rocket, CalendarClock, Archive } from 'lucide-react'
import { toast } from 'sonner'
import {
  bulkUpdateAdminQuizStatus,
  bulkDeleteAdminQuizzes,
  deleteAdminQuiz,
  fetchAdminQuizzes,
  updateAdminQuizStatus,
  adminApiError,
} from '../adminApi'
import type { AdminQuizStatus, AdminQuizSummary } from '../types'

export default function AdminQuizList() {
  const [rows, setRows] = useState<AdminQuizSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [selection, setSelection] = useState<Record<string, boolean>>({})

  async function load() {
    setLoading(true)
    try {
      setRows(await fetchAdminQuizzes())
    } catch (e) {
      toast.error(adminApiError(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function remove(id: string) {
    if (!confirm('Delete this quiz and its questions?')) return
    try {
      await deleteAdminQuiz(id)
      toast.success('Quiz deleted')
      void load()
    } catch (e) {
      toast.error(adminApiError(e))
    }
  }

  async function changeStatus(id: string, status: AdminQuizStatus, startsAt?: string) {
    setBusy(id + status)
    try {
      await updateAdminQuizStatus(id, status, startsAt)
      toast.success(`Moved to ${status}`)
      void load()
    } catch (e) {
      toast.error(adminApiError(e))
    } finally {
      setBusy(null)
    }
  }

  async function bulkReleaseLive() {
    const ids = Object.entries(selection).filter(([, v]) => v).map(([k]) => k)
    if (!ids.length) return
    setBusy('bulk-live')
    try {
      await bulkUpdateAdminQuizStatus(ids, 'live')
      toast.success(`${ids.length} quizzes moved to live`)
      setSelection({})
      void load()
    } catch (e) {
      toast.error(adminApiError(e))
    } finally {
      setBusy(null)
    }
  }

  async function bulkPush(status: AdminQuizStatus) {
    const ids = Object.entries(selection).filter(([, v]) => v).map(([k]) => k)
    if (!ids.length) return
    let startsAt: string | undefined = undefined
    if (status === 'upcoming') {
      const v = prompt('Schedule start ISO time (e.g. 2026-05-01T12:00:00Z)')
      if (!v) return
      startsAt = v
    }
    setBusy('bulk-push')
    try {
      await bulkUpdateAdminQuizStatus(ids, status, startsAt)
      toast.success(`${ids.length} quizzes moved to ${status}`)
      setSelection({})
      void load()
    } catch (e) {
      toast.error(adminApiError(e))
    } finally {
      setBusy(null)
    }
  }

  async function bulkDelete() {
    const ids = Object.entries(selection).filter(([, v]) => v).map(([k]) => k)
    if (!ids.length) return
    if (!confirm(`Delete ${ids.length} selected quizzes (and their questions/results)?`)) return
    setBusy('bulk-delete')
    try {
      await bulkDeleteAdminQuizzes(ids)
      toast.success(`${ids.length} quizzes deleted`)
      setSelection({})
      void load()
    } catch (e) {
      toast.error(adminApiError(e))
    } finally {
      setBusy(null)
    }
  }

  const sections = useMemo(() => {
    const by = (s: AdminQuizStatus) => rows.filter((r) => r.status === s)
    return {
      draft: by('draft'),
      upcoming: by('upcoming'),
      live: by('live'),
    }
  }, [rows])

  const selectedCount = useMemo(
    () => Object.values(selection).filter(Boolean).length,
    [selection],
  )

  function setSelectedFor(items: AdminQuizSummary[], value: boolean) {
    setSelection((prev) => {
      const next = { ...prev }
      for (const q of items) next[q.id] = value
      return next
    })
  }

  function QuizTable({ title, items }: { title: string; items: AdminQuizSummary[] }) {
    const allSelected = items.length > 0 && items.every((q) => !!selection[q.id])
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <p className="text-sm font-semibold text-slate-200">
            {title} ({items.length})
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy != null || items.length === 0}
              onClick={() => setSelectedFor(items, !allSelected)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-40"
            >
              {allSelected ? 'Clear all' : 'Select all'}
            </button>
          </div>
        </div>
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Bulk</th>
              <th className="px-4 py-3 font-semibold">Title</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Questions</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((q) => (
              <tr key={q.id} className="border-b border-slate-800/80 hover:bg-slate-800/30">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={!!selection[q.id]}
                    onChange={(e) => setSelection((p) => ({ ...p, [q.id]: e.target.checked }))}
                  />
                </td>
                <td className="px-4 py-3 font-medium text-white">{q.title}</td>
                <td className="px-4 py-3 text-slate-400">{q.category}</td>
                <td className="px-4 py-3 tabular-nums text-slate-300">{q.questionCount}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{q.status}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy != null}
                      onClick={() => void changeStatus(q.id, 'live')}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-700/60 bg-emerald-950/30 px-2 py-1 text-xs text-emerald-300 disabled:opacity-40"
                    >
                      <Rocket className="h-3.5 w-3.5" />
                      Go live
                    </button>
                    <button
                      type="button"
                      disabled={busy != null}
                      onClick={() => {
                        const v = prompt('Schedule start ISO time (e.g. 2026-05-01T12:00:00Z)')
                        if (!v) return
                        void changeStatus(q.id, 'upcoming', v)
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-amber-700/60 bg-amber-950/30 px-2 py-1 text-xs text-amber-300 disabled:opacity-40"
                    >
                      <CalendarClock className="h-3.5 w-3.5" />
                      Schedule
                    </button>
                    <button
                      type="button"
                      disabled={busy != null}
                      onClick={() => void changeStatus(q.id, 'archived')}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-2 py-1 text-xs text-slate-300 disabled:opacity-40"
                    >
                      <Archive className="h-3.5 w-3.5" />
                      Archive
                    </button>
                    <Link
                      to="/events"
                      title="See Events in the player app"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Events
                    </Link>
                    <button
                      type="button"
                      onClick={() => void remove(q.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-900/50 bg-rose-950/30 px-2 py-1 text-xs text-rose-300 hover:bg-rose-950/50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">No items</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Quizzes</h1>
          <p className="mt-1 text-sm text-slate-400">All contests in MongoDB</p>
        </div>
        <Link
          to="/admin/quizzes/new"
          className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-500"
        >
          Add quiz
        </Link>
      </div>

      {loading ? <p className="text-slate-500">Loading…</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy != null}
          onClick={() => void bulkReleaseLive()}
          className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
        >
          Release Selected Live {selectedCount > 0 ? `(${selectedCount})` : ''}
        </button>
        <button
          type="button"
          disabled={busy != null || selectedCount === 0}
          onClick={() => void bulkPush('upcoming')}
          className="rounded-xl border border-amber-700/60 bg-amber-950/30 px-4 py-2 text-sm font-bold text-amber-200 hover:bg-amber-950/50 disabled:opacity-40"
        >
          Push Selected to Upcoming
        </button>
        <button
          type="button"
          disabled={busy != null || selectedCount === 0}
          onClick={() => void bulkPush('live')}
          className="rounded-xl border border-emerald-700/60 bg-emerald-950/30 px-4 py-2 text-sm font-bold text-emerald-200 hover:bg-emerald-950/50 disabled:opacity-40"
        >
          Push Selected to Live
        </button>
        <button
          type="button"
          disabled={busy != null || selectedCount === 0}
          onClick={() => void bulkDelete()}
          className="rounded-xl border border-rose-900/50 bg-rose-950/30 px-4 py-2 text-sm font-bold text-rose-200 hover:bg-rose-950/50 disabled:opacity-40"
        >
          Delete Selected
        </button>
        <button
          type="button"
          disabled={busy != null || selectedCount === 0}
          onClick={() => setSelection({})}
          className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-40"
        >
          Clear selection
        </button>
      </div>
      <QuizTable title="Upcoming Quizzes" items={sections.upcoming} />
      <QuizTable title="Live Quizzes" items={sections.live} />
    </div>
  )
}
