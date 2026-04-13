import { AnimatePresence, motion } from 'framer-motion'
import { Crown, Medal } from 'lucide-react'
import type { LeaderboardEntryDto } from '../../types'
import { formatTime, initial, scoreForTab, type TabId } from './leaderboardUtils'

type Props = {
  top3: LeaderboardEntryDto[]
  tab: TabId
}

export function LeaderboardPodium({ top3, tab }: Props) {
  return (
    <div className="mb-6 flex items-end justify-center gap-2 sm:gap-4">
      <AnimatePresence mode="popLayout">
        {[1, 0, 2].map((idx) => {
          const row = top3[idx]
          if (!row) return null
          const order = idx + 1
          const h = order === 1 ? 'h-36' : order === 2 ? 'h-28' : 'h-24'
          const score = scoreForTab(row, tab)
          return (
            <motion.div key={row.userId + tab} layout
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', damping: 22, delay: order * 0.05 }}
              className={`flex w-[30%] max-w-[7.5rem] flex-col items-center ${order === 1 ? 'z-10' : ''}`}>
              <div className={`relative flex w-full flex-col items-center rounded-2xl border-2 bg-white shadow-lg ${
                order === 1 ? 'border-amber-400 shadow-amber-500/20'
                : order === 2 ? 'border-slate-200' : 'border-amber-700/30'
              } ${h} justify-end pb-3 pt-2`}>
                {order === 1 && <Crown className="absolute -top-7 h-8 w-8 text-amber-400 drop-shadow" />}
                {order === 2 && <Medal className="absolute -top-6 h-7 w-7 text-slate-400" />}
                {order === 3 && <Medal className="absolute -top-6 h-7 w-7 text-amber-700" />}
                <div className={`mb-2 flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white shadow-inner ${
                  order === 1 ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                  : order === 2 ? 'bg-gradient-to-br from-slate-400 to-slate-600'
                  : 'bg-gradient-to-br from-amber-700 to-amber-900'
                }`}>{initial(row.displayName)}</div>
                <p className="max-w-full truncate px-1 text-center text-[11px] font-bold text-slate-800">{row.displayName}</p>
                <p className="mt-0.5 text-sm font-black tabular-nums text-violet-600">{score.toLocaleString()}</p>
                {tab === 'quiz' && row.totalTimeMs > 0 && (
                  <p className="text-[9px] text-slate-400">⏱ {formatTime(row.totalTimeMs)}</p>
                )}
              </div>
              <span className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">#{row.rank}</span>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
