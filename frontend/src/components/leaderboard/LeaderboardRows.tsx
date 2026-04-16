import { motion } from 'framer-motion'
import { memo } from 'react'
import type { LeaderboardEntryDto } from '../../types'
import { avatarGradient, formatTime, leaderboardAvatarUrl, prizeForRank, scoreForTab, tabLabel, type TabId } from './leaderboardUtils'

type Props = {
  rows: LeaderboardEntryDto[]
  tab: TabId
  myUserId?: string
}

function LeaderboardRowsInner({ rows, tab, myUserId }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Rank</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Player</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600">{tabLabel(tab)}</span>
      </div>
      <ul className="divide-y divide-slate-100">
        {rows.map((row, i) => {
          const isMe = myUserId === row.userId
          const main = scoreForTab(row, tab)
          const prize = prizeForRank(row.rank)
          return (
            <motion.li key={row.userId}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.4) }}
              className={`flex items-center gap-3 px-3 py-3 sm:px-4 ${
                isMe
                  ? 'bg-violet-50/90 ring-1 ring-inset ring-violet-200/80'
                  : row.dummy
                    ? 'opacity-70'
                    : ''
              }`}>
              <span className="w-8 shrink-0 text-center text-xs font-bold tabular-nums text-slate-400">
                #{row.rank}
              </span>
              {prize && (
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-800 ring-1 ring-amber-300/80">
                  {prize}
                </span>
              )}
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className={`h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gradient-to-br ${avatarGradient(row.userId, isMe)}`}>
                  <img
                    src={leaderboardAvatarUrl(row)}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {row.displayName}
                    {isMe && (
                      <span className="ml-2 rounded-md bg-violet-600/10 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">
                        You
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[10px] text-slate-500">
                    {tab === 'quiz'
                      ? `⏱ ${formatTime(row.totalTimeMs)}`
                      : `Total ${row.totalScore.toLocaleString()} · W ${row.weeklyScore.toLocaleString()} · D ${row.dayScore.toLocaleString()}`}
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-sm font-black tabular-nums text-violet-600">
                {main.toLocaleString()}
              </span>
            </motion.li>
          )
        })}
      </ul>
    </div>
  )
}

export const LeaderboardRows = memo(LeaderboardRowsInner)
