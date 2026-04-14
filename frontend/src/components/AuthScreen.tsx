import { motion } from 'framer-motion'
import {
  ArrowRight,
  Camera,
  ChevronDown,
  ChevronLeft,
  Globe2,
  Mail,
  Search,
  Smartphone,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import * as api from '../api/client'
import { FaceCaptureSheet } from './FaceCaptureSheet'
import { useApp } from '../context/AppContext'
import { shouldForceCategoryOnboarding } from '../lib/categoryOnboarding'
import {
  buildFullPhoneDigits,
  digitsOnly,
  getPhoneCountries,
  guessDefaultCountry,
  maxNationalDigitsForMobile,
  regionFlagEmoji,
  type PhoneCountryOption,
} from '../lib/phoneCountries'
import type { CountryCode } from 'libphonenumber-js/min'

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
        navigate(shouldForceCategoryOnboarding(res.user) ? '/categories' : '/home', { replace: true })
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
      <div className="app-card space-y-2 border-amber-200/80 bg-amber-50/90 px-4 py-3 text-left text-xs leading-relaxed text-amber-950">
        <p className="font-semibold text-amber-900">Google sign-in is not configured in this build</p>
        <p>
          Add env var{' '}
          <code className="rounded bg-white/80 px-1 py-0.5 font-mono text-[0.7rem]">
            VITE_GOOGLE_CLIENT_ID
          </code>{' '}
          where the <strong>frontend</strong> is built (e.g. Vercel → Environment Variables), using the
          same Web Client ID as{' '}
          <code className="rounded bg-white/80 px-1 py-0.5 font-mono text-[0.7rem]">
            GOOGLE_CLIENT_ID
          </code>{' '}
          on Render. Setting it only on the API does not update this app — Vite bakes it in at build
          time.
        </p>
        <p className="text-amber-900/90">
          After saving, trigger a <strong>new deploy</strong>. For local dev, put it in{' '}
          <code className="font-mono text-[0.7rem]">frontend/.env.development</code> and restart{' '}
          <code className="font-mono text-[0.7rem]">npm run dev</code>.
        </p>
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

type AuthMethod = 'choose' | 'email' | 'phone'

export function AuthScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteRef = searchParams.get('ref')
  const { loginWithToken } = useApp()
  const [authMethod, setAuthMethod] = useState<AuthMethod>('choose')
  const [busy, setBusy] = useState(false)
  const [faceOpen, setFaceOpen] = useState(false)

  const [email, setEmail] = useState('')
  const [countryIso, setCountryIso] = useState<CountryCode>(() => guessDefaultCountry())
  const [nationalNumber, setNationalNumber] = useState('')
  const [countryQuery, setCountryQuery] = useState('')
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)

  const allCountries = useMemo(() => getPhoneCountries(), [])
  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase()
    const list = !q
      ? allCountries
      : allCountries.filter(
          (c: PhoneCountryOption) =>
            c.name.toLowerCase().includes(q) ||
            c.iso.toLowerCase().includes(q) ||
            c.dial.includes(q),
        )
    const selected = allCountries.find((c) => c.iso === countryIso)
    if (selected && !list.some((c) => c.iso === countryIso)) {
      return [selected, ...list]
    }
    return list
  }, [allCountries, countryQuery, countryIso])

  const selectedCountry = useMemo(
    () => allCountries.find((c) => c.iso === countryIso),
    [allCountries, countryIso],
  )

  const maxNationalLen = useMemo(
    () => maxNationalDigitsForMobile(countryIso),
    [countryIso],
  )

  useEffect(() => {
    setNationalNumber((prev) => {
      const d = digitsOnly(prev)
      return d.length > maxNationalLen ? d.slice(0, maxNationalLen) : d
    })
  }, [countryIso, maxNationalLen])

  function goBackFromMethod() {
    setAuthMethod('choose')
    setCountryQuery('')
    setCountryDropdownOpen(false)
  }

  async function onSubmitEmail(e: React.FormEvent) {
    e.preventDefault()
    const id = email.trim()
    if (!id || !id.includes('@')) {
      toast.error('Enter a valid email address')
      return
    }
    setBusy(true)
    try {
      const res = await api.loginEmail(id)
      loginWithToken(res.token, res.user)
      navigate(shouldForceCategoryOnboarding(res.user) ? '/categories' : '/home', { replace: true })
    } catch (err) {
      toast.error(api.getApiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function onSubmitPhone(e: React.FormEvent) {
    e.preventDefault()
    const full = buildFullPhoneDigits(countryIso, nationalNumber)
    if (full.length < 8) {
      toast.error('Enter your mobile number')
      return
    }
    setBusy(true)
    try {
      const res = await api.loginPhone(full)
      loginWithToken(res.token, res.user)
      navigate(shouldForceCategoryOnboarding(res.user) ? '/categories' : '/home', { replace: true })
    } catch (err) {
      toast.error(api.getApiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function onFaceCapture(image: Blob) {
    try {
      const res = await api.faceLogin(image)
      loginWithToken(res.token, res.user)
      setFaceOpen(false)
      navigate(shouldForceCategoryOnboarding(res.user) ? '/categories' : '/home', { replace: true })
    } catch (err) {
      toast.error(api.getApiErrorMessage(err))
    }
  }

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
      <motion.div
        key={authMethod}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mx-auto max-w-md px-5 pb-10 pt-6"
      >
        <button
          type="button"
          className="btn-app-ghost mb-6 rounded-full"
          aria-label="Back"
          onClick={() =>
            authMethod === 'choose' ? navigate(-1) : goBackFromMethod()
          }
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          {authMethod === 'choose'
            ? 'Sign in'
            : authMethod === 'email'
              ? 'Sign in with email'
              : 'Sign in with phone'}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {authMethod === 'choose'
            ? 'Choose how you want to continue. No verification code required.'
            : authMethod === 'email'
              ? 'We’ll create an account or log you in instantly — no OTP.'
              : 'Pick your country, enter your number — we’ll sign you in right away.'}
        </p>
        {inviteRef && (
          <p
            className="mt-3 rounded-xl border border-violet-200/90 bg-violet-50/90 px-3 py-2.5 text-xs font-medium leading-snug text-violet-900"
            role="status"
          >
            You&apos;re signing up with a friend&apos;s invite. Complete your account to play together
            on the leaderboard.
          </p>
        )}

        {authMethod === 'choose' && (
          <>
            <div className="mt-8 grid gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => setAuthMethod('email')}
                className="app-card flex w-full items-center gap-4 border-slate-200/90 p-4 text-left shadow-md transition hover:border-violet-200 hover:bg-violet-50/40 disabled:opacity-50"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                  <Mail className="h-6 w-6" />
                </span>
                <span>
                  <span className="block text-base font-bold text-slate-900">Email</span>
                  <span className="text-xs font-medium text-slate-500">
                    Continue with your email address
                  </span>
                </span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setAuthMethod('phone')}
                className="app-card flex w-full items-center gap-4 border-slate-200/90 p-4 text-left shadow-md transition hover:border-violet-200 hover:bg-violet-50/40 disabled:opacity-50"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                  <Smartphone className="h-6 w-6" />
                </span>
                <span>
                  <span className="block text-base font-bold text-slate-900">
                    Phone number
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    Continue with mobile number & country code
                  </span>
                </span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setFaceOpen(true)
                }}
                className="app-card flex w-full items-center gap-4 border-slate-200/90 p-4 text-left shadow-md transition hover:border-violet-200 hover:bg-violet-50/40 disabled:opacity-50"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <Camera className="h-6 w-6" />
                </span>
                <span>
                  <span className="block text-base font-bold text-slate-900">Login with Face</span>
                  <span className="text-xs font-medium text-slate-500">Use your camera to sign in</span>
                </span>
              </button>
            </div>

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
            <FaceCaptureSheet
              open={faceOpen}
              title="Face login"
              onClose={() => setFaceOpen(false)}
              onCapture={onFaceCapture}
            />
          </>
        )}

        {authMethod === 'email' && (
          <form onSubmit={onSubmitEmail} className="mt-8 space-y-6">
            <div className="app-card overflow-hidden border-violet-200/70 p-0 shadow-lg shadow-violet-500/10 ring-1 ring-violet-100/80">
              <div className="border-b border-slate-100 bg-gradient-to-r from-violet-50/90 to-indigo-50/50 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm ring-1 ring-violet-100">
                    <Mail className="h-6 w-6" strokeWidth={2.25} />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Email address</p>
                    <p className="text-xs font-medium text-slate-500">
                      Same email next time = same account
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4 p-5">
                <div>
                  <label
                    htmlFor="auth-email"
                    className="mb-2 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500"
                  >
                    Email
            </label>
                  <div className="group relative">
                    <Mail
                      className="pointer-events-none absolute left-4 top-1/2 h-[1.1rem] w-[1.1rem] -translate-y-1/2 text-slate-400 transition group-focus-within:text-violet-500"
                      strokeWidth={2}
                    />
            <input
                      id="auth-email"
                      className="input-app w-full py-4 pl-11 text-base font-medium placeholder:text-slate-400 focus:border-violet-400 focus:ring-violet-500/25"
                      type="email"
                      inputMode="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-slate-500">
                  By continuing you agree this email can be used to identify your profile and scores on
                  the leaderboard.
                </p>
                <button type="submit" disabled={busy} className="btn-app-primary py-4 text-base">
                  Continue with email
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                    <ArrowRight className="h-4 w-4" />
                  </span>
            </button>
              </div>
            </div>
          </form>
        )}

        {authMethod === 'phone' && (
          <form onSubmit={onSubmitPhone} className="mt-8 space-y-6">
            <div className="app-card overflow-hidden border-indigo-200/70 p-0 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-100/80">
              <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50/90 to-violet-50/40 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100">
                    <Smartphone className="h-6 w-6" strokeWidth={2.25} />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Mobile number</p>
                    <p className="text-xs font-medium text-slate-500">
                      Select country, then your local number
                    </p>
          </div>
          </div>
        </div>

              <div className="space-y-5 p-5">
                <div>
                  <label
                    htmlFor="auth-country-dropdown"
                    className="mb-2 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500"
                  >
                    Country or region
                  </label>
                  {selectedCountry && (
                    <button
                      id="auth-country-dropdown"
                      type="button"
                      onClick={() => setCountryDropdownOpen((v) => !v)}
                      aria-expanded={countryDropdownOpen}
                      aria-controls="auth-country-list"
                      className="mb-2 flex w-full items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/50 px-3 py-2 text-xs font-semibold text-indigo-950 transition hover:bg-indigo-100/60"
                    >
                      <span className="text-lg leading-none" aria-hidden>
                        {regionFlagEmoji(selectedCountry.iso)}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        +{selectedCountry.dial} · {selectedCountry.name}
                      </span>
                      <Globe2 className="h-3.5 w-3.5 shrink-0 text-indigo-500 opacity-80" />
                      <ChevronDown
                        className={`h-3.5 w-3.5 shrink-0 text-indigo-500 transition-transform ${
                          countryDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  )}
                  {countryDropdownOpen && (
                    <>
                      <div className="relative mb-2">
                        <Search
                          className="pointer-events-none absolute left-4 top-1/2 h-[1.05rem] w-[1.05rem] -translate-y-1/2 text-slate-400"
                          strokeWidth={2.25}
                        />
                        <input
                          id="auth-country-search"
                          className="input-app w-full py-3.5 pl-11 pr-4 text-sm font-medium placeholder:text-slate-400 focus:border-indigo-400 focus:ring-indigo-500/20"
                          placeholder="Search by name, code, or +dial…"
                          value={countryQuery}
                          onChange={(e) => setCountryQuery(e.target.value)}
                          aria-label="Search countries"
                          autoComplete="off"
                        />
                      </div>
                      <div
                        id="auth-country-list"
                        className="max-h-52 overflow-y-auto rounded-2xl border border-slate-200/90 bg-slate-50/40 shadow-inner ring-1 ring-slate-100/80"
                        role="listbox"
                        aria-label="Country list"
                      >
                        {filteredCountries.length === 0 ? (
                          <p className="px-4 py-8 text-center text-sm font-medium text-slate-500">
                            No countries match &quot;{countryQuery.trim()}&quot;
                          </p>
                        ) : (
                          <ul className="divide-y divide-slate-200/70 p-1">
                            {filteredCountries.map((c) => {
                              const active = c.iso === countryIso
                              return (
                                <li key={c.iso}>
                                  <button
                                    type="button"
                                    role="option"
                                    aria-selected={active}
                                    onClick={() => {
                                      setCountryIso(c.iso)
                                      setCountryDropdownOpen(false)
                                      setCountryQuery('')
                                    }}
                                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                                      active
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                                        : 'text-slate-800 hover:bg-white hover:shadow-sm'
                                    }`}
                                  >
                                    <span className="text-lg leading-none" aria-hidden>
                                      {regionFlagEmoji(c.iso)}
                                    </span>
                                    <span className="min-w-0 flex-1 font-semibold">
                                      <span className={active ? 'text-white' : 'text-slate-900'}>
                                        {c.name}
                                      </span>
                                    </span>
                                    <span
                                      className={`shrink-0 tabular-nums ${
                                        active ? 'text-indigo-100' : 'text-slate-500'
                                      }`}
                                    >
                                      +{c.dial}
                                    </span>
                                  </button>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="auth-phone-national"
                    className="mb-2 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500"
                  >
                    Phone number
                  </label>
                  <div className="flex overflow-hidden rounded-2xl border-2 border-slate-200/90 bg-white shadow-sm transition focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/15">
                    <span className="flex shrink-0 items-center border-r border-slate-200/90 bg-gradient-to-b from-slate-50 to-slate-100/80 px-4 py-4 text-sm font-bold tabular-nums text-indigo-700">
                      +{selectedCountry?.dial ?? '—'}
                    </span>
                    <input
                      id="auth-phone-national"
                      className="min-w-0 flex-1 border-0 bg-transparent px-4 py-4 text-base font-semibold tabular-nums text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-400"
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder="Enter Your Number"
                      maxLength={maxNationalLen}
                      value={nationalNumber}
                      onChange={(e) => {
                        const d = digitsOnly(e.target.value)
                        setNationalNumber(d.slice(0, maxNationalLen))
                      }}
                    />
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-xs leading-relaxed text-slate-500">
                    <span className="inline-block h-1 w-1 rounded-full bg-slate-400" />
                    Enter only the local number (up to {maxNationalLen} digits here). The +{selectedCountry?.dial ?? ''}{' '}
                    prefix is added from your country selection — do not type it in this field.
                  </p>
                </div>

                <button type="submit" disabled={busy} className="btn-app-primary py-4 text-base">
                  Continue with phone
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </button>
              </div>
        </div>
          </form>
        )}
      </motion.div>
    </div>
  )
}
