import { AnimatePresence, motion } from 'framer-motion'
import { Clock, Sparkles } from 'lucide-react'
import {
  getCorrectEffect,
  getWrongEffect,
  type FeedbackParticle,
} from '../lib/quizFeedback'

// ── particles ────────────────────────────────────────────────────────────────

function FeedbackParticles({ particle }: { particle: FeedbackParticle }) {
  if (particle === 'none') return null
  const slots = [0, 1, 2, 3, 4, 5]
  const left = (i: number) => `${10 + i * 14}%`

  const configs: Record<string, { cls: string; content?: string }> = {
    sparkles:  { cls: 'quiz-sparkle absolute text-lg text-amber-200', content: '✦' },
    stars:     { cls: 'quiz-particle-star absolute text-base text-white/90', content: '✧' },
    meteors:   { cls: 'quiz-particle-meteor absolute text-lg text-amber-100/90', content: '✦' },
    diamonds:  { cls: 'quiz-particle-diamond absolute text-sm text-cyan-100', content: '◆' },
    dots:      { cls: 'quiz-particle-dot absolute h-2 w-2 rounded-full bg-white/70' },
    rings:     { cls: 'quiz-particle-ring absolute flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/40' },
    bubbles:   { cls: 'quiz-particle-bubble absolute h-10 w-10 rounded-full border border-white/35 bg-white/10' },
  }

  const cfg = configs[particle]
  if (!cfg) return null

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {slots.map((s) => (
        <span
          key={s}
          className={cfg.cls}
          style={{
            left: cfg.cls.includes('ring') || cfg.cls.includes('bubble')
              ? `calc(${left(s)} - 16px)` : left(s),
            bottom: '18%',
            animationDelay: `${s * 0.09}s`,
          }}
        >
          {cfg.content}
        </span>
      ))}
    </div>
  )
}

// ── banners ───────────────────────────────────────────────────────────────────

type Props = {
  correct: boolean | null   // null = no result yet
  timedOut: boolean
  points: number
  msg: string
  effectId: number
}

const SPRING = { type: 'spring', damping: 22, stiffness: 280 } as const
const SLIDE  = { y: -140, opacity: 0 }

export function QuizFeedbackBanner({ correct, timedOut, points, msg, effectId }: Props) {
  const show = correct !== null
  // timedOut takes priority — never show wrong banner on timeout
  const correctFx = correct === true && !timedOut ? getCorrectEffect(effectId) : null
  const wrongFx   = correct === false && !timedOut ? getWrongEffect(effectId) : null

  return (
    <AnimatePresence>
      {/* ── TIMEOUT ── */}
      {show && timedOut && (
        <motion.div
          key="timeout"
          className="fixed left-0 right-0 top-0 z-40 overflow-hidden safe-pt-header bg-gradient-to-br from-slate-600 to-slate-800"
          initial={SLIDE} animate={{ y: 0, opacity: 1 }} exit={SLIDE}
          transition={SPRING}
        >
          <div className="relative px-5 py-5 text-center text-white">
            <div className="mb-1 flex items-center justify-center gap-2">
              <Clock className="h-6 w-6 text-slate-300" />
              <h2 className="text-2xl font-extrabold tracking-tight">Time's up!</h2>
            </div>
            <p className="mt-1 text-sm font-medium text-white/80">No answer submitted</p>
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-3 inline-flex rounded-full bg-white/20 px-4 py-1 text-base font-bold tabular-nums text-white ring-2 ring-white/30"
            >
              0 pts
            </motion.span>
          </div>
        </motion.div>
      )}

      {/* ── CORRECT ── */}
      {show && correctFx && (
        <motion.div
          key="correct"
          className={`fixed left-0 right-0 top-0 z-40 overflow-hidden safe-pt-header bg-gradient-to-br ${correctFx.gradient} ${correctFx.glowClass}`}
          initial={SLIDE} animate={{ y: 0, opacity: 1 }} exit={SLIDE}
          transition={SPRING}
        >
          <div className="pointer-events-none absolute inset-0 opacity-25"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h10v10H0z' fill='%23fff' fill-opacity='0.1'/%3E%3C/svg%3E")` }}
          />
          <FeedbackParticles particle={correctFx.particle} />
          <div className={`relative px-5 py-5 text-center text-white ${correctFx.motionClass}`}>
            <div className="mb-1 flex items-center justify-center gap-2">
              <motion.span initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 12 }}>
                <Sparkles className={`h-7 w-7 text-amber-200 drop-shadow-md ${correctFx.iconSpin ? 'animate-spin' : ''}`} />
              </motion.span>
              <h2 className="text-2xl font-extrabold tracking-tight">Correct!</h2>
            </div>
            <p className="mt-1 text-sm font-medium leading-snug text-white/95">{msg}</p>
            {points > 0 && (
              <motion.span initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="mt-3 inline-flex rounded-full bg-white/20 px-4 py-1 text-base font-bold tabular-nums text-white ring-2 ring-white/30">
                +{points} pts
              </motion.span>
            )}
          </div>
        </motion.div>
      )}

      {/* ── WRONG ── */}
      {show && wrongFx && (
        <motion.div
          key="wrong"
          className={`fixed left-0 right-0 top-0 z-40 overflow-hidden safe-pt-header bg-gradient-to-br ${wrongFx.gradient} ${wrongFx.shakeClass} ${wrongFx.pulseEdges ? 'quiz-wrong-pulse-edges' : ''}`}
          initial={SLIDE} animate={{ y: 0, opacity: 1 }} exit={SLIDE}
          transition={SPRING}
        >
          <div className={`pointer-events-none absolute inset-0 ${wrongFx.overlayClass}`} />
          <div className="pointer-events-none absolute inset-0 opacity-20"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h10v10H0z' fill='%23fff' fill-opacity='0.1'/%3E%3C/svg%3E")` }}
          />
          <div className="relative px-5 py-5 text-center text-white">
            <h2 className="text-2xl font-extrabold tracking-tight">Not quite</h2>
            <p className="mt-1 text-sm font-medium leading-snug text-white/95">{msg}</p>
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-3 inline-flex rounded-full bg-white/20 px-4 py-1 text-base font-bold tabular-nums text-white ring-2 ring-white/30"
            >
              −2 pts
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
