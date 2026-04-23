import { motion } from 'framer-motion'
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  Globe2,
  LogIn,
  Mail,
  Search,
  Smartphone,
  UserPlus,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import * as api from '../api/client'
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
import { AVATAR_SEED_POOL, dicebearUrl } from '../constants/avatars'

type Mode = 'signin' | 'signup'
type Method = 'email' | 'phone' | 'google'
type Step = 'select' | 'input' | 'otp' | 'profile' | 'pin-login' | 'forgot-pin' | 'reset-pin'
type PhoneSignInMode = 'otp' | 'pin'

const SECURITY_QUESTIONS = [
  "What is your pet's name?",
  'What is your birth city?',
  'What was your first school name?',
  "What is your mother's maiden name?",
  'What was your childhood nickname?',
] as const

function GoogleSignInBlock({
  busy,
  setBusy,
  loginWithToken,
  navigate,
  onNeedSignup,
}: {
  busy: boolean
  setBusy: (v: boolean) => void
  loginWithToken: ReturnType<typeof useApp>['loginWithToken']
  navigate: ReturnType<typeof useNavigate>
  onNeedSignup: (credential: string) => void
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
        // For now: keep current google login behavior (creates if needed).
        // If you want strict "login only" we can add /auth/login/google.
        const res = await api.loginWithGoogle(credential)
        loginWithToken(res.token, res.user)
        navigate(shouldForceCategoryOnboarding(res.user) ? '/categories' : '/home', { replace: true })
      } catch (err) {
        const msg = api.getApiErrorMessage(err)
        // If backend returns "No account found" in the future, switch to signup path.
        if (msg.toLowerCase().includes('no account')) {
          onNeedSignup(credential)
          return
        }
        toast.error(msg)
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
  }, [setBusy, loginWithToken, navigate, onNeedSignup])

  if (!hasClientId) return null

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

export function AuthFlowScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteRef = searchParams.get('ref')
  const { loginWithToken, setUser } = useApp()

  const [mode, setMode] = useState<Mode>('signin')
  const [method, setMethod] = useState<Method>('email')
  const [step, setStep] = useState<Step>('select')
  const [busy, setBusy] = useState(false)

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
            c.name.toLowerCase().includes(q) || c.iso.toLowerCase().includes(q) || c.dial.includes(q),
        )
    const selected = allCountries.find((c) => c.iso === countryIso)
    if (selected && !list.some((c) => c.iso === countryIso)) return [selected, ...list]
    return list
  }, [allCountries, countryQuery, countryIso])
  const selectedCountry = useMemo(() => allCountries.find((c) => c.iso === countryIso), [allCountries, countryIso])
  const maxNationalLen = useMemo(() => maxNationalDigitsForMobile(countryIso), [countryIso])

  useEffect(() => {
    setNationalNumber((prev) => {
      const d = digitsOnly(prev)
      return d.length > maxNationalLen ? d.slice(0, maxNationalLen) : d
    })
  }, [countryIso, maxNationalLen])

  const avatarChoices = useMemo(() => {
    const a = [...AVATAR_SEED_POOL]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a.slice(0, 10)
  }, [])
  const [name, setName] = useState('')
  const [gameTag, setGameTag] = useState('')
  const [avatarKey, setAvatarKey] = useState('')
  const [otpPhone, setOtpPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [phoneVerifiedForSignup, setPhoneVerifiedForSignup] = useState(false)
  const [phoneSignInMode, setPhoneSignInMode] = useState<PhoneSignInMode>('otp')
  const [pin, setPin] = useState('')
  const [securityQuestion, setSecurityQuestion] = useState<(typeof SECURITY_QUESTIONS)[number]>(
    SECURITY_QUESTIONS[0],
  )
  const [securityAnswer, setSecurityAnswer] = useState('')
  const [recoveryToken, setRecoveryToken] = useState('')

  function reset() {
    setStep('select')
    setCountryQuery('')
    setCountryDropdownOpen(false)
    setOtpCode('')
    setOtpPhone('')
    setPhoneVerifiedForSignup(false)
    setRecoveryToken('')
  }

  async function onEmailContinue(e: React.FormEvent) {
    e.preventDefault()
    const id = email.trim()
    if (!id || !id.includes('@')) return toast.error('Enter a valid email address')
    setBusy(true)
    try {
      if (mode === 'signin') {
        const res = await api.loginEmailExisting(id)
        loginWithToken(res.token, res.user)
        navigate(shouldForceCategoryOnboarding(res.user) ? '/categories' : '/home', { replace: true })
      } else {
        setStep('profile')
      }
    } catch (err) {
      toast.error(api.getApiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function onPhoneContinue(e: React.FormEvent) {
    e.preventDefault()
    const fullDigits = buildFullPhoneDigits(countryIso, nationalNumber)
    if (fullDigits.length < 8) return toast.error('Enter your mobile number')
    const fullE164 = `+${fullDigits}`
    setBusy(true)
    try {
      setOtpPhone(fullE164)
      if (mode === 'signin' && phoneSignInMode === 'pin') {
        setStep('pin-login')
        return
      }
      await api.sendOtp(fullE164)
      setOtpCode('')
      setStep('otp')
      toast.success('OTP sent successfully')
    } catch (err) {
      toast.error(api.getApiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function onVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    const code = otpCode.trim()
    if (!otpPhone) return toast.error('Please enter phone number again')
    if (code.length < 4) return toast.error('Enter valid OTP')
    setBusy(true)
    try {
      const res = await api.verifyOtp(otpPhone, code)
      if (mode === 'signin') {
        loginWithToken(res.token, res.user)
        navigate(shouldForceCategoryOnboarding(res.user) ? '/categories' : '/home', { replace: true })
        return
      }
      if (res.newUser) {
        loginWithToken(res.token, res.user)
        setPhoneVerifiedForSignup(true)
        setStep('profile')
        toast.success('OTP verified')
        return
      }
      loginWithToken(res.token, res.user)
      toast.message('Account already exists for this phone. Signed in successfully.')
      navigate(shouldForceCategoryOnboarding(res.user) ? '/categories' : '/home', { replace: true })
    } catch (err) {
      toast.error(api.getApiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function onResendOtp() {
    if (!otpPhone) return toast.error('Please enter phone number again')
    setBusy(true)
    try {
      await api.sendOtp(otpPhone)
      toast.success('OTP resent')
    } catch (err) {
      toast.error(api.getApiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function onPinLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!otpPhone) return toast.error('Please enter phone number again')
    if (!/^\d{4}$/.test(pin.trim())) return toast.error('PIN must be 4 digits')
    setBusy(true)
    try {
      const res = await api.verifyPin(otpPhone, pin.trim())
      loginWithToken(res.token, res.user)
      navigate(shouldForceCategoryOnboarding(res.user) ? '/categories' : '/home', { replace: true })
    } catch (err) {
      toast.error(api.getApiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function onForgotPinSendOtp() {
    if (!otpPhone) return toast.error('Please enter phone number first')
    setBusy(true)
    try {
      await api.forgotPinSendOtp(otpPhone)
      setOtpCode('')
      setStep('forgot-pin')
      toast.success('OTP sent for PIN recovery')
    } catch (err) {
      toast.error(api.getApiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function onForgotPinVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!otpPhone) return toast.error('Please enter phone number first')
    if (otpCode.trim().length < 4) return toast.error('Enter valid OTP')
    if (!securityAnswer.trim()) return toast.error('Enter security answer')
    setBusy(true)
    try {
      const res = await api.forgotPinVerify(otpPhone, otpCode.trim(), securityQuestion, securityAnswer.trim())
      if (!res.verified) return toast.error('Verification failed')
      setRecoveryToken(res.recoveryToken)
      setPin('')
      setStep('reset-pin')
      toast.success('Verified. Set a new PIN.')
    } catch (err) {
      toast.error(api.getApiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function onResetPin(e: React.FormEvent) {
    e.preventDefault()
    if (!recoveryToken) return toast.error('Recovery session expired. Try again.')
    if (!/^\d{4}$/.test(pin.trim())) return toast.error('PIN must be 4 digits')
    setBusy(true)
    try {
      await api.resetPin(recoveryToken, pin.trim())
      toast.success('PIN reset successful. Please login with PIN.')
      setStep('pin-login')
    } catch (err) {
      toast.error(api.getApiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function onCreateAccount() {
    const trimmedName = name.trim()
    if (!trimmedName) return toast.error('Enter your full name')
    const normalizedTag = trimmedName.replace(/\s+/g, '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 20) + Math.floor(1000 + Math.random() * 9000)

    setBusy(true)
    try {
      if (method === 'phone' && phoneVerifiedForSignup) {
        let next = await api.updateProfile({
          displayName: trimmedName,
          gameTag: normalizedTag,
          avatarKey: avatarKey.trim(),
          profilePhotoUrl: null,
          clearCustomPhoto: false,
        })
        if (/^\d{4}$/.test(pin.trim())) {
          next = await api.setPin(pin.trim())
        }
        if (securityAnswer.trim()) {
          next = await api.setSecurityQuestion(securityQuestion, securityAnswer.trim())
        }
        setUser(next)
        navigate(shouldForceCategoryOnboarding(next) ? '/categories' : '/home', { replace: true })
        return
      }
      const identifier =
        method === 'email'
          ? email.trim()
          : method === 'phone'
            ? buildFullPhoneDigits(countryIso, nationalNumber)
            : undefined
      const res = await api.signup({
        method: method === 'phone' ? 'phone' : method === 'email' ? 'email' : 'google',
        identifier,
        name: trimmedName,
        gameTag: normalizedTag,
        avatarKey: avatarKey.trim() || undefined,
        pin: pin.trim() || undefined,
        securityQuestion: securityAnswer.trim() ? securityQuestion : undefined,
        securityAnswer: securityAnswer.trim() || undefined,
      })
      loginWithToken(res.token, res.user)
      navigate(shouldForceCategoryOnboarding(res.user) ? '/categories' : '/home', { replace: true })
    } catch (e) {
      toast.error(api.getApiErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-screen relative min-h-[100dvh] overflow-hidden safe-pt-header">
      <div className="pointer-events-none absolute -right-24 -top-32 h-72 w-72 rounded-full bg-violet-400/25 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-indigo-400/20 blur-3xl" aria-hidden />

      <motion.div
        key={`${mode}-${step}`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mx-auto max-w-md px-5 pb-10 pt-6"
      >
        <button
          type="button"
          className="btn-app-ghost mb-6 rounded-full"
          aria-label="Back"
          onClick={() => (step === 'select' ? navigate(-1) : reset())}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          {mode === 'signin' ? 'Sign in' : 'Sign up'}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {step === 'select'
            ? 'Choose how you want to continue.'
            : step === 'input'
              ? 'Enter your details to continue.'
              : step === 'otp'
                ? 'Enter the OTP sent to your mobile number.'
                : step === 'pin-login'
                  ? 'Enter your 4-digit PIN for quick login.'
                  : step === 'forgot-pin'
                    ? 'Verify OTP and security question to recover your PIN.'
                    : step === 'reset-pin'
                      ? 'Set your new 4-digit PIN.'
              : 'Set up your profile to finish.'}
        </p>

        {inviteRef && (
          <p className="mt-3 rounded-xl border border-violet-200/90 bg-violet-50/90 px-3 py-2.5 text-xs font-medium leading-snug text-violet-900" role="status">
            You&apos;re signing up with a friend&apos;s invite. Complete your account to play together on the leaderboard.
          </p>
        )}

        {step === 'select' && (
          <>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`rounded-2xl border px-3 py-3 text-left text-sm font-extrabold transition ${
                  mode === 'signin' ? 'border-violet-300 bg-violet-50 text-violet-900' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
                onClick={() => setMode('signin')}
                disabled={busy}
              >
                <span className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" /> Sign in
                </span>
              </button>
              <button
                type="button"
                className={`rounded-2xl border px-3 py-3 text-left text-sm font-extrabold transition ${
                  mode === 'signup' ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
                onClick={() => setMode('signup')}
                disabled={busy}
              >
                <span className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" /> Sign up
                </span>
              </button>
            </div>

            <div className="mt-6 grid gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setMethod('email')
                  setStep('input')
                }}
                className="app-card flex w-full items-center gap-4 border-slate-200/90 p-4 text-left shadow-md transition hover:border-violet-200 hover:bg-violet-50/40 disabled:opacity-50"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                  <Mail className="h-6 w-6" />
                </span>
                <span>
                  <span className="block text-base font-bold text-slate-900">Continue with Email</span>
                  <span className="text-xs font-medium text-slate-500">No password, no OTP</span>
                </span>
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setMethod('phone')
                  setStep('input')
                }}
                className="app-card flex w-full items-center gap-4 border-slate-200/90 p-4 text-left shadow-md transition hover:border-violet-200 hover:bg-violet-50/40 disabled:opacity-50"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                  <Smartphone className="h-6 w-6" />
                </span>
                <span>
                  <span className="block text-base font-bold text-slate-900">Continue with Phone</span>
                  <span className="text-xs font-medium text-slate-500">Secure login with OTP</span>
                </span>
              </button>

            </div>

            <div className="relative my-10">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200/80" />
              </div>
              <div className="relative flex justify-center text-xs font-medium text-slate-500">
                <span className="rounded-full bg-white/90 px-4 py-0.5 backdrop-blur-sm">Or</span>
              </div>
            </div>

            <GoogleSignInBlock
              busy={busy}
              setBusy={setBusy}
              loginWithToken={loginWithToken}
              navigate={navigate}
              onNeedSignup={() => {
                setMode('signup')
                setMethod('google')
                setStep('profile')
              }}
            />
          </>
        )}

        {step === 'input' && method === 'email' && (
          <form onSubmit={onEmailContinue} className="mt-8 space-y-6">
            <div className="app-card overflow-hidden border-violet-200/70 p-0 shadow-lg shadow-violet-500/10 ring-1 ring-violet-100/80">
              <div className="border-b border-slate-100 bg-gradient-to-r from-violet-50/90 to-indigo-50/50 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm ring-1 ring-violet-100">
                    <Mail className="h-6 w-6" strokeWidth={2.25} />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Email address</p>
                    <p className="text-xs font-medium text-slate-500">{mode === 'signup' ? 'Create account' : 'Sign in'}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4 p-5">
                <div className="group relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-[1.1rem] w-[1.1rem] -translate-y-1/2 text-slate-400 transition group-focus-within:text-violet-500" strokeWidth={2} />
                  <input
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
                <button type="submit" disabled={busy} className="btn-app-primary py-4 text-base">
                  Continue
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </button>
              </div>
            </div>
          </form>
        )}

        {step === 'input' && method === 'phone' && (
          <form onSubmit={onPhoneContinue} className="mt-8 space-y-6">
            <div className="app-card overflow-hidden border-indigo-200/70 p-0 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-100/80">
              <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50/90 to-violet-50/40 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100">
                    <Smartphone className="h-6 w-6" strokeWidth={2.25} />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Mobile number</p>
                    <p className="text-xs font-medium text-slate-500">{mode === 'signup' ? 'Create account' : 'Sign in'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-5 p-5">
                <div>
                  {selectedCountry && (
                    <button
                      type="button"
                      onClick={() => setCountryDropdownOpen((v) => !v)}
                      className="mb-2 flex w-full items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/50 px-3 py-2 text-xs font-semibold text-indigo-950 transition hover:bg-indigo-100/60"
                    >
                      <span className="text-lg leading-none" aria-hidden>
                        {regionFlagEmoji(selectedCountry.iso)}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        +{selectedCountry.dial} · {selectedCountry.name}
                      </span>
                      <Globe2 className="h-3.5 w-3.5 shrink-0 text-indigo-500 opacity-80" />
                      <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-indigo-500 transition-transform ${countryDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                  )}

                  {countryDropdownOpen && (
                    <>
                      <div className="relative mb-2">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-[1.05rem] w-[1.05rem] -translate-y-1/2 text-slate-400" strokeWidth={2.25} />
                        <input
                          className="input-app w-full py-3.5 pl-11 pr-4 text-sm font-medium placeholder:text-slate-400 focus:border-indigo-400 focus:ring-indigo-500/20"
                          placeholder="Search by name, code, or +dial…"
                          value={countryQuery}
                          onChange={(e) => setCountryQuery(e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                      <div className="max-h-52 overflow-y-auto rounded-2xl border border-slate-200/90 bg-slate-50/40 shadow-inner ring-1 ring-slate-100/80">
                        <ul className="divide-y divide-slate-200/70 p-1">
                          {filteredCountries.map((c) => {
                            const active = c.iso === countryIso
                            return (
                              <li key={c.iso}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCountryIso(c.iso)
                                    setCountryDropdownOpen(false)
                                    setCountryQuery('')
                                  }}
                                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                                    active ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25' : 'text-slate-800 hover:bg-white hover:shadow-sm'
                                  }`}
                                >
                                  <span className="text-lg leading-none" aria-hidden>
                                    {regionFlagEmoji(c.iso)}
                                  </span>
                                  <span className="min-w-0 flex-1 font-semibold">{c.name}</span>
                                  <span className={`shrink-0 tabular-nums ${active ? 'text-indigo-100' : 'text-slate-500'}`}>+{c.dial}</span>
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex overflow-hidden rounded-2xl border-2 border-slate-200/90 bg-white shadow-sm transition focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/15">
                  <span className="flex shrink-0 items-center border-r border-slate-200/90 bg-gradient-to-b from-slate-50 to-slate-100/80 px-4 py-4 text-sm font-bold tabular-nums text-indigo-700">
                    +{selectedCountry?.dial ?? '—'}
                  </span>
                  <input
                    className="min-w-0 flex-1 border-0 bg-transparent px-4 py-4 text-base font-semibold tabular-nums text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-400"
                    inputMode="tel"
                    placeholder="Enter Your Number"
                    maxLength={maxNationalLen}
                    value={nationalNumber}
                    onChange={(e) => {
                      const d = digitsOnly(e.target.value)
                      setNationalNumber(d.slice(0, maxNationalLen))
                    }}
                  />
                </div>

                {mode === 'signin' && (
                  <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => setPhoneSignInMode('otp')}
                      className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                        phoneSignInMode === 'otp' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      Login via OTP
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhoneSignInMode('pin')}
                      className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                        phoneSignInMode === 'pin' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      Login via PIN
                    </button>
                  </div>
                )}

                <button type="submit" disabled={busy} className="btn-app-primary py-4 text-base">
                  {mode === 'signin'
                    ? phoneSignInMode === 'pin'
                      ? 'Continue to PIN login'
                      : 'Send OTP'
                    : 'Send OTP'}
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </button>
              </div>
            </div>
          </form>
        )}

        {step === 'profile' && (
          <div className="mt-8 space-y-6">
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Choose an avatar</p>
              <div className="grid grid-cols-5 gap-2">
                {avatarChoices.map((seed) => {
                  const selected = avatarKey.trim() === seed
                  return (
                    <button
                      key={seed}
                      type="button"
                      onClick={() => setAvatarKey(seed)}
                      className={`overflow-hidden rounded-xl border-2 bg-white p-0.5 shadow-sm transition ${selected ? 'border-violet-600 ring-2 ring-violet-200' : 'border-slate-100 hover:border-violet-200'}`}
                    >
                      <img src={dicebearUrl(seed)} alt="" className="aspect-square w-full rounded-lg bg-slate-50" />
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Full name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="input-app text-sm" maxLength={80} />
            </section>

            <section className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Game tag (unique)</label>
              <input value={gameTag} onChange={(e) => setGameTag(e.target.value)} className="input-app text-sm" placeholder="" maxLength={24} />
              <p className="text-[11px] text-slate-500">Use letters, numbers, or underscore. Min 4 chars.</p>
            </section>

            <section className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Set 4-digit PIN</label>
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="input-app text-sm tracking-[0.25em]"
                placeholder="1234"
                inputMode="numeric"
                autoComplete="one-time-code"
              />
              <p className="text-[11px] text-slate-500">Use this PIN for quick re-login.</p>
            </section>

            <section className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Security question</label>
              <select
                value={securityQuestion}
                onChange={(e) => setSecurityQuestion(e.target.value as (typeof SECURITY_QUESTIONS)[number])}
                className="input-app text-sm"
              >
                {SECURITY_QUESTIONS.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
              <input
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                className="input-app text-sm"
                placeholder="Enter answer"
                maxLength={80}
              />
            </section>

            <button type="button" disabled={busy} className="btn-app-primary py-4" onClick={() => void onCreateAccount()}>
              Create account
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <ArrowRight className="h-4 w-4" />
              </span>
            </button>
          </div>
        )}

        {step === 'otp' && method === 'phone' && (
          <form onSubmit={onVerifyOtp} className="mt-8 space-y-6">
            <div className="app-card overflow-hidden border-indigo-200/70 p-0 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-100/80">
              <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50/90 to-violet-50/40 px-5 py-4">
                <p className="text-sm font-bold text-slate-900">Verify OTP</p>
                <p className="text-xs font-medium text-slate-500">Code sent to {otpPhone}</p>
              </div>
              <div className="space-y-4 p-5">
                <input
                  className="input-app w-full text-center text-lg font-bold tracking-[0.35em]"
                  inputMode="numeric"
                  placeholder="------"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  autoComplete="one-time-code"
                />
                <button type="submit" disabled={busy} className="btn-app-primary py-4 text-base">
                  Verify OTP
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="btn-app-ghost w-full py-3 font-semibold"
                  onClick={() => void onResendOtp()}
                >
                  Resend OTP
                </button>
              </div>
            </div>
          </form>
        )}

        {step === 'pin-login' && method === 'phone' && (
          <form onSubmit={onPinLogin} className="mt-8 space-y-6">
            <div className="app-card overflow-hidden border-indigo-200/70 p-0 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-100/80">
              <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50/90 to-violet-50/40 px-5 py-4">
                <p className="text-sm font-bold text-slate-900">PIN Login</p>
                <p className="text-xs font-medium text-slate-500">{otpPhone}</p>
              </div>
              <div className="space-y-4 p-5">
                <input
                  className="input-app w-full text-center text-lg font-bold tracking-[0.35em]"
                  inputMode="numeric"
                  placeholder="----"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  autoComplete="one-time-code"
                />
                <button type="submit" disabled={busy} className="btn-app-primary py-4 text-base">
                  Login with PIN
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="btn-app-ghost w-full py-3 font-semibold"
                  onClick={() => void onForgotPinSendOtp()}
                >
                  Forgot PIN
                </button>
              </div>
            </div>
          </form>
        )}

        {step === 'forgot-pin' && method === 'phone' && (
          <form onSubmit={onForgotPinVerify} className="mt-8 space-y-6">
            <div className="app-card overflow-hidden border-indigo-200/70 p-0 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-100/80">
              <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50/90 to-violet-50/40 px-5 py-4">
                <p className="text-sm font-bold text-slate-900">Recover PIN</p>
                <p className="text-xs font-medium text-slate-500">Verify OTP + security answer</p>
              </div>
              <div className="space-y-4 p-5">
                <input
                  className="input-app w-full text-center text-lg font-bold tracking-[0.35em]"
                  inputMode="numeric"
                  placeholder="------"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  autoComplete="one-time-code"
                />
                <select
                  value={securityQuestion}
                  onChange={(e) => setSecurityQuestion(e.target.value as (typeof SECURITY_QUESTIONS)[number])}
                  className="input-app text-sm"
                >
                  {SECURITY_QUESTIONS.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
                <input
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  className="input-app text-sm"
                  placeholder="Security answer"
                  maxLength={80}
                />
                <button type="submit" disabled={busy} className="btn-app-primary py-4 text-base">
                  Verify and continue
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </button>
              </div>
            </div>
          </form>
        )}

        {step === 'reset-pin' && method === 'phone' && (
          <form onSubmit={onResetPin} className="mt-8 space-y-6">
            <div className="app-card overflow-hidden border-indigo-200/70 p-0 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-100/80">
              <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50/90 to-violet-50/40 px-5 py-4">
                <p className="text-sm font-bold text-slate-900">Set New PIN</p>
                <p className="text-xs font-medium text-slate-500">Choose 4 digits</p>
              </div>
              <div className="space-y-4 p-5">
                <input
                  className="input-app w-full text-center text-lg font-bold tracking-[0.35em]"
                  inputMode="numeric"
                  placeholder="----"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  autoComplete="one-time-code"
                />
                <button type="submit" disabled={busy} className="btn-app-primary py-4 text-base">
                  Reset PIN
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

