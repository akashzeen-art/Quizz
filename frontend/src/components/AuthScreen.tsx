import { motion } from 'framer-motion'
import { ArrowRight, ChevronLeft } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import * as api from '../api/client'
import { useApp } from '../context/AppContext'

function isPhone(s: string) {
  const digits = s.replace(/\D/g, '')
  return digits.length >= 10
}

function maskPhone(raw: string) {
  const d = raw.replace(/\D/g, '')
  if (d.length < 4) return raw
  return `+${d.slice(0, 2)} ${d.slice(2, 7)} ${d.slice(7, 11)} ${d.slice(11)}`.trim()
}

function GoogleSignInBlock({
  busy,
  setBusy,
  loginWithToken,
  navigate,
}: {
  busy: boolean
  setBusy: (v: boolean) => void
  loginWithToken: ReturnType<typeof useApp>['loginWithToken']
  navigate: ReturnType<typeof useNavigate>
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const hasClientId = !!import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()
    if (!clientId) return
    const googleClientId: string = clientId

    let cancelled = false

    const onCredential = async (credential: string) => {
      setBusy(true)
      try {
        const res = await api.loginWithGoogle(credential)
        loginWithToken(res.token, res.user)
        navigate('/categories', { replace: true })
      } catch (err) {
        toast.error(api.getApiErrorMessage(err))
      } finally {
        setBusy(false)
      }
    }

    function renderButton() {
      if (cancelled) return
      const el = wrapRef.current
      const g = window.google?.accounts?.id
      if (!el || !g) return
      el.innerHTML = ''
      g.initialize({
        client_id: googleClientId,
        callback: (resp: { credential: string }) => {
          void onCredential(resp.credential)
        },
      })
      const w = Math.min(400, Math.max(280, el.getBoundingClientRect().width || 360))
      g.renderButton(el, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        width: w,
        locale: 'en',
      })
    }

    function ensureGsi(): Promise<void> {
      if (window.google?.accounts?.id) return Promise.resolve()
      return new Promise((resolve, reject) => {
        const src = 'https://accounts.google.com/gsi/client'
        const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
        if (existing) {
          if (window.google?.accounts?.id) {
            resolve()
            return
          }
          existing.addEventListener('load', () => resolve())
          existing.addEventListener('error', () => reject(new Error('Google script')))
          return
        }
        const script = document.createElement('script')
        script.src = src
        script.async = true
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Google script'))
        document.body.appendChild(script)
      })
    }

    void ensureGsi()
      .then(() => {
        if (cancelled) return
        requestAnimationFrame(renderButton)
      })
      .catch(() => {
        /* ignore */
      })

    return () => {
      cancelled = true
    }
  }, [setBusy, loginWithToken, navigate])

  if (!hasClientId) {
    return (
      <div className="app-card border-amber-200/80 bg-amber-50/90 px-4 py-3 text-center text-xs leading-relaxed text-amber-950">
        Google sign-in needs{' '}
        <code className="rounded bg-white/80 px-1 py-0.5 font-mono text-[0.7rem]">
          VITE_GOOGLE_CLIENT_ID
        </code>{' '}
        (same Web Client ID as backend{' '}
        <code className="rounded bg-white/80 px-1 py-0.5 font-mono text-[0.7rem]">
          GOOGLE_CLIENT_ID
        </code>
        ).
      </div>
    )
  }

  return (
    <div
      className={`app-card flex min-h-[48px] w-full flex-col items-stretch justify-center border-slate-200/90 px-2 py-3 shadow-md ${
        busy ? 'pointer-events-none opacity-60' : ''
      }`}
    >
      <div ref={wrapRef} className="flex w-full justify-center [&_.gsi-material-button]:!w-full" />
    </div>
  )
}

export function AuthScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteRef = searchParams.get('ref')
  const { loginWithToken } = useApp()
  const [identifier, setIdentifier] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [resendSec, setResendSec] = useState(0)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (!otpSent || resendSec <= 0) return
    const t = setInterval(() => setResendSec((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [otpSent, resendSec])

  useEffect(() => {
    if (otpSent) {
      setResendSec(20)
      setOtp('')
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    }
  }, [otpSent])

  const setDigit = useCallback(
    (i: number, raw: string) => {
      const d = raw.replace(/\D/g, '').slice(-1)
      const before = otp.slice(0, i)
      const after = otp.slice(i + 1)
      const next = (before + (d || '') + after).slice(0, 6)
      setOtp(next)
      if (d && i < 5) otpRefs.current[i + 1]?.focus()
    },
    [otp],
  )

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const id = identifier.trim()
    if (!id) {
      toast.error('Enter phone or email')
      return
    }
    setBusy(true)
    try {
      if (isPhone(id) && !id.includes('@')) {
        await api.loginPhone(id)
        setOtpSent(true)
        toast.message('OTP sent (demo: use 123456)')
      } else {
        const res = await api.loginEmail(id)
        loginWithToken(res.token, res.user)
        navigate('/categories', { replace: true })
      }
    } catch (err) {
      toast.error(api.getApiErrorMessage(err))
      console.error(err)
    } finally {
      setBusy(false)
    }
  }

  async function onVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    if (otp.length < 6) {
      toast.error('Enter the 6-digit code')
      return
    }
    setBusy(true)
    try {
      const res = await api.verifyOtp(identifier.trim(), otp.trim())
      loginWithToken(res.token, res.user)
      navigate('/categories', { replace: true })
    } catch (err) {
      toast.error(api.getApiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const displayDigits = Array.from({ length: 6 }, (_, i) => otp[i] ?? '')

  return (
    <div className="app-screen relative min-h-[100dvh] overflow-hidden safe-pt-header">
      <div
        className="pointer-events-none absolute -right-24 -top-32 h-72 w-72 rounded-full bg-violet-400/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-indigo-400/20 blur-3xl"
        aria-hidden
      />
      {!otpSent ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mx-auto max-w-md px-5 pb-10 pt-6"
        >
          <button
            type="button"
            className="btn-app-ghost mb-6 rounded-full"
            aria-label="Back"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Sign in
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Use your phone (OTP) or email. Google works too.
          </p>
          {inviteRef && (
            <p
              className="mt-3 rounded-xl border border-violet-200/90 bg-violet-50/90 px-3 py-2.5 text-xs font-medium leading-snug text-violet-900"
              role="status"
            >
              You&apos;re signing up with a friend&apos;s invite. Complete your account to
              play together on the leaderboard.
            </p>
          )}

          <form onSubmit={onSubmit} className="app-card mt-8 space-y-5 p-5">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Phone or email
              </label>
              <input
                className="input-app py-4"
                placeholder="+1 262 003 27631 or you@email.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
              />
            </div>
            <button type="submit" disabled={busy} className="btn-app-primary py-4">
              Continue
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <ArrowRight className="h-4 w-4" />
              </span>
            </button>
          </form>

          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200/80" />
            </div>
            <div className="relative flex justify-center text-xs font-medium text-slate-500">
              <span className="rounded-full bg-white/90 px-4 py-0.5 backdrop-blur-sm">
                Or
              </span>
            </div>
          </div>

          <GoogleSignInBlock
            busy={busy}
            setBusy={setBusy}
            loginWithToken={loginWithToken}
            navigate={navigate}
          />
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative mx-auto max-w-md px-5 pb-10 pt-6"
        >
          <button
            type="button"
            className="btn-app-ghost mb-6 rounded-full"
            aria-label="Back"
            onClick={() => {
              setOtpSent(false)
              setOtp('')
            }}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Verification
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            We&apos;ve sent you the verification code on{' '}
            <span className="font-medium text-slate-700">
              {maskPhone(identifier)}
            </span>
          </p>

          <form onSubmit={onVerifyOtp} className="app-card mt-10 p-5">
            <div className="flex justify-center gap-2 sm:gap-3">
              {displayDigits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    otpRefs.current[i] = el
                  }}
                  inputMode="numeric"
                  maxLength={1}
                  className="flex h-14 w-11 rounded-xl border-2 border-slate-200 bg-white text-center text-xl font-bold text-slate-900 shadow-inner outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 sm:h-16 sm:w-12"
                  value={d}
                  onChange={(e) => setDigit(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !displayDigits[i] && i > 0) {
                      otpRefs.current[i - 1]?.focus()
                    }
                  }}
                  onPaste={(e) => {
                    e.preventDefault()
                    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
                    setOtp(p)
                    if (p.length >= 6) otpRefs.current[5]?.focus()
                    else otpRefs.current[p.length]?.focus()
                  }}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={busy || otp.length < 6}
              className="btn-app-primary mt-8 py-4 disabled:opacity-50"
            >
              Continue
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <ArrowRight className="h-4 w-4" />
              </span>
            </button>

            <p className="mt-8 text-center text-sm font-semibold text-violet-600">
              {resendSec > 0 ? (
                <>
                  Re-send code in 0:{resendSec.toString().padStart(2, '0')}
                </>
              ) : (
                <button
                  type="button"
                  className="font-semibold underline"
                  onClick={async () => {
                    setResendSec(20)
                    try {
                      await api.loginPhone(identifier.trim())
                      toast.message('Code sent again')
                    } catch (err) {
                      toast.error(api.getApiErrorMessage(err))
                    }
                  }}
                >
                  Re-send code
                </button>
              )}
            </p>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Demo code: <span className="font-mono font-medium">123456</span>
          </p>
        </motion.div>
      )}
    </div>
  )
}
