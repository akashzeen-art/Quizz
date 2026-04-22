import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Clock, FileText, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import * as api from '../api/client'
import { randomFeedbackBundle } from '../lib/quizFeedback'
import type { QuestionDto, QuizDto } from '../types'
import { useApp } from '../context/AppContext'
import { Skeleton } from './ui/Skeleton'
import { QuizSounds } from './QuizSounds'
import { QuizFeedbackBanner } from './QuizFeedbackBanner'
import { QuizEndScreen } from './QuizEndScreen'
import { OptionTile, MediaBlock, NEUTRAL_TILES, optionVisualState } from './QuizOptionTile'

const QUESTION_SEC = 15

type ResultState = {
  correct: boolean
  timedOut: boolean
  msg: string
  effectId: number
  points: number
  correctAnswerIndex?: number | null
  selectedIndex?: number
}

export function QuizPlayScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { refreshProfile, setUser } = useApp()

  const [loading, setLoading]         = useState(true)
  const [quizMeta, setQuizMeta]       = useState<QuizDto | null>(null)
  const [questions, setQuestions]     = useState<QuestionDto[]>([])
  const [index, setIndex]             = useState(0)
  const [timeLeft, setTimeLeft]       = useState(QUESTION_SEC)
  const [frozen, setFrozen]           = useState(false)
  const [result, setResult]           = useState<ResultState | null>(null)
  const [showEndCard, setShowEndCard] = useState(false)
  const [sessionScore, setSessionScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount]     = useState(0)
  const [sliderVal, setSliderVal]     = useState(50)

  const sliderRef          = useRef(sliderVal)
  const questionStartedAt  = useRef(Date.now())
  const sessionIdRef       = useRef('')
  sliderRef.current = sliderVal

  const q = questions[index]

  // ── load quiz ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      try {
        const clientId = api.getQuizPlayClientId(id)
        sessionIdRef.current = clientId
        const detail = await api.fetchQuiz(id, clientId)
        if (!cancelled) {
          setQuizMeta(detail.quiz)
          setQuestions(detail.questions)
          if (detail.questions.length === 0) {
            toast.error('No questions for your categories')
          }
        }
      } catch (e) {
        toast.error(api.getApiErrorMessage(e))
        navigate('/home', { replace: true })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id, navigate])

  // ── slider bounds ──────────────────────────────────────────────────────────
  const sliderBounds = useMemo(() => {
    if (!q || q.inputType !== 'slider') return { min: 0, max: 100 }
    const a = Number(q.options[0] ?? 0)
    const b = Number(q.options[1] ?? 100)
    return { min: Math.min(a, b), max: Math.max(a, b) }
  }, [q])

  // ── reset on new question ──────────────────────────────────────────────────
  useEffect(() => {
    if (!q || frozen || result) return
    questionStartedAt.current = Date.now()
    setTimeLeft(QUESTION_SEC)
    if (q.inputType === 'slider') {
      setSliderVal(Math.round((sliderBounds.min + sliderBounds.max) / 2))
    }
  }, [q, frozen, result, sliderBounds])

  // ── submit ─────────────────────────────────────────────────────────────────
  const submit = useCallback(async (
    answerIndex?: number,
    sliderValue?: number,
    timedOut = false,
  ) => {
    if (!id || !q || frozen) return
    setFrozen(true)
    const timeMs = timedOut
      ? QUESTION_SEC * 1000
      : Math.min(QUESTION_SEC * 1000, Math.max(0, Date.now() - questionStartedAt.current))
    try {
      const res = await api.submitAnswer({ quizId: id, questionId: q.id, answerIndex, sliderValue, timeMs, timedOut, sessionId: sessionIdRef.current })
      const bundle = randomFeedbackBundle(res.correct)

      // Trust backend-calculated score (includes booster x2 logic).
      const pts = res.pointsEarned

      // play sound
      if (!timedOut) {
        if (res.correct) QuizSounds.correct()
        else QuizSounds.wrong()
      }

      setResult({
        correct: res.correct,
        timedOut,
        msg: bundle.message,
        effectId: bundle.effectId,
        points: pts,
        correctAnswerIndex: res.correctAnswerIndex,
        selectedIndex: timedOut ? undefined : answerIndex,
      })
      // clamp session score at 0 — never show negative total
      setSessionScore((s) => Math.max(0, s + pts))
      if (res.correct) setCorrectCount((c) => c + 1)
      else if (!timedOut) setWrongCount((c) => c + 1)

      // Optimistically update user scores in context immediately
      if (pts !== 0) {
        setUser((prev) => {
          if (!prev) return prev
          const add = (v: number) => Math.max(0, v + pts)
          return {
            ...prev,
            totalScore:   add(prev.totalScore),
            weeklyScore:  add(prev.weeklyScore),
            monthlyScore: add(prev.monthlyScore),
            dayScore:     add(prev.dayScore),
            points:       add(prev.points),
          }
        })
      }
      // Sync real value from backend in background
      void refreshProfile()
    } catch {
      toast.error('Submit failed')
      setFrozen(false)
    }
  }, [id, q, frozen, refreshProfile, setUser])

  // ── countdown timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!q || frozen || result) return
    const started = Date.now()
    const timer = window.setInterval(() => {
      const left = Math.max(0, QUESTION_SEC - (Date.now() - started) / 1000)
      setTimeLeft(Math.ceil(left))
      if (left <= 0) {
        window.clearInterval(timer)
        void submit(undefined, q.inputType === 'slider' ? sliderRef.current : undefined, true)
      }
    }, 200)
    return () => window.clearInterval(timer)
  }, [q?.id, q?.inputType, frozen, result, submit])

  function onPick(i: number) { if (!frozen && !result) void submit(i, undefined, false) }
  function onSliderSubmit() { if (!frozen && !result) void submit(undefined, sliderVal, false) }
  function onNext() {
    if (index + 1 >= questions.length) { setShowEndCard(true); return }
    setResult(null); setFrozen(false); setIndex((i) => i + 1)
  }

  // ── loading ────────────────────────────────────────────────────────────────
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

  // ── no questions ───────────────────────────────────────────────────────────
  if (!q) {
    return (
      <div className="app-screen flex min-h-[100dvh] flex-col items-center justify-center px-8 pb-8 text-center safe-pt-header">
        <div className="app-card max-w-sm p-8">
          <p className="text-slate-700">Nothing to play here.</p>
          <button type="button" className="btn-app-primary mt-6 w-auto px-8 py-3 normal-case" onClick={() => navigate('/home')}>
            Back home
          </button>
        </div>
      </div>
    )
  }

  // ── end card ───────────────────────────────────────────────────────────────
  if (showEndCard) {
    return (
      <QuizEndScreen
        quizId={id!}
        sessionScore={sessionScore}
        correctCount={correctCount}
        wrongCount={wrongCount}
        totalQuestions={questions.length}
      />
    )
  }

  // ── quiz play ──────────────────────────────────────────────────────────────
  const progress   = timeLeft / QUESTION_SEC
  const revealed   = !!result
  const correctIdx = result?.correctAnswerIndex
  const optionCount = q.inputType === 'binary' ? 2 : q.inputType === 'mcq3' ? 3 : 4
  const quizKindLabel =
    q.inputType === 'binary' ? 'True or false'
    : q.inputType === 'slider' ? 'Slider'
    : 'Multiple choice'

  return (
    <div className={`app-screen relative min-h-[100dvh] pb-36 ${revealed ? 'pt-36' : ''}`}>

      {/* ── feedback banners ── */}
      <QuizFeedbackBanner
        correct={result ? result.correct : null}
        timedOut={result?.timedOut ?? false}
        points={result?.points ?? 0}
        msg={result?.msg ?? ''}
        effectId={result?.effectId ?? 0}
      />

      {/* ── header ── */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-violet-100/80 bg-white/95 px-3 pb-3 shadow-md shadow-violet-500/5 backdrop-blur-xl safe-pt-sticky">
        <button type="button" className="rounded-xl p-2 text-slate-700 hover:bg-slate-100" onClick={() => navigate('/home')}>
          <ChevronLeft className="h-6 w-6" />
        </button>

        <div className="flex flex-1 flex-col items-center gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{quizKindLabel}</span>
          <div className="h-1 w-full max-w-[200px] overflow-hidden rounded-full bg-slate-200">
            <motion.div className="h-full rounded-full bg-violet-600"
              animate={{ width: `${((index + 1) / Math.max(questions.length, 1)) * 100}%` }} />
          </div>
          {!revealed && (
            <div className="h-1 w-full max-w-[200px] overflow-hidden rounded-full bg-slate-200">
              <motion.div className="h-full rounded-full bg-amber-400" animate={{ width: `${progress * 100}%` }} />
            </div>
          )}
        </div>

        {/* live score + delta + timer */}
        <div className="flex items-center gap-1.5">
          {result && (
            <motion.span
              key={result.points + String(result.timedOut)}
              initial={{ opacity: 0, y: -8, scale: 0.7 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold tabular-nums ${
                result.timedOut
                  ? 'bg-slate-200 text-slate-500'
                  : result.correct
                    ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300'
                    : 'bg-rose-100 text-rose-700 ring-1 ring-rose-300'
              }`}
            >
              {result.timedOut ? '⏱ 0' : result.correct ? `+${result.points}` : `−1`}
            </motion.span>
          )}
          <div className="flex items-center gap-1 rounded-full bg-violet-600 px-2.5 py-1 text-xs font-bold tabular-nums text-white">
            <Sparkles className="h-3 w-3" />
            {sessionScore}
          </div>
          <div className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-800">
            <Clock className="h-3.5 w-3.5" />
            {revealed ? '—' : `${timeLeft}s`}
          </div>
        </div>
      </header>

      {/* ── question body ── */}
      <div className="px-4 pt-4">
        <p className="text-center text-sm font-medium tabular-nums text-slate-500">{index + 1}/{questions.length}</p>

        {quizMeta?.referenceDocumentUrl && (
          <a href={quizMeta.referenceDocumentUrl} target="_blank" rel="noreferrer"
            className="mb-3 flex items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-center text-sm font-semibold text-violet-900 hover:bg-violet-100">
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate">{quizMeta.referenceDocumentName || 'Open source document'}</span>
          </a>
        )}

        <MediaBlock mediaType={q.mediaType} url={q.mediaUrl} />
        <h2 className="mt-4 text-lg font-extrabold leading-snug tracking-tight text-slate-900">{q.questionText}</h2>
        {q.documentReference && (
          <p className="mt-2 text-sm font-medium text-slate-600">
            <span className="text-slate-500">From material: </span>{q.documentReference}
          </p>
        )}

        <div className="mt-6">
          {q.inputType === 'slider' ? (
            <div className="app-card border-slate-200/90 p-5 shadow-sm ring-1 ring-slate-100">
              <label className="mb-4 block text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Slide to answer</label>
              <input type="range" min={sliderBounds.min} max={sliderBounds.max} value={sliderVal}
                disabled={!!result}
                onChange={(e) => setSliderVal(Number(e.target.value))}
                onKeyUp={(e) => { if (e.key === 'Enter') onSliderSubmit() }}
                className="slider-neutral w-full"
              />
              <div className="mt-4 flex items-center justify-between text-xs font-medium text-slate-400">
                <span>◀ {sliderBounds.min}</span>
                <span className="text-2xl font-bold tabular-nums text-slate-900">{sliderVal}</span>
                <span>{sliderBounds.max} ▶</span>
              </div>
              {!result && (
                <button
                  type="button"
                  className="btn-app-primary mt-4 py-3"
                  onClick={onSliderSubmit}
                >
                  Submit answer
                </button>
              )}
            </div>
          ) : optionCount === 4 ? (
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <OptionTile key={i} label={q.options[i] ?? '—'} idleClass={NEUTRAL_TILES[i % 4]}
                  visual={optionVisualState(i, correctIdx, result?.selectedIndex, revealed, result?.timedOut ?? false)}
                  disabled={revealed} onClick={() => onPick(i)} />
              ))}
            </div>
          ) : optionCount === 2 ? (
            <div className="grid grid-cols-2 gap-3">
              {[0, 1].map((i) => (
                <OptionTile key={i} label={q.options[i] ?? '—'} idleClass={NEUTRAL_TILES[i % 2]}
                  visual={optionVisualState(i, correctIdx, result?.selectedIndex, revealed, result?.timedOut ?? false)}
                  disabled={revealed} large={q.inputType === 'binary'} onClick={() => onPick(i)} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <OptionTile key={i} label={q.options[i] ?? '—'} idleClass={NEUTRAL_TILES[i % 4]}
                  visual={optionVisualState(i, correctIdx, result?.selectedIndex, revealed, result?.timedOut ?? false)}
                  disabled={revealed} burgerStyle onClick={() => onPick(i)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── next button ── */}
      <AnimatePresence>
        {result && (
          <motion.div
            className="fixed inset-x-0 bottom-0 z-30 border-t border-violet-100/90 bg-white/95 p-4 pb-safe shadow-[0_-12px_40px_-8px_rgba(91,33,182,0.12)] backdrop-blur-xl"
            initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <motion.button type="button" onClick={onNext} className="btn-app-primary py-4" whileTap={{ scale: 0.98 }}>
              {index + 1 >= questions.length ? 'Finish' : 'Next'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
