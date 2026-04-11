import {
  CalendarDays,
  Coins,
  Home,
  Play,
  Trophy,
  User,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export type BottomNavTab = 'home' | 'events' | 'leaderboard' | 'wallet' | 'profile'

type Props = {
  active: BottomNavTab
  onPlay: () => void
}

export function AppBottomNav({ active, onPlay }: Props) {
  const navigate = useNavigate()

  const tabClass = (tab: BottomNavTab) =>
    `relative flex flex-col items-center gap-1 pb-2 transition ${
      active === tab ? 'text-violet-600' : 'text-slate-400 hover:text-slate-600'
    }`

  return (
    <nav
      data-tour="bottom-nav"
      className="fixed bottom-0 left-0 right-0 z-30 flex items-end justify-around border-t border-slate-200/90 bg-white/90 px-2 pb-safe pt-2 shadow-[0_-4px_24px_-4px_rgba(91,33,182,0.08)] backdrop-blur-xl"
    >
      <button
        type="button"
        className={tabClass('home')}
        onClick={() => navigate('/home')}
      >
        <Home className="h-5 w-5" strokeWidth={active === 'home' ? 2.5 : 2} />
        <span className="text-[10px] font-semibold">Home</span>
        {active === 'home' && (
          <span className="absolute -top-0.5 h-1 w-5 rounded-full bg-violet-500" />
        )}
      </button>

      <button
        type="button"
        className={tabClass('events')}
        onClick={() => navigate('/events')}
      >
        <CalendarDays className="h-5 w-5" strokeWidth={active === 'events' ? 2.5 : 2} />
        <span className="text-[10px] font-semibold">Events</span>
        {active === 'events' && (
          <span className="absolute -top-0.5 h-1 w-5 rounded-full bg-violet-500" />
        )}
      </button>

      <div className="relative -top-6 flex flex-col items-center gap-1 pb-2">
        <button
          type="button"
          aria-label="Play"
          title="Play"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-xl shadow-violet-500/40 ring-4 ring-white transition hover:brightness-105 active:scale-95"
          onClick={onPlay}
        >
          <Play className="h-7 w-7 translate-x-px" fill="currentColor" />
        </button>
        <span className="text-[10px] font-semibold text-slate-500">Play</span>
      </div>

      <button
        type="button"
        className={tabClass('leaderboard')}
        onClick={() => navigate('/leaderboard')}
      >
        <Trophy className="h-5 w-5" strokeWidth={active === 'leaderboard' ? 2.5 : 2} />
        <span className="text-[10px] font-semibold">Ranks</span>
        {active === 'leaderboard' && (
          <span className="absolute -top-0.5 h-1 w-5 rounded-full bg-violet-500" />
        )}
      </button>

      <button
        type="button"
        className={tabClass('wallet')}
        onClick={() => navigate('/wallet')}
      >
        <Coins className="h-5 w-5" strokeWidth={active === 'wallet' ? 2.5 : 2} />
        <span className="text-[10px] font-semibold">Wallet</span>
        {active === 'wallet' && (
          <span className="absolute -top-0.5 h-1 w-5 rounded-full bg-violet-500" />
        )}
      </button>
    </nav>
  )
}
