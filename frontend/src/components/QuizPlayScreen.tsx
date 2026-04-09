import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  ChevronLeft,
  Clock,
  FileText,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import * as api from '../api/client'
import {
  getCorrectEffect,
  getWrongEffect,
  randomFeedbackBundle,
  type FeedbackParticle,
} from '../lib/quizFeedback'
import type { MediaType, QuestionDto, QuizDto } from '../types'
import { useApp } from '../context/AppContext'
import { Skeleton } from './ui/Skeleton'

const QUESTION_SEC = 15

/** Default neutral tile styles — no red/green/blue primaries. */
const NEUTRAL_TILES = [
  'border-slate-200/90 bg-slate-100 text-slate-900 hover:border-slate-300 hover:bg-slate-200/90',
  'border-stone-200/90 bg-stone-100 text-stone-900 hover:border-stone-300 hover:bg-stone-200/90',
  'border-zinc-200/90 bg-zinc-100 text-zinc-900 hover:border-zinc-300 hover:bg-zinc-200/90',
  'border-neutral-200/90 bg-neutral-100 text-neutral-900 hover:border-neutral-300 hover:bg-neutral-200/90',
]

type OptionVisualState = 'idle' | 'correct' | 'wrongPick' | 'dim'

type ResultState = {
  correct: boolean
  msg: string
  effectId: number
  points: number
  correctAnswerIndex?: number | null
  selectedIndex?: number
}

function optionVisualState(
  i: number,
  result: ResultState | null,
  correctIdx: number | null | undefined,
): OptionVisualState {
  if (!result || correctIdx === undefined || correctIdx === null) return 'idle'
  if (correctIdx === i) return 'correct'
  if (result.selectedIndex === i && i !== correctIdx) return 'wrongPick'
  return 'dim'
}

function FeedbackParticles({ particle }: { particle: FeedbackParticle }) {
  if (particle === 'none') return null

  const slots = [0, 1, 2, 3, 4, 5]
  const left = (i: number) => `${10 + i * 14}%`

  if (particle === 'sparkles') {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {slots.map((s) => (
          <span
            key={s}
            className="quiz-sparkle absolute text-lg text-amber-200"
            style={{ left: left(s), bottom: '18%', animationDelay: `${s * 0.08}s` }}
          >
            ✦
          </span>
        ))}
      </div>
    )
  }

  if (particle === 'stars') {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {slots.map((s) => (
          <span
            key={s}
            className="quiz-particle-star absolute text-base text-white/90"
            style={{ left: left(s), bottom: '22%', animationDelay: `${s * 0.1}s` }}
          >
            ✧
          </span>
        ))}
      </div>
    )
  }

  if (particle === 'dots') {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {slots.map((s) => (
          <span
            key={s}
            className="quiz-particle-dot absolute h-2 w-2 rounded-full bg-white/70"
            style={{ left: left(s), bottom: '24%', animationDelay: `${s * 0.07}s` }}
          />
        ))}
      </div>
    )
  }

  if (particle === 'rings') {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {slots.map((s) => (
          <span
            key={s}
            className="quiz-particle-ring absolute flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/40"
            style={{ left: `calc(${left(s)} - 16px)`, bottom: '16%', animationDelay: `${s * 0.12}s` }}
          />
        ))}
      </div>
    )
  }

  if (particle === 'meteors') {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {slots.map((s) => (
          <span
            key={s}
            className="quiz-particle-meteor absolute text-lg text-amber-100/90"
            style={{ left: left(s), bottom: '12%', animationDelay: `${s * 0.15}s` }}
          >
            ✦
          </span>
        ))}
      </div>
    )
  }

  if (particle === 'bubbles') {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {slots.map((s) => (
          <span
            key={s}
            className="quiz-particle-bubble absolute h-10 w-10 rounded-full border border-white/35 bg-white/10"
            style={{ left: `calc(${left(s)} - 20px)`, bottom: '10%', animationDelay: `${s * 0.11}s` }}
          />
        ))}
      </div>
    )
  }

  if (particle === 'diamonds') {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {slots.map((s) => (
          <span
            key={s}
            className="quiz-particle-diamond absolute text-sm text-cyan-100"
            style={{ left: left(s), bottom: '20%', animationDelay: `${s * 0.09}s` }}
          >
            ◆
          </span>
        ))}
      </div>
    )
  }

  return null
}

export function QuizPlayScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { refreshProfile } = useApp()
  const [loading, setLoading] = useState(true)
  const [quizMeta, setQuizMeta] = useState<QuizDto | null>(null)
  const [questions, setQuestions] = useState<QuestionDto[]>([])
  const [index, setIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(QUESTION_SEC)
  const [frozen, setFrozen] = useState(false)
  const [result, setResult] = useState<ResultState | null>(null)
  const [showEndCard, setShowEndCard] = useState(false)
  const [sessionScore, setSessionScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [sliderVal, setSliderVal] = useState(50)
  const sliderRef = useRef(sliderVal)
  const questionStartedAt = useRef(Date.now())
  sliderRef.current = sliderVal

  const q = questions[index]

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      try {
        const clientId = api.getQuizPlayClientId(id)
        const detail = await api.fetchQuiz(id, clientId)
        if (!cancelled) {
          setQuizMeta(detail.quiz)
          setQuestions(detail.questions)
          if (detail.questions.length === 0) toast.error('No questions for your categories')
        }
      } catch (e) {
        toast.error(api.getApiErrorMessage(e))
        navigate('/home', { replace: true })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, navigate])

  const sliderBounds = useMemo(() => {
    if (!q || q.inputType !== 'slider') return { min: 0, max: 100 }
    const a = Number(q.options[0] ?? 0)
    const b = Number(q.options[1] ?? 100)
    return {
      min: Math.min(a, b),
      max: Math.max(a, b),
    }
  }, [q])

  useEffect(() => {
    if (!q || frozen || result) return
    questionStartedAt.current = Date.now()
    setTimeLeft(QUESTION_SEC)
    if (q.inputType === 'slider') {
      const mid = Math.round((sliderBounds.min + sliderBounds.max) / 2)
      setSliderVal(mid)
    }
  }, [q, frozen, result, sliderBounds])

  const submit = useCallback(
    async (
      answerIndex?: number,
      sliderValue?: number,
      timedOut = false,
    ) => {
      if (!id || !q || frozen) return
      setFrozen(true)
      const timeMs = timedOut
        ? QUESTION_SEC * 1000
        : Math.min(
            QUESTION_SEC * 1000,
            Math.max(0, Date.now() - questionStartedAt.current),
          )
      try {
        const res = await api.submitAnswer({
          quizId: id,
          questionId: q.id,
          answerIndex,
          sliderValue,
          timeMs,
        })
        const bundle = randomFeedbackBundle(res.correct)
        setResult({
          correct: bundle.correct,
          msg: bundle.message,
          effectId: bundle.effectId,
          points: res.pointsEarned,
          correctAnswerIndex: res.correctAnswerIndex,
          selectedIndex: timedOut ? undefined : answerIndex,
        })
        setSessionScore((s) => s + Math.max(0, res.pointsEarned))
        if (res.correct) setCorrectCount((c) => c + 1)
        await refreshProfile()
      } catch {
        toast.error('Submit failed')
        setFrozen(false)
      }
    },
    [id, q, frozen, refreshProfile],
  )

  useEffect(() => {
    if (!q || frozen || result) return
    const started = Date.now()
    const timer = window.setInterval(() => {
      const elapsedSec = (Date.now() - started) / 1000
      const left = Math.max(0, QUESTION_SEC - elapsedSec)
      setTimeLeft(Math.ceil(left))
      if (left <= 0) {
        window.clearInterval(timer)
        void submit(
          undefined,
          q.inputType === 'slider' ? sliderRef.current : undefined,
          true,
        )
      }
    }, 200)
    return () => window.clearInterval(timer)
  }, [q?.id, q?.inputType, frozen, result, submit])

  function onPick(optionIdx: number) {
    if (frozen || result) return
    void submit(optionIdx, undefined, false)
  }

  function onSliderRelease() {
    if (frozen || result) return
    void submit(undefined, sliderVal, false)
  }

  function onNext() {
    if (index + 1 >= questions.length) {
      setShowEndCard(true)
      return
    }
    setResult(null)
    setFrozen(false)
    setIndex((i) => i + 1)
  }

  if (loading) {
    return (
      <div className="app-screen min-h-[100dvh] px-5 pb-5 safe-pt-header">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-gradient-to-br from-violet-200 to-indigo-200" />
          <Skeleton className="h-8 flex-1 rounded-xl" />
        </div>
        <Skeleton className="mb-6 h-44 w-full rounded-3xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!q) {
    return (
      <div className="app-screen flex min-h-[100dvh] flex-col items-center justify-center px-8 pb-8 text-center safe-pt-header">
        <div className="app-card max-w-sm p-8">
          <p className="text-slate-700">Nothing to play here.</p>
          <button
            type="button"
            className="btn-app-primary mt-6 w-auto px-8 py-3 normal-case"
            onClick={() => navigate('/home')}
          >
            Back home
          </button>
        </div>
      </div>
    )
  }

  if (showEndCard) {
    return (
      <div className="app-screen relative min-h-[100dvh] overflow-hidden safe-pt-header">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-fuchsia-500/20 via-violet-500/10 to-indigo-500/20" />
        <div className="pointer-events-none absolute -left-16 -top-12 h-44 w-44 rounded-full bg-pink-400/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -right-12 h-52 w-52 rounded-full bg-indigo-400/30 blur-3xl" />

        <div className="pointer-events-none absolute inset-0">
          {[...Array(18)].map((_, i) => (
            <motion.span
              key={i}
              className="absolute"
              initial={{ opacity: 0, scale: 0.4, y: 24 }}
              animate={{
                opacity: [0, 1, 0.55, 1],
                scale: [0.4, 1.1, 0.95, 1],
                y: [24, -8, 0],
              }}
              transition={{
                delay: i * 0.045,
                duration: 1.4,
                repeat: Infinity,
                repeatType: 'mirror',
              }}
              style={{
                left: `${8 + ((i * 17) % 84)}%`,
                top: `${8 + ((i * 23) % 76)}%`,
              }}
            >
              <Sparkles className="h-4 w-4 text-amber-400/80" />
            </motion.span>
          ))}
        </div>

        <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-md items-center px-5 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            className="w-full rounded-3xl border border-violet-200/80 bg-white/92 p-6 text-center shadow-2xl shadow-violet-500/20 backdrop-blur-md"
          >
            <motion.div
              className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-fuchsia-500 text-white shadow-xl shadow-fuchsia-500/35"
              animate={{ rotate: [0, -6, 6, 0], scale: [1, 1.06, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            >
              <Sparkles className="h-10 w-10" />
            </motion.div>

            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Level Complete!</h2>
            <p className="mt-1 text-sm font-medium text-slate-600">
              Great play! Here is your final quiz result.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-lime-200 bg-lime-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-lime-700">Correct</p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums text-lime-800">
                  {correctCount}/{questions.length}
                </p>
              </div>
              <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Score</p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums text-violet-800">{sessionScore}</p>
              </div>
            </div>

            <button
              type="button"
              className="btn-app-primary mt-6 py-4"
              onClick={() => {
                toast.success('Quiz complete!')
                if (id) api.clearQuizPlayClientId(id)
                navigate('/home', { replace: true })
              }}
            >
              Back to home
            </button>
          </motion.div>
        </div>
      </div>
    )
  }

  const progress = timeLeft / QUESTION_SEC
  const optionCount =
    q.inputType === 'binary' ? 2 : q.inputType === 'mcq3' ? 3 : 4
  const revealed = !!result
  const correctIdx = result?.correctAnswerIndex

  const quizKindLabel =
    q.inputType === 'binary'
      ? 'True or false'
      : q.inputType === 'slider'
        ? 'Slider'
        : q.inputType === 'mcq3'
          ? 'Multiple choice'
          : 'Multiple choice'

  const feedbackCorrect = result?.correct
    ? getCorrectEffect(result.effectId)
    : null
  const feedbackWrong = result && !result.correct ? getWrongEffect(result.effectId) : null

  return (
    <div
      className={`app-screen relative min-h-[100dvh] pb-36 ${revealed ? 'pt-36' : ''}`}
    >
      <AnimatePresence>
        {result && feedbackCorrect && result.correct && (
          <motion.div
            className={`fixed left-0 right-0 top-0 z-40 overflow-hidden safe-pt-header bg-gradient-to-br ${feedbackCorrect.gradient} ${feedbackCorrect.glowClass}`}
            initial={{ y: -140, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -140, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-25"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h10v10H0z' fill='%23fff' fill-opacity='0.1'/%3E%3C/svg%3E")`,
              }}
            />
            <FeedbackParticles particle={feedbackCorrect.particle} />
            <div
              className={`relative px-5 py-5 text-center text-white ${feedbackCorrect.motionClass}`}
            >
              <div className="mb-1 flex items-center justify-center gap-2">
                <motion.span
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 12 }}
                >
                  <Sparkles
                    className={`h-7 w-7 text-amber-200 drop-shadow-md ${feedbackCorrect.iconSpin ? 'animate-spin' : ''}`}
                  />
                </motion.span>
                <h2 className="text-2xl font-extrabold tracking-tight">Correct!</h2>
              </div>
              <p className="mt-1 text-sm font-medium leading-snug text-white/95">
                {result.msg}
              </p>
              {result.points > 0 && (
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="mt-3 inline-flex rounded-full bg-white/20 px-4 py-1 text-base font-bold tabular-nums text-white ring-2 ring-white/30"
                >
                  +{result.points} pts
                </motion.span>
              )}
            </div>
          </motion.div>
        )}
        {result && feedbackWrong && !result.correct && (
          <motion.div
            className={`fixed left-0 right-0 top-0 z-40 overflow-hidden safe-pt-header bg-gradient-to-br ${feedbackWrong.gradient} ${feedbackWrong.shakeClass} ${feedbackWrong.pulseEdges ? 'quiz-wrong-pulse-edges' : ''}`}
            initial={{ y: -140, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -140, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          >
            <div
              className={`pointer-events-none absolute inset-0 ${feedbackWrong.overlayClass}`}
            />
            <div
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h10v10H0z' fill='%23fff' fill-opacity='0.1'/%3E%3C/svg%3E")`,
              }}
            />
            <div className="relative px-5 py-5 text-center text-white">
              <div className="mb-1 flex items-center justify-center gap-2">
                <h2 className="text-2xl font-extrabold tracking-tight">Not quite</h2>
              </div>
              <p className="mt-1 text-sm font-medium leading-snug text-white/95">
                {result.msg}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-violet-100/80 bg-white/95 px-3 pb-3 shadow-md shadow-violet-500/5 backdrop-blur-xl safe-pt-sticky">
        <button
          type="button"
          className="rounded-xl p-2 text-slate-700 hover:bg-slate-100"
          onClick={() => navigate('/home')}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="flex flex-1 flex-col items-center gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            {quizKindLabel}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Quiz
          </span>
          <div className="h-1 w-full max-w-[200px] overflow-hidden rounded-full bg-slate-200">
            <motion.div
              className="h-full rounded-full bg-violet-600"
              animate={{
                width: `${((index + 1) / Math.max(questions.length, 1)) * 100}%`,
              }}
            />
          </div>
          {!revealed && (
            <div className="h-1 w-full max-w-[200px] overflow-hidden rounded-full bg-slate-200">
              <motion.div
                className="h-full rounded-full bg-amber-400"
                animate={{ width: `${progress * 100}%` }}
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold tabular-nums text-slate-800">
          <Clock className="h-4 w-4" />
          {revealed ? '—' : `${timeLeft}s`}
        </div>
      </header>

      <div className="px-4 pt-4">
        <p className="text-center text-sm font-medium tabular-nums text-slate-500">
          {index + 1}/{questions.length}
        </p>
        {quizMeta?.referenceDocumentUrl && (
          <a
            href={quizMeta.referenceDocumentUrl}
            target="_blank"
            rel="noreferrer"
            className="mb-3 flex items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-center text-sm font-semibold text-violet-900 hover:bg-violet-100"
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {quizMeta.referenceDocumentName || 'Open source document'}
            </span>
          </a>
        )}
        <MediaBlock mediaType={q.mediaType} url={q.mediaUrl} />
        <h2 className="mt-4 text-lg font-extrabold leading-snug tracking-tight text-slate-900">
          {q.questionText}
        </h2>
        {q.documentReference && (
          <p className="mt-2 text-sm font-medium text-slate-600">
            <span className="text-slate-500">From material: </span>
            {q.documentReference}
          </p>
        )}

        <div className="mt-6">
          {q.inputType === 'slider' ? (
            <div className="app-card border-slate-200/90 p-5 shadow-sm ring-1 ring-slate-100">
              <label className="mb-4 block text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                Slide to answer
              </label>
              <input
                type="range"
                min={sliderBounds.min}
                max={sliderBounds.max}
                value={sliderVal}
                disabled={!!result}
                onChange={(e) => setSliderVal(Number(e.target.value))}
                onPointerUp={onSliderRelease}
                onKeyUp={(e) => {
                  if (e.key === 'Enter') onSliderRelease()
                }}
                className="slider-neutral w-full"
              />
              <div className="mt-4 flex items-center justify-between text-xs font-medium text-slate-400">
                <span>◀ {sliderBounds.min}</span>
                <span className="text-2xl font-bold tabular-nums text-slate-900">
                  {sliderVal}
                </span>
                <span>
                  {sliderBounds.max} ▶
                </span>
              </div>
            </div>
          ) : optionCount === 4 ? (
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <OptionTile
                  key={i}
                  label={q.options[i] ?? '—'}
                  idleClass={NEUTRAL_TILES[i % NEUTRAL_TILES.length]}
                  visual={optionVisualState(i, result, correctIdx ?? null)}
                  disabled={!!result}
                  onClick={() => onPick(i)}
                />
              ))}
            </div>
          ) : optionCount === 2 ? (
            <div className="grid grid-cols-2 gap-3">
              {[0, 1].map((i) => (
                <OptionTile
                  key={i}
                  label={q.options[i] ?? '—'}
                  idleClass={NEUTRAL_TILES[i % 2]}
                  visual={optionVisualState(i, result, correctIdx ?? null)}
                  disabled={!!result}
                  large={q.inputType === 'binary'}
                  onClick={() => onPick(i)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <OptionTile
                  key={i}
                  label={q.options[i] ?? '—'}
                  idleClass={NEUTRAL_TILES[i % NEUTRAL_TILES.length]}
                  visual={optionVisualState(i, result, correctIdx ?? null)}
                  disabled={!!result}
                  burgerStyle
                  onClick={() => onPick(i)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            className="fixed inset-x-0 bottom-0 z-30 border-t border-violet-100/90 bg-white/95 p-4 pb-safe shadow-[0_-12px_40px_-8px_rgba(91,33,182,0.12)] backdrop-blur-xl"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <motion.button
              type="button"
              onClick={onNext}
              className="btn-app-primary py-4"
              whileTap={{ scale: 0.98 }}
            >
              {index + 1 >= questions.length ? 'Finish' : 'Next'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function OptionTile({
  label,
  idleClass,
  visual,
  disabled,
  large,
  burgerStyle,
  onClick,
}: {
  label: string
  idleClass: string
  visual: OptionVisualState
  disabled: boolean
  large?: boolean
  burgerStyle?: boolean
  onClick: () => void
}) {
  const reveal = visual !== 'idle'

  const stateClass =
    visual === 'correct'
      ? 'border-green-700 bg-green-700 text-white ring-2 ring-green-600 shadow-lg shadow-green-700/35'
      : visual === 'wrongPick'
        ? 'border-red-600 bg-red-600 text-white ring-2 ring-red-500 shadow-md shadow-red-500/30'
        : visual === 'dim'
          ? 'border-slate-200/60 bg-slate-50 text-slate-400 opacity-60'
          : idleClass

  return (
    <motion.button
      type="button"
      disabled={disabled}
      initial={false}
      animate={
        visual === 'correct'
          ? { scale: [1, 1.04, 1], transition: { duration: 0.45 } }
          : visual === 'wrongPick'
            ? { x: [0, -4, 4, -3, 3, 0], transition: { duration: 0.4 } }
            : {}
      }
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      className={`relative w-full rounded-2xl border px-3 text-sm font-bold leading-snug shadow-sm transition ${stateClass} ${
        burgerStyle
          ? 'min-h-[96px] px-5 py-4 text-center text-base'
          : large
            ? 'min-h-[120px] py-6 text-base text-center'
            : 'min-h-[88px] py-4 text-center'
      } disabled:cursor-default`}
    >
      {visual === 'correct' && (
        <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-green-900 text-white shadow-md ring-2 ring-white">
          <Check className="h-4 w-4" strokeWidth={3} />
        </span>
      )}
      {visual === 'wrongPick' && (
        <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-700 text-white shadow-md ring-2 ring-white">
          <X className="h-4 w-4" strokeWidth={3} />
        </span>
      )}
      <span className={reveal ? 'pr-7' : ''}>{label}</span>
    </motion.button>
  )
}

function MediaBlock({
  mediaType,
  url,
}: {
  mediaType: MediaType
  url?: string
}) {
  if (!url || mediaType === 'none') return null

  if (mediaType === 'image' || mediaType === 'gif') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50 shadow-inner ring-1 ring-slate-100"
      >
        <img src={url} alt="" className="max-h-56 w-full object-cover" />
      </motion.div>
    )
  }

  if (mediaType === 'video') {
    return (
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/90 bg-black shadow-sm ring-1 ring-slate-200/50">
        <video src={url} className="max-h-56 w-full" controls playsInline />
      </div>
    )
  }

  if (mediaType === 'audio') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 rounded-3xl border border-violet-200/80 bg-gradient-to-b from-violet-50/90 to-white p-6 text-center shadow-sm ring-1 ring-violet-100/60"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/30">
          <Volume2 className="h-8 w-8" />
        </div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-violet-700/90">
          Listen carefully
        </p>
        <audio src={url} controls className="w-full accent-violet-600" />
      </motion.div>
    )
  }

  return null
}
