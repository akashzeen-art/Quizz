import { ChevronLeft } from 'lucide-react'
import { motion } from 'framer-motion'

const LABELS = ['Method', 'Verify', 'Security', 'Profile']

export function AuthProgressBar({
  current,
  total,
  onBack,
}: {
  current: number
  total: number
  onBack: () => void
}) {
  const pct = total > 0 ? (current / total) * 100 : 0

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 text-slate-600 hover:bg-slate-50"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>Step {current} of {total}</span>
            <span className="text-violet-600">{Math.round(pct)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>
      <div className="flex gap-1">
        {LABELS.slice(0, total).map((label, i) => (
          <div key={label} className="flex flex-1 flex-col items-center gap-1">
            <div className={`h-1 w-full rounded-full transition-colors ${i < current ? 'bg-violet-500' : i === current ? 'bg-violet-300' : 'bg-slate-200'}`} />
            <span className={`text-[9px] font-semibold uppercase tracking-wide ${i < current ? 'text-violet-600' : i === current ? 'text-violet-400' : 'text-slate-300'}`}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
