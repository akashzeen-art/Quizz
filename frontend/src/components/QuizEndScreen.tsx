import confetti from 'canvas-confetti'
import { motion } from 'framer-motion'
import { Sparkles, Star } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../api/client'
import { useApp } from '../context/AppContext'

type Props = {
  quizId: string
  sessionScore: number
  correctCount: number
  wrongCount: number
  totalQuestions: number
}

const REDIRECT_SEC = 5

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {[0, 1, 2].map((i) => (
        <motion.div key={i}
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: i < count ? 1 : 0.55, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.3 + i * 0.15 }}>
          <Star className={`h-12 w-12 drop-shadow-lg ${i < count ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-300'}`} />
        </motion.div>
      ))}
    </div>
  )
}

function CountUp({ target, delay = 0 }: { target: number; delay?: number }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => {
      let cur = 0
      const step = Math.max(1, Math.ceil(target / 40))
      const id = setInterval(() => {
        cur = Math.min(cur + step, target)
        setVal(cur)
        if (cur >= target) clearInterval(id)
      }, 30)
      return () => clearInterval(id)
    }, delay)
    return () => clearTimeout(t)
  }, [target, delay])
  return <>{val}</>
}

export function QuizEndScreen({ quizId, sessionScore, correctCount, wrongCount, totalQuestions }: Props) {
  const navigate = useNavigate()
  const { refreshProfile } = useApp()
  const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
  const stars = accuracy === 100 ? 3 : accuracy >= 60 ? 2 : accuracy >= 30 ? 1 : 0
  const [countdown, setCountdown] = useState(REDIRECT_SEC)
  const redirected = useRef(false)

  const grade =
    stars === 3 ? { label: 'Perfect!',   emoji: '🏆', bg: 'from-amber-400 to-orange-500' }
    : stars === 2 ? { label: 'Great job!', emoji: '🥇', bg: 'from-emerald-400 to-teal-500' }
    : stars === 1 ? { label: 'Good try!',  emoji: '🎯', bg: 'from-violet-400 to-indigo-500' }
    : { label: 'Keep going!', emoji: '💪', bg: 'from-slate-400 to-slate-600' }

  function goLeaderboard() {
    if (redirected.current) return
    redirected.current = true
    api.clearQuizPlayClientId(quizId)
    void refreshProfile()
    navigate('/leaderboard', {
      replace: true,
      state: { fromQuiz: true, score: sessionScore, correct: correctCount, total: totalQuestions },
    })
  }

  // confetti burst on mount
  useEffect(() => {
    if (stars === 0) return
    const end = Date.now() + (stars === 3 ? 3000 : 1800)
    const colors = ['#7c3aed', '#f59e0b', '#10b981', '#f43f5e', '#3b82f6']
    const burst = () => {
      confetti({ particleCount: 8, angle: 60, spread: 70, origin: { x: 0 }, colors })
      confetti({ particleCount: 8, angle: 120, spread: 70, origin: { x: 1 }, colors })
      if (Date.now() < end) requestAnimationFrame(burst)
    }
    requestAnimationFrame(burst)
  }, [stars])

  // auto-redirect countdown
  useEffect(() => {
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(id); goLeaderboard(); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="app-screen relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-5 pb-10 safe-pt-header">
      {/* bg blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/10 blur-2xl" />
      </div>

      {/* floating emoji particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(14)].map((_, i) => (
          <motion.span key={i} className="absolute text-xl"
            initial={{ opacity: 0, y: 60, scale: 0 }}
            animate={{ opacity: [0, 1, 0], y: [60, -80, -160], scale: [0, 1, 0.6] }}
            transition={{ delay: i * 0.18, duration: 3, repeat: Infinity, repeatDelay: i * 0.35 }}
            style={{ left: `${5 + (i * 21) % 88}%`, bottom: '10%' }}
          >
            {['✦', '✧', '⭐', '💫', '✨', '🌟', '⚡', '🎉'][i % 8]}
          </motion.span>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* trophy */}
        <motion.div className="mx-auto mb-4 flex h-28 w-28 items-center justify-center"
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 12, delay: 0.1 }}>
          <motion.div
            className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br ${grade.bg} shadow-2xl`}
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 2, repeat: Infinity }}>
            <span className="text-5xl">{grade.emoji}</span>
          </motion.div>
        </motion.div>

        {/* stars */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <StarRating count={stars} />
        </motion.div>

        <motion.h2 className="mt-3 text-center text-3xl font-extrabold tracking-tight text-slate-900"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          {grade.label}
        </motion.h2>
        <motion.p className="mb-5 text-center text-sm text-slate-500"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
          Quiz complete — here's how you did
        </motion.p>

        {/* 3 stat cards */}
        <motion.div className="mb-5 grid grid-cols-3 gap-3"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 180 }}>
          {[
            { label: 'Score',    value: sessionScore, color: 'text-violet-700', border: 'border-violet-200' },
            { label: 'Correct',  value: correctCount,  color: 'text-emerald-700', border: 'border-emerald-200' },
            { label: 'Wrong',    value: wrongCount,    color: 'text-rose-600',    border: 'border-rose-200' },
          ].map((s, si) => (
            <div key={s.label} className={`flex flex-col items-center rounded-2xl border ${s.border} bg-white/90 py-4 shadow-md`}>
              <span className={`text-2xl font-black tabular-nums ${s.color}`}>
                <CountUp target={s.value} delay={600 + si * 120} />
              </span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</span>
            </div>
          ))}
        </motion.div>

        {/* accuracy bar */}
        <motion.div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <div className="mb-2 flex items-center justify-between text-xs font-semibold">
            <span className="uppercase tracking-wide text-slate-400">Accuracy</span>
            <span className="text-violet-700">{accuracy}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
              initial={{ width: 0 }}
              animate={{ width: `${accuracy}%` }}
              transition={{ delay: 0.7, duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          {/* per-question dots */}
          <div className="mt-3 flex gap-1">
            {Array.from({ length: totalQuestions }, (_, qi) => (
              <motion.div key={qi}
                className={`h-2 flex-1 rounded-full ${qi < correctCount ? 'bg-emerald-500' : 'bg-rose-400'}`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.75 + qi * 0.04, type: 'spring', stiffness: 200 }}
                style={{ transformOrigin: 'left' }}
              />
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] font-semibold">
            <span className="text-emerald-600">{correctCount} correct</span>
            <span className="text-rose-500">{wrongCount} wrong</span>
          </div>
        </motion.div>

        {/* CTAs + auto-redirect */}
        <motion.div className="space-y-3"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}>

          {/* countdown ring */}
          <div className="flex flex-col items-center gap-1">
            <svg className="-rotate-90" width="48" height="48" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="#e2e8f0" strokeWidth="4" />
              <motion.circle cx="24" cy="24" r="20" fill="none" stroke="#7c3aed" strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 20}`}
                initial={{ strokeDashoffset: 0 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 20 }}
                transition={{ duration: REDIRECT_SEC, ease: 'linear' }}
              />
            </svg>
            <p className="text-xs font-semibold text-slate-500">
              Leaderboard in <span className="font-extrabold text-violet-700">{countdown}s</span>
            </p>
          </div>

          <button type="button" className="btn-app-primary py-4 text-base" onClick={goLeaderboard}>
            <Sparkles className="h-5 w-5" />
            See Leaderboard now
          </button>
          <button type="button"
            className="w-full rounded-2xl border border-slate-200 bg-white/80 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            onClick={() => { redirected.current = true; api.clearQuizPlayClientId(quizId); void refreshProfile(); navigate('/home', { replace: true }) }}>
            Back to home
          </button>
        </motion.div>
      </div>
    </div>
  )
}
