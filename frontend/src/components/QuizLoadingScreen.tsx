import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import * as api from '../api/client'
import { useApp } from '../context/AppContext'
import { dicebearUrl } from '../constants/avatars'
import type { QuizDto } from '../types'
import { GeometricOverlay } from './GeometricOverlay'
import { VideoBackground } from './VideoBackground'
import { usePreferVideo } from '../hooks/usePreferVideo'

const LOBBY_PLAYER_COUNT = 30
const ROW_SIZES = [8, 8, 7, 7] as const
const LOAD_SECONDS = 7

type LobbyPlayer = { id: string; name: string; seed: string }

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
  const renderChips = (suffix: string) =>
    players.map((p) => (
      <div
        key={`${suffix}-${p.id}`}
        className="flex shrink-0 items-center gap-2 rounded-full border border-white/20 bg-white/15 py-1 pl-1 pr-3 shadow-md backdrop-blur-md"
      >
        <img
          src={dicebearUrl(p.seed)}
          alt=""
          className="h-8 w-8 shrink-0 rounded-full bg-white/90 ring-2 ring-white/40"
          width={32}
          height={32}
        />
        <span className="max-w-[120px] truncate text-xs font-semibold text-white">
          {p.name}
        </span>
      </div>
    ))

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
    let cancelled = false
    setCreditReady(false)
    ;(async () => {
      try {
        const clientId = api.getQuizPlayClientId(id)
        const bal = await api.deductQuizCredits(id, clientId)
        if (cancelled) return
        setUser((prev) =>
          prev ? { ...prev, credits: bal.credits, totalSpent: bal.totalSpent } : prev,
        )
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
          className="mt-5 w-full max-w-sm space-y-2.5"
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
        </div>

        <div className="mt-auto flex flex-col items-center pt-10">
          <p className="text-3xl font-bold tabular-nums text-white">{sec}</p>
          <p className="mt-2 text-xs font-medium uppercase tracking-wider text-white/70">
            Starting soon
          </p>
        </div>
      </div>
    </div>
  )
}
