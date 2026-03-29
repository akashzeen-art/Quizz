import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  MAX_CATEGORY_COUNT,
  MIN_CATEGORY_COUNT,
  QUIZ_CATEGORIES,
} from '../constants/categories'

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

type Props = {
  open: boolean
  onClose: () => void
  /** Current saved categories — reapplied whenever the sheet opens. */
  initialCategories: string[]
  onSave: (categories: string[]) => Promise<void>
}

export function CategoryFilterSheet({
  open,
  onClose,
  initialCategories,
  onSave,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setSelected(new Set(initialCategories))
  }, [open, initialCategories])

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

  async function handleSave() {
    if (!canSave) {
      toast.error(
        `Pick between ${MIN_CATEGORY_COUNT} and ${MAX_CATEGORY_COUNT} categories.`,
      )
      return
    }
    setBusy(true)
    try {
      await onSave(Array.from(selected))
      onClose()
    } catch {
      /* parent toasts */
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-labelledby="category-filter-title"
            className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl safe-pb"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 pb-3 safe-pt-sticky">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="category-filter-title"
                    className="text-base font-bold text-slate-900"
                  >
                    Quiz categories
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Choose {MIN_CATEGORY_COUNT}–{MAX_CATEGORY_COUNT} interests — quizzes match
                    these.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[min(60dvh,520px)] overflow-y-auto px-4 pb-3 pt-2">
              <p className="mb-3 text-center text-xs font-medium text-slate-600">
                {selected.size} selected
                {selected.size < MIN_CATEGORY_COUNT && (
                  <span className="text-amber-600">
                    {' '}
                    · Need at least {MIN_CATEGORY_COUNT - selected.size} more
                  </span>
                )}
                {canSave && (
                  <span className="text-emerald-600"> · Ready to save</span>
                )}
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-6 pb-2">
                {list.map((c) => {
                  const active = selected.has(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggle(c.id)}
                      className="flex flex-col items-center"
                    >
                      <div
                        className={`flex h-24 w-24 items-center justify-center rounded-full shadow-inner transition sm:h-28 sm:w-28 ${
                          BUBBLE_BG[c.id] ?? 'bg-slate-100'
                        } ${
                          active
                            ? 'ring-[3px] ring-violet-600 ring-offset-2 ring-offset-white shadow-lg shadow-violet-500/20'
                            : ''
                        }`}
                      >
                        <span className="text-4xl drop-shadow-sm sm:text-5xl">
                          {c.emoji}
                        </span>
                      </div>
                      <span className="mt-2 text-sm font-semibold text-slate-800">
                        {c.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="border-t border-slate-100 bg-white px-4 py-3">
              <button
                type="button"
                disabled={!canSave || busy}
                onClick={() => void handleSave()}
                className="btn-app-primary flex w-full items-center justify-center gap-2 py-3.5 disabled:opacity-40"
              >
                {busy ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : null}
                Save categories
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
