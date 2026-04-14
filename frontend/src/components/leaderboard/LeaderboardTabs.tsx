import { GLOBAL_SORTS, type TabId } from './leaderboardUtils'

type Props = {
  tab: TabId
  hasQuizTab: boolean
  onChange: (t: TabId) => void
}

export function LeaderboardTabs({ tab, hasQuizTab, onChange }: Props) {
  const cls = (active: boolean) =>
    `shrink-0 rounded-2xl border px-4 py-2.5 text-left transition ${
      active
        ? 'border-violet-500 bg-white text-violet-900 shadow-md shadow-violet-500/15'
        : 'border-slate-200/80 bg-white/80 text-slate-600 backdrop-blur-sm'
    }`

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {hasQuizTab && (
        <button type="button" className={cls(tab === 'quiz')} onClick={() => onChange('quiz')}>
          <p className="text-xs font-bold">This Quiz</p>
          <p className="text-[10px] text-slate-500">Quiz ranking</p>
        </button>
      )}
      {GLOBAL_SORTS.map((s) => (
        <button key={s.id} type="button" className={cls(tab === s.id)} onClick={() => onChange(s.id)}>
          <p className="text-xs font-bold">{s.label}</p>
          <p className="text-[10px] text-slate-500">{s.hint}</p>
        </button>
      ))}
    </div>
  )
}
