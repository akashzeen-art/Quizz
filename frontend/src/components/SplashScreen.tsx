import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_NAME } from '../constants/branding'
import { usePreferVideo } from '../hooks/usePreferVideo'
import { useApp } from '../context/AppContext'
import { shouldForceCategoryOnboarding } from '../lib/categoryOnboarding'
import { VideoBackground } from './VideoBackground'

export function SplashScreen() {
  const navigate = useNavigate()
  const { token, user, loading } = useApp()
  const preferVideo = usePreferVideo()
  const [progress, setProgress] = useState(0)
  const [taglineIndex, setTaglineIndex] = useState(0)
  const [moneyText, setMoneyText] = useState('10,000,000')
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number>(0)

  const TOTAL_MS = 5000
  const MONEY_START = 10_000_000
  const MONEY_END = 52_348_920

  const TAGLINES = useMemo(
    () => [
      { lang: 'EN', text: 'Play And Earn Big' },
      { lang: 'HI', text: 'खेलो और बड़ा कमाओ' },
      { lang: 'ES', text: 'Juega y gana en grande' },
      { lang: 'FR', text: 'Jouez et gagnez gros' },
      { lang: 'AR', text: 'العب واربح الكثير' },
      { lang: 'BN', text: 'খেলুন আর বড় জিতুন' },
      { lang: 'TA', text: 'விளையாடு & பெரியதா சம்பாதி' },
      { lang: 'TE', text: 'ఆడు & భారీగా గెలుచుకో' },
      { lang: 'MR', text: 'खेळा आणि मोठं कमवा' },
      { lang: 'GU', text: 'રમો અને મોટું કમાવો' },
      { lang: 'PA', text: 'ਖੇਡੋ ਤੇ ਵੱਡਾ ਕਮਾਓ' },
      { lang: 'UR', text: 'کھیلو اور بڑا کماؤ' },
      { lang: 'PT', text: 'Jogue e ganhe muito' },
      { lang: 'DE', text: 'Spiele und gewinne groß' },
      { lang: 'JA', text: '遊んで大きく稼ごう' },
    ],
    [],
  )

  useEffect(() => {
    // Sync everything to a single start time for smoothness.
    startRef.current = performance.now()

    const rotateId = window.setInterval(() => {
      setTaglineIndex((i) => (i + 1) % TAGLINES.length)
    }, 420)

    const loop = (now: number) => {
      const elapsed = Math.max(0, now - startRef.current)
      const t = Math.min(1, elapsed / TOTAL_MS)

      // Progress bar
      setProgress(Math.round(t * 100))

      // Casino-ish ease (fast start, slow finish)
      const easeOutCubic = 1 - Math.pow(1 - t, 3)
      const val = Math.round(MONEY_START + (MONEY_END - MONEY_START) * easeOutCubic)

      // Avoid Intl perf cost; quick formatting.
      setMoneyText(val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','))

      if (t < 1) {
        rafRef.current = requestAnimationFrame(loop)
      }
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      window.clearInterval(rotateId)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  useEffect(() => {
    if (loading) return
    if (progress < 100) return
    const t = setTimeout(() => {
      if (!token) navigate('/auth', { replace: true })
      else if (shouldForceCategoryOnboarding(user))
        navigate('/categories', { replace: true })
      else navigate('/home', { replace: true })
    }, 150)
    return () => clearTimeout(t)
  }, [loading, navigate, progress, token, user?.categories?.length])

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-gradient-to-b from-slate-950 via-violet-950 to-indigo-950">
      {preferVideo ? <VideoBackground variant="quizzo" className="z-[-20]" /> : null}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.14]"
        aria-hidden
      >
        <div className="absolute inset-0 bg-[url('/money.gif')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/35 via-slate-950/15 to-indigo-950/40" />
      </div>
      {/* Removed geometric overlay for cleaner GIF background */}

      <div className="relative z-10 flex min-h-[100dvh] flex-col px-6 safe-pt-header">
        <motion.p
          className="text-center text-lg font-bold tracking-wide text-white drop-shadow-md"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {APP_NAME}
        </motion.p>

        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="mb-6 text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={taglineIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.14 }}
                className="inline-flex flex-col items-center gap-1"
              >
                <p className="text-xs font-extrabold tracking-[0.22em] text-white/60">
                  {TAGLINES[taglineIndex]?.lang}
                </p>
                <p className="text-base font-extrabold text-white">
                  {TAGLINES[taglineIndex]?.text}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <motion.div
            className="relative flex w-full max-w-sm flex-col items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-white/5 px-6 py-7 shadow-[0_0_80px_rgba(168,85,247,0.22)] backdrop-blur-xl"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <div
              className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-amber-400/15 blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -right-20 -bottom-20 h-44 w-44 rounded-full bg-fuchsia-500/15 blur-3xl"
              aria-hidden
            />

            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">
              Jackpot
            </p>
            <motion.p
              className="mt-2 font-mono text-4xl font-black tabular-nums tracking-tight text-white"
              animate={{ filter: ['drop-shadow(0 0 0px rgba(245,158,11,0))', 'drop-shadow(0 0 18px rgba(245,158,11,0.35))', 'drop-shadow(0 0 0px rgba(245,158,11,0))'] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              {moneyText}
            </motion.p>

            <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 shadow-[0_0_22px_rgba(245,158,11,0.45)]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.12, ease: 'linear' }}
              />
            </div>
            <div className="mt-2 flex w-full justify-between text-[11px] font-semibold text-white/55">
              <span>Launching</span>
              <span>{Math.min(100, progress)}%</span>
            </div>
          </motion.div>

          <motion.p
            className="mt-7 text-sm font-semibold text-white/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            Warming up rewards…
          </motion.p>
        </div>

        <div className="w-full max-w-sm shrink-0 pb-12">
          <p className="text-center text-[11px] font-semibold tracking-wide text-white/45">
            Tip: Play quizzes daily to climb the leaderboard!
          </p>
        </div>
      </div>
    </div>
  )
}
