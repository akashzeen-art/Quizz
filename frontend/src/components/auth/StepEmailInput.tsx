import { useState } from 'react'
import { ArrowRight, ChevronLeft, Mail } from 'lucide-react'

export function StepEmailInput({
  busy,
  onContinue,
  onBack,
}: {
  mode?: string
  busy: boolean
  onContinue: (email: string) => void
  onBack: () => void
}) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const val = email.trim()
    if (!val || !val.includes('@')) { setError('Enter a valid email address'); return }
    setError('')
    onContinue(val)
  }

  return (
    <div>
      <button type="button" onClick={onBack} className="mb-5 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 text-slate-600 hover:bg-slate-50">
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
        <Mail className="h-6 w-6" />
      </div>
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-slate-900">Continue with Email</h1>
      <p className="mb-6 text-sm text-slate-500">
        Enter your email — we'll sign you in or create your account automatically.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Email address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="email"
              autoFocus
              placeholder="name@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
              className={`w-full rounded-2xl border py-4 pl-11 pr-4 text-base font-medium outline-none transition focus:ring-2 ${error ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-500/20' : 'border-slate-200 focus:border-violet-400 focus:ring-violet-500/20'}`}
            />
          </div>
          {error && <p className="mt-1.5 text-xs font-medium text-rose-500">{error}</p>}
        </div>

        <button
          type="submit"
          disabled={busy || !email.trim()}
          className="btn-app-primary py-4 text-base disabled:opacity-50"
        >
          {busy ? 'Checking…' : 'Continue'}
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <ArrowRight className="h-4 w-4" />
          </span>
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-slate-400">
        Existing user? We'll take you straight to PIN login ✨
      </p>
    </div>
  )
}
