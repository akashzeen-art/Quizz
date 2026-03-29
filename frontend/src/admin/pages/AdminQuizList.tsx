import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, Eye } from 'lucide-react'
import { toast } from 'sonner'
import {
  deleteAdminQuiz,
  fetchAdminQuizzes,
  adminApiError,
} from '../adminApi'
import type { AdminQuizSummary } from '../types'

export default function AdminQuizList() {
  const [rows, setRows] = useState<AdminQuizSummary[]>([])
  const [loading, setLoading] = useState(true)

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

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Title</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Questions</th>
              <th className="px-4 py-3 font-semibold">Created</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                  No quizzes yet
                </td>
              </tr>
            ) : (
              rows.map((q) => (
                <tr
                  key={q.id}
                  className="border-b border-slate-800/80 hover:bg-slate-800/30"
                >
                  <td className="px-4 py-3 font-medium text-white">{q.title}</td>
                  <td className="px-4 py-3 text-slate-400">{q.category}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-300">
                    {q.questionCount}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {q.createdAt
                      ? new Date(q.createdAt).toLocaleString()
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        to="/events"
                        title="See Events in the player app to join this quiz when live"
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
