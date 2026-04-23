import { useState } from 'react'
import { ArrowRight, ChevronLeft, Lock } from 'lucide-react'

export function StepResetPin({
  busy,
  onReset,
  onBack,
}: {
  busy: boolean
  onReset: (pin: string) => void
  onBack: () => void
}) {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!/^\d{4}$/.test(pin)) errs.pin = 'PIN must be exactly 4 digits'
    if (pin !== confirmPin) errs.confirmPin = 'PINs do not match'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    onReset(pin)
  }

  return (
    <div>
      <button type="button" onClick={onBack} className="mb-5 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 text-slate-600 hover:bg-slate-50">
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
        <Lock className="h-6 w-6" />
      </div>
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-slate-900">Set New PIN</h1>
      <p className="mb-6 text-sm text-slate-500">Choose a new 4-digit PIN for your account.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">New PIN</label>
          <input
            inputMode="numeric"
            type="password"
            placeholder="• • • •"
            maxLength={4}
            value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setErrors((p) => ({ ...p, pin: '' })) }}
            className={`w-full rounded-2xl border py-5 text-center text-2xl font-bold tracking-[0.5em] outline-none transition focus:ring-2 ${errors.pin ? 'border-rose-300 focus:ring-rose-500/20' : 'border-slate-200 focus:border-emerald-400 focus:ring-emerald-500/20'}`}
          />
          {errors.pin && <p className="mt-1.5 text-center text-xs text-rose-500">{errors.pin}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Confirm new PIN</label>
          <input
            inputMode="numeric"
            type="password"
            placeholder="• • • •"
            maxLength={4}
            value={confirmPin}
            onChange={(e) => { setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setErrors((p) => ({ ...p, confirmPin: '' })) }}
            className={`w-full rounded-2xl border py-5 text-center text-2xl font-bold tracking-[0.5em] outline-none transition focus:ring-2 ${errors.confirmPin ? 'border-rose-300 focus:ring-rose-500/20' : confirmPin && confirmPin === pin ? 'border-emerald-400 focus:ring-emerald-500/20' : 'border-slate-200 focus:border-emerald-400 focus:ring-emerald-500/20'}`}
          />
          {errors.confirmPin && <p className="mt-1.5 text-center text-xs text-rose-500">{errors.confirmPin}</p>}
          {confirmPin && confirmPin === pin && <p className="mt-1.5 text-center text-xs font-semibold text-emerald-600">✅ PINs match</p>}
        </div>

        <button type="submit" disabled={busy} className="btn-app-primary py-4 text-base disabled:opacity-50">
          {busy ? 'Saving…' : 'Reset PIN'}
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <ArrowRight className="h-4 w-4" />
          </span>
        </button>
      </form>
    </div>
  )
}
