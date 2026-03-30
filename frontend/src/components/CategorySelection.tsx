import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  MAX_CATEGORY_COUNT,
  MIN_CATEGORY_COUNT,
  QUIZ_CATEGORIES,
} from '../constants/categories'
import * as api from '../api/client'
import { useApp } from '../context/AppContext'
import { markCategoryOnboardingSeen } from '../lib/categoryOnboarding'

const BUBBLE_BG: Record<string, string> = {
  music: 'bg-violet-100',
  sports: 'bg-orange-100',
  food: 'bg-sky-100',
  art: 'bg-blue-100',
  science: 'bg-emerald-100',
  movies: 'bg-amber-100',
  history: 'bg-rose-100',
  geography: 'bg-yellow-100',
}

export function CategorySelection() {
  const navigate = useNavigate()
  const { setUser, user: currentUser } = useApp()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev)
      if (n.has(id)) {
        n.delete(id)
        return n
      }
      if (n.size >= MAX_CATEGORY_COUNT) {
        toast.message(
          `Maximum ${MAX_CATEGORY_COUNT} categories. Remove one to pick another.`,
        )
        return prev
      }
      n.add(id)
      return n
    })
  }

  const canSave =
    selected.size >= MIN_CATEGORY_COUNT && selected.size <= MAX_CATEGORY_COUNT

  const list = useMemo(() => QUIZ_CATEGORIES, [])

  useEffect(() => {
    if (currentUser?.id) {
      markCategoryOnboardingSeen(currentUser.id)
    }
  }, [currentUser?.id])

  async function onSave() {
    if (!canSave) {
      toast.error(
        `Pick between ${MIN_CATEGORY_COUNT} and ${MAX_CATEGORY_COUNT} categories.`,
      )
      return
    }
    setBusy(true)
    try {
      const cats = Array.from(selected)
      const profile = await api.savePreferences(cats)
      setUser({
        ...profile,
        location: profile.location?.trim()
          ? profile.location
          : currentUser?.location?.trim()
            ? currentUser.location
            : undefined,
      })
      toast.success('Preferences saved')
      navigate('/home', { replace: true })
    } catch {
      toast.error('Could not save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-screen min-h-[100dvh] px-5 pb-bottom-nav safe-pt-onboarding">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-md"
      >
        <h1 className="text-center text-2xl font-extrabold tracking-tight text-slate-900">
          Select your interests
        </h1>
        <p className="mt-2 text-center text-sm text-slate-500">
          Pick at least <strong className="text-slate-800">{MIN_CATEGORY_COUNT}</strong> and
          at most <strong className="text-slate-800">{MAX_CATEGORY_COUNT}</strong> interests —
          we&apos;ll match quizzes to you.
        </p>
        <p className="mt-1 text-center text-xs font-medium text-slate-500">
          {selected.size} selected (max {MAX_CATEGORY_COUNT})
          {selected.size < MIN_CATEGORY_COUNT && (
            <span className="text-amber-600">
              {' '}
              · Need at least {MIN_CATEGORY_COUNT - selected.size} more
            </span>
          )}
          {selected.size >= MIN_CATEGORY_COUNT && selected.size <= MAX_CATEGORY_COUNT && (
            <span className="text-emerald-600"> · Ready to continue</span>
          )}
        </p>

        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8">
          {list.map((c, i) => {
            const active = selected.has(c.id)
            return (
              <motion.button
                key={c.id}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => toggle(c.id)}
                className="flex flex-col items-center"
              >
                <div
                  className={`flex h-28 w-28 items-center justify-center rounded-full shadow-inner transition ${
                    BUBBLE_BG[c.id] ?? 'bg-slate-100'
                  } ${active ? 'ring-[3px] ring-violet-600 ring-offset-2 ring-offset-white shadow-lg shadow-violet-500/20' : ''}`}
                >
                  <span className="text-5xl drop-shadow-sm">{c.emoji}</span>
                </div>
                <span className="mt-3 text-sm font-semibold text-slate-800">
                  {c.label}
                </span>
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-violet-100/80 bg-white/90 p-4 pb-safe shadow-[0_-8px_32px_-8px_rgba(91,33,182,0.12)] backdrop-blur-xl">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            disabled={!canSave || busy}
            onClick={onSave}
            className="btn-app-primary py-4 disabled:opacity-40"
          >
            Next
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <ArrowRight className="h-4 w-4" />
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
