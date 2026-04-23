import { useState } from 'react'
import { ArrowRight, ChevronLeft, KeyRound } from 'lucide-react'

const SECURITY_QUESTIONS = [
  "What is your pet's name?",
  'What is your birth city?',
  'What was your first school name?',
  "What is your mother's maiden name?",
  'What was your childhood nickname?',
] as const

export function StepForgotPin({
  phone,
  busy,
  onVerify,
  onBack,
}: {
  phone: string
  busy: boolean
  onVerify: (code: string, question: string, answer: string) => void
  onBack: () => void
}) {
  const [code, setCode] = useState('')
  const [question, setQuestion] = useState<string>(SECURITY_QUESTIONS[0])
  const [answer, setAnswer] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (code.trim().length < 4) errs.code = 'Enter the OTP'
    if (!answer.trim()) errs.answer = 'Security answer is required'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    onVerify(code.trim(), question, answer.trim())
  }

  return (
    <div>
      <button type="button" onClick={onBack} className="mb-5 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 text-slate-600 hover:bg-slate-50">
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
        <KeyRound className="h-6 w-6" />
      </div>
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-slate-900">Recover PIN</h1>
      <p className="mb-6 text-sm text-slate-500">
        Enter the OTP sent to <span className="font-bold text-slate-800">{phone}</span> and answer your security question.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">OTP Code</label>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="• • • • • •"
            maxLength={6}
            value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setErrors((p) => ({ ...p, code: '' })) }}
            className={`w-full rounded-2xl border py-4 text-center text-xl font-bold tracking-[0.4em] outline-none transition focus:ring-2 ${errors.code ? 'border-rose-300 focus:ring-rose-500/20' : 'border-slate-200 focus:border-amber-400 focus:ring-amber-500/20'}`}
          />
          {errors.code && <p className="mt-1 text-xs text-rose-500">{errors.code}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Security question</label>
          <select
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20"
          >
            {SECURITY_QUESTIONS.map((q) => <option key={q} value={q}>{q}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Your answer</label>
          <input
            type="text"
            placeholder="Enter your answer"
            maxLength={80}
            value={answer}
            onChange={(e) => { setAnswer(e.target.value); setErrors((p) => ({ ...p, answer: '' })) }}
            className={`w-full rounded-xl border px-4 py-3 text-sm font-medium outline-none transition focus:ring-2 ${errors.answer ? 'border-rose-300 focus:ring-rose-500/20' : 'border-slate-200 focus:border-amber-400 focus:ring-amber-500/20'}`}
          />
          {errors.answer && <p className="mt-1 text-xs text-rose-500">{errors.answer}</p>}
        </div>

        <button type="submit" disabled={busy} className="btn-app-primary py-4 text-base disabled:opacity-50">
          {busy ? 'Verifying…' : 'Verify & Continue'}
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <ArrowRight className="h-4 w-4" />
          </span>
        </button>
      </form>
    </div>
  )
}
