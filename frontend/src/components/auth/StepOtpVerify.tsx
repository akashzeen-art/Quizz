import { useState, useEffect, useRef } from 'react'
import { ArrowRight, ChevronLeft, MessageSquare } from 'lucide-react'

export function StepOtpVerify({
  phone,
  busy,
  onVerify,
  onResend,
  onBack,
}: {
  phone: string
  busy: boolean
  onVerify: (code: string) => void
  onResend: () => void
  onBack: () => void
}) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [resendTimer, setResendTimer] = useState(30)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const id = setInterval(() => setResendTimer((t) => (t > 0 ? t - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (code.length < 4) { setError('Enter the OTP sent to your phone'); return }
    setError('')
    onVerify(code)
  }

  function handleResend() {
    if (resendTimer > 0) return
    setResendTimer(30)
    onResend()
  }

  return (
    <div>
      <button type="button" onClick={onBack} className="mb-5 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 text-slate-600 hover:bg-slate-50">
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
        <MessageSquare className="h-6 w-6" />
      </div>
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-slate-900">Verify OTP</h1>
      <p className="mb-2 text-sm text-slate-500">
        Enter the code sent to
      </p>
      <p className="mb-6 text-sm font-bold text-slate-800">{phone}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
            One-time password
          </label>
          <input
            ref={inputRef}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="• • • • • •"
            maxLength={6}
            value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
            className={`w-full rounded-2xl border py-5 text-center text-2xl font-bold tracking-[0.5em] outline-none transition focus:ring-2 ${error ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-500/20' : 'border-slate-200 focus:border-emerald-400 focus:ring-emerald-500/20'}`}
          />
          {error && <p className="mt-1.5 text-center text-xs font-medium text-rose-500">{error}</p>}
        </div>

        <button type="submit" disabled={busy || code.length < 4} className="btn-app-primary py-4 text-base disabled:opacity-50">
          {busy ? 'Verifying…' : 'Verify OTP'}
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <ArrowRight className="h-4 w-4" />
          </span>
        </button>

        <button
          type="button"
          disabled={resendTimer > 0 || busy}
          onClick={handleResend}
          className="w-full rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-slate-400">
        Didn't receive it? Check spam or try resending.
      </p>
    </div>
  )
}
