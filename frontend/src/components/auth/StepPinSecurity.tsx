import { useState } from 'react'
import { ArrowRight, ChevronLeft, Eye, EyeOff, Lock, Shield } from 'lucide-react'

const SECURITY_QUESTIONS = [
  "What is your pet's name?",
  'What is your birth city?',
  'What was your first school name?',
  "What is your mother's maiden name?",
  'What was your childhood nickname?',
] as const

export function StepPinSecurity({
  busy,
  onDone,
  onBack,
}: {
  busy: boolean
  onDone: (pin: string, question: string, answer: string) => void
  onBack: () => void
}) {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [question, setQuestion] = useState<string>(SECURITY_QUESTIONS[0])
  const [answer, setAnswer] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!/^\d{4}$/.test(pin)) e.pin = 'PIN must be exactly 4 digits'
    if (pin !== confirmPin) e.confirmPin = 'PINs do not match'
    if (!answer.trim()) e.answer = 'Security answer is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    onDone(pin, question, answer.trim())
  }

  const pinStrength = pin.length === 4
    ? pin === '1234' || pin === '0000' || pin === '1111' ? 'weak' : 'strong'
    : null

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <button type="button" onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 text-slate-600 hover:bg-slate-50">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Security Setup</h1>
          <p className="text-xs text-slate-500">Set your PIN and recovery question</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* PIN */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">4-Digit PIN</p>
              <p className="text-xs text-slate-500">Used for quick login</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Enter PIN</label>
              <div className="relative">
                <input
                  inputMode="numeric"
                  autoComplete="new-password"
                  type={showPin ? 'text' : 'password'}
                  placeholder="• • • •"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setErrors((p) => ({ ...p, pin: '' })) }}
                  className={`w-full rounded-xl border py-3.5 text-center text-xl font-bold tracking-[0.5em] outline-none transition focus:ring-2 ${errors.pin ? 'border-rose-300 focus:ring-rose-500/20' : 'border-slate-200 focus:border-violet-400 focus:ring-violet-500/20'}`}
                />
                <button type="button" onClick={() => setShowPin((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.pin && <p className="mt-1 text-xs text-rose-500">{errors.pin}</p>}
              {pinStrength && (
                <p className={`mt-1 text-xs font-semibold ${pinStrength === 'weak' ? 'text-amber-500' : 'text-emerald-600'}`}>
                  {pinStrength === 'weak' ? '⚠️ Weak PIN — avoid simple patterns' : '✅ Strong PIN'}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Confirm PIN</label>
              <input
                inputMode="numeric"
                type="password"
                placeholder="• • • •"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => { setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setErrors((p) => ({ ...p, confirmPin: '' })) }}
                className={`w-full rounded-xl border py-3.5 text-center text-xl font-bold tracking-[0.5em] outline-none transition focus:ring-2 ${errors.confirmPin ? 'border-rose-300 focus:ring-rose-500/20' : confirmPin && confirmPin === pin ? 'border-emerald-400 focus:ring-emerald-500/20' : 'border-slate-200 focus:border-violet-400 focus:ring-violet-500/20'}`}
              />
              {errors.confirmPin && <p className="mt-1 text-xs text-rose-500">{errors.confirmPin}</p>}
              {confirmPin && confirmPin === pin && <p className="mt-1 text-xs font-semibold text-emerald-600">✅ PINs match</p>}
            </div>
          </div>
        </div>

        {/* Security Question */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Recovery Question</p>
              <p className="text-xs text-slate-500">Used to recover your PIN</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Security question</label>
              <select
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
              >
                {SECURITY_QUESTIONS.map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
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
                className={`w-full rounded-xl border px-4 py-3 text-sm font-medium outline-none transition focus:ring-2 ${errors.answer ? 'border-rose-300 focus:ring-rose-500/20' : 'border-slate-200 focus:border-violet-400 focus:ring-violet-500/20'}`}
              />
              {errors.answer && <p className="mt-1 text-xs text-rose-500">{errors.answer}</p>}
            </div>
          </div>
        </div>

        <button type="submit" disabled={busy} className="btn-app-primary py-4 text-base disabled:opacity-50">
          {busy ? 'Saving…' : 'Continue'}
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <ArrowRight className="h-4 w-4" />
          </span>
        </button>
      </form>
    </div>
  )
}
