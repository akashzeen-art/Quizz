import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import * as api from '../api/client'
import { useApp } from '../context/AppContext'
import type { QuizDto } from '../types'
import { GeometricOverlay } from './GeometricOverlay'
import { VideoBackground } from './VideoBackground'
import { usePreferVideo } from '../hooks/usePreferVideo'

const LOBBY_PLAYER_COUNT = 30
const ROW_SIZES = [8, 8, 7, 7] as const
const LOAD_SECONDS = 7

type LobbyPlayer = { id: string; name: string; seed: string }
type StaticAvatar = { bg: string; badge: string }

const STATIC_AVATARS: StaticAvatar[] = [
  { bg: 'from-violet-500 to-fuchsia-500', badge: 'A' },
  { bg: 'from-indigo-500 to-blue-500', badge: 'B' },
  { bg: 'from-emerald-500 to-teal-500', badge: 'C' },
  { bg: 'from-amber-500 to-orange-500', badge: 'D' },
  { bg: 'from-rose-500 to-pink-500', badge: 'E' },
  { bg: 'from-cyan-500 to-sky-500', badge: 'F' },
  { bg: 'from-lime-500 to-green-500', badge: 'G' },
  { bg: 'from-purple-500 to-indigo-500', badge: 'H' },
]

function makeLobbyPlayers(): LobbyPlayer[] {
  return Array.from({ length: LOBBY_PLAYER_COUNT }, (_, i) => ({
    id: `p-${i}-${Math.random().toString(36).slice(2, 11)}`,
    name: `Player ${10000 + Math.floor(Math.random() * 90000)}`,
    seed: `lobby-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 9)}`,
  }))
}

function ScrollingPlayerRow({
  players,
  durationSec,
  reverse,
}: {
  players: LobbyPlayer[]
  durationSec: number
  reverse?: boolean
}) {
  const pickAvatar = (seed: string): StaticAvatar => {
    let hash = 0
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
    return STATIC_AVATARS[hash % STATIC_AVATARS.length]
  }

  const renderChips = (suffix: string) =>
    players.map((p) => {
      const avatar = pickAvatar(p.seed)
      return (
        <div
          key={`${suffix}-${p.id}`}
          className="flex shrink-0 items-center gap-2 rounded-full border border-white/20 bg-white/15 py-1 pl-1 pr-3 shadow-md backdrop-blur-md"
        >
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatar.bg} text-xs font-extrabold text-white ring-2 ring-white/40`}
          >
            {avatar.badge}
          </div>
          <span className="max-w-[120px] truncate text-xs font-semibold text-white">
            {p.name}
          </span>
        </div>
      )
    })

  return (
    <div className="overflow-hidden rounded-xl py-0.5">
      <div
        className="lobby-marquee-track gap-3 pr-3"
        style={{
          animationDuration: `${durationSec}s`,
          animationDirection: reverse ? 'reverse' : 'normal',
        }}
      >
        {renderChips('a')}
        {renderChips('b')}
      </div>
    </div>
  )
}

export function QuizLoadingScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { setUser } = useApp()
  const preferVideo = usePreferVideo()
  const [sec, setSec] = useState(LOAD_SECONDS)
  const total = LOAD_SECONDS
  const [quizMeta, setQuizMeta] = useState<QuizDto | null>(null)
  const [lobbyPlayers, setLobbyPlayers] = useState(() => makeLobbyPlayers())
  const [creditReady, setCreditReady] = useState(false)

  const playerRows = useMemo(() => {
    let start = 0
    return ROW_SIZES.map((n) => {
      const slice = lobbyPlayers.slice(start, start + n)
      start += n
      return slice
    })
  }, [lobbyPlayers])

  useEffect(() => {
    const idTimer = window.setInterval(() => {
      setLobbyPlayers(makeLobbyPlayers())
    }, 2600)
    return () => window.clearInterval(idTimer)
  }, [])

  useEffect(() => {
    if (!id) return
    // Always clear old session key so each quiz start gets a fresh clientId
    api.clearQuizPlayClientId(id)
    let cancelled = false
    ;(async () => {
      try {
        const clientId = api.getQuizPlayClientId(id)
        // Try credit deduction; if backend doesn't support it yet, fall through
        try {
          const bal = await api.deductQuizCredits(id, clientId)
          if (!cancelled) {
            setUser((prev) =>
              prev ? { ...prev, credits: bal.credits, totalSpent: bal.totalSpent } : prev,
            )
          }
        } catch {
          // credit system not available — continue anyway
        }
        const d = await api.fetchQuiz(id, clientId)
        if (cancelled) return
        setQuizMeta(d.quiz)
        setCreditReady(true)
      } catch (e) {
        if (!cancelled) {
          toast.error(api.getApiErrorMessage(e))
          navigate('/home', { replace: true })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, navigate, setUser])

  useEffect(() => {
    if (!id || !creditReady) return
    const end = Date.now() + total * 1000
    const t = setInterval(() => {
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000))
      setSec(left)
      if (left <= 0) {
        clearInterval(t)
        navigate(`/quiz/${id}/play`, { replace: true })
      }
    }, 200)
    return () => clearInterval(t)
  }, [id, navigate, total, creditReady])

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-gradient-to-b from-violet-700 to-indigo-950">
      {preferVideo ? <VideoBackground variant="quizzo" /> : null}
      <GeometricOverlay />

      <header className="relative z-20 flex items-center justify-between px-4 safe-pt-header">
        <button
          type="button"
          aria-label="Close"
          className="rounded-full bg-white/10 p-2 text-white backdrop-blur-md"
          onClick={() => navigate('/home', { replace: true })}
        >
          <X className="h-5 w-5" />
        </button>
        <p className="text-center text-sm font-semibold text-white">
          Waiting for Players...
        </p>
        <span className="w-9" />
      </header>

      <div className="relative z-10 flex flex-1 flex-col items-center px-5 pb-8">
        <motion.div
          className="app-card mt-4 w-full max-w-sm p-4 shadow-2xl shadow-violet-900/15 ring-1 ring-white/60"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="overflow-hidden rounded-2xl bg-slate-200 ring-1 ring-slate-200/80">
            <img
              src={`https://picsum.photos/seed/quizzo-${id}/400/200`}
              alt=""
              className="h-40 w-full object-cover"
            />
          </div>
          <h2 className="mt-4 text-lg font-extrabold leading-tight tracking-tight text-slate-900">
            {quizMeta?.title ?? 'Quiz lobby'}
          </h2>
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">
            {quizMeta?.description ?? 'Get ready — players are joining.'}
          </p>
          <p className="mt-3 text-sm font-medium text-slate-700">
            {LOBBY_PLAYER_COUNT} players have joined
          </p>
        </motion.div>

        <div
          className="relative mt-5 w-full max-w-sm space-y-2.5"
          aria-label="Players joining"
        >
          {playerRows.map((row, i) => (
            <ScrollingPlayerRow
              key={i}
              players={row}
              durationSec={32 + i * 5 + (i % 2) * 3}
              reverse={i % 2 === 1}
            />
          ))}

          {/* Timer overlaid centered on the players section */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              className="flex flex-col items-center"
              animate={{ scale: [1, 1.06, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
            >
              <p className="text-[72px] font-extrabold tabular-nums leading-none text-white/80 drop-shadow-lg">
                {sec}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-white/70">
                {/* Starting soon */}
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
