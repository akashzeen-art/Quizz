import { useEffect, useRef } from 'react'
import { ChevronLeft, LogIn, Mail, Smartphone, UserPlus } from 'lucide-react'
import type { AuthMode } from '../AuthFlowScreen'

export function StepMethodSelect({
  mode,
  busy,
  inviteRef,
  onModeChange,
  onSelectEmail,
  onSelectPhone,
  onGoogleSuccess,
  onBack,
}: {
  mode: AuthMode
  busy: boolean
  inviteRef: string | null
  onModeChange: (m: AuthMode) => void
  onSelectEmail: () => void
  onSelectPhone: () => void
  onGoogleSuccess: (credential: string) => void
  onBack: () => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const hasClientId = !!import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()
    if (!clientId || !wrapRef.current) return
    let cancelled = false

    function renderBtn() {
      if (cancelled) return
      const el = wrapRef.current
      const g = window.google?.accounts?.id
      if (!el || !g) return
      el.innerHTML = ''
      g.initialize({
        client_id: clientId!,
        callback: (resp: { credential: string }) => void onGoogleSuccess(resp.credential),
      })
      const w = Math.min(400, Math.max(280, el.getBoundingClientRect().width || 340))
      g.renderButton(el, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', width: w, locale: 'en' })
    }

    function ensureGsi(): Promise<void> {
      if (window.google?.accounts?.id) return Promise.resolve()
      return new Promise((resolve, reject) => {
        const src = 'https://accounts.google.com/gsi/client'
        const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
        if (existing) { existing.addEventListener('load', () => resolve()); return }
        const s = document.createElement('script')
        s.src = src; s.async = true
        s.onload = () => resolve()
        s.onerror = () => reject(new Error('GSI'))
        document.body.appendChild(s)
      })
    }

    void ensureGsi().then(() => { if (!cancelled) requestAnimationFrame(renderBtn) }).catch(() => {})
    return () => { cancelled = true }
  }, [onGoogleSuccess])

  return (
    <div>
      <button type="button" onClick={onBack} className="mb-5 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 text-slate-600 hover:bg-slate-50">
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-xl font-extrabold text-white shadow-lg shadow-violet-500/30">
          Q
        </div>
        <div>
          <p className="text-xl font-extrabold tracking-tight text-slate-900">EarnQuiz</p>
          <p className="text-xs text-slate-500">Play. Win. Earn.</p>
        </div>
      </div>

      {inviteRef && (
        <p className="mb-4 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-xs font-medium text-violet-900">
          🎉 You were invited! Sign up to play together.
        </p>
      )}

      <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
        <button type="button" onClick={() => onModeChange('signin')} disabled={busy}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition ${mode === 'signin' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <LogIn className="h-4 w-4" /> Sign in
        </button>
        <button type="button" onClick={() => onModeChange('signup')} disabled={busy}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition ${mode === 'signup' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <UserPlus className="h-4 w-4" /> Sign up
        </button>
      </div>

      <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-slate-900">
        {mode === 'signin' ? 'Welcome back!' : 'Create account'}
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        {mode === 'signin' ? 'Sign in to continue playing.' : 'Join thousands of players earning real money.'}
      </p>

      <div className="space-y-3">
        <button type="button" disabled={busy} onClick={onSelectEmail}
          className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-violet-200 hover:bg-violet-50/40 hover:shadow-md disabled:opacity-50">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <Mail className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-bold text-slate-900">Continue with Email</span>
            <span className="text-xs text-slate-500">No password required</span>
          </span>
        </button>

        <button type="button" disabled={busy} onClick={onSelectPhone}
          className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-md disabled:opacity-50">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
            <Smartphone className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-bold text-slate-900">Continue with Phone</span>
            <span className="text-xs text-slate-500">OTP verification via SMS</span>
          </span>
        </button>
      </div>

      {hasClientId && (
        <>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center">
              <span className="rounded-full bg-slate-50 px-3 text-xs font-medium text-slate-400">or</span>
            </div>
          </div>
          <div className={`flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-2 py-3 shadow-sm ${busy ? 'pointer-events-none opacity-60' : ''}`}>
            <div ref={wrapRef} className="flex w-full justify-center [&_.gsi-material-button]:!w-full" />
          </div>
        </>
      )}

      <p className="mt-6 text-center text-[11px] text-slate-400">
        By continuing you agree to our <span className="font-semibold text-violet-600">Terms of Playing</span>
      </p>
    </div>
  )
}
