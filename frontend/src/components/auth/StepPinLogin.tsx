import { useState, useRef, useEffect } from 'react'
import { ArrowRight, ChevronLeft, Lock } from 'lucide-react'

export function StepPinLogin({
  phone,
  busy,
  onLogin,
  onForgotPin,
  onBack,
}: {
  phone: string
  busy: boolean
  onLogin: (pin: string) => void
  onForgotPin: () => void
  onBack: () => void
}) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!/^\d{4}$/.test(pin)) { setError('Enter your 4-digit PIN'); return }
    setError('')
    onLogin(pin)
  }

  return (
    <div>
      <button type="button" onClick={onBack} className="mb-5 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 text-slate-600 hover:bg-slate-50">
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
        <Lock className="h-6 w-6" />
      </div>
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-slate-900">Enter PIN</h1>
      <p className="mb-2 text-sm text-slate-500">Quick login for</p>
      <p className="mb-6 text-sm font-bold text-slate-800">{phone}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">4-digit PIN</label>
          <input
            ref={inputRef}
            inputMode="numeric"
            type="password"
            autoComplete="current-password"
            placeholder="• • • •"
            maxLength={4}
            value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError('') }}
            className={`w-full rounded-2xl border py-5 text-center text-2xl font-bold tracking-[0.5em] outline-none transition focus:ring-2 ${error ? 'border-rose-300 focus:ring-rose-500/20' : 'border-slate-200 focus:border-violet-400 focus:ring-violet-500/20'}`}
          />
          {error && <p className="mt-1.5 text-center text-xs font-medium text-rose-500">{error}</p>}
        </div>

        <button type="submit" disabled={busy || pin.length < 4} className="btn-app-primary py-4 text-base disabled:opacity-50">
          {busy ? 'Signing in…' : 'Login with PIN'}
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <ArrowRight className="h-4 w-4" />
          </span>
        </button>

        <button type="button" onClick={onForgotPin} disabled={busy} className="w-full rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
          Forgot PIN?
        </button>
      </form>
    </div>
  )
}
