import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { shouldForceCategoryOnboarding } from '../lib/categoryOnboarding'
import * as api from '../api/client'
import { toast } from 'sonner'
import {
  buildFullPhoneDigits,
  guessDefaultCountry,
} from '../lib/phoneCountries'
import type { CountryCode } from 'libphonenumber-js/min'
import { AVATAR_SEED_POOL } from '../constants/avatars'

// Step components
import { StepMethodSelect } from './auth/StepMethodSelect'
import { StepEmailInput } from './auth/StepEmailInput'
import { StepPhoneInput } from './auth/StepPhoneInput'
import { StepOtpVerify } from './auth/StepOtpVerify'
import { StepPinSecurity } from './auth/StepPinSecurity'
import { StepProfile } from './auth/StepProfile'
import { StepPinLogin } from './auth/StepPinLogin'
import { StepForgotPin } from './auth/StepForgotPin'
import { StepResetPin } from './auth/StepResetPin'
import { AuthProgressBar } from './auth/AuthProgressBar'

export type AuthMode = 'signin' | 'signup'
export type AuthMethod = 'email' | 'phone' | 'google'
export type AuthStep =
  | 'select'
  | 'email-input'
  | 'phone-input'
  | 'otp'
  | 'pin-security'
  | 'profile'
  | 'pin-login'
  | 'forgot-pin'
  | 'reset-pin'

const SIGNUP_STEPS: AuthStep[] = ['select', 'phone-input', 'otp', 'pin-security', 'profile']
const SIGNUP_EMAIL_STEPS: AuthStep[] = ['select', 'email-input', 'pin-security', 'profile']

function getStepNumber(step: AuthStep, method: AuthMethod): number {
  const steps = method === 'email' ? SIGNUP_EMAIL_STEPS : SIGNUP_STEPS
  const idx = steps.indexOf(step)
  return idx === -1 ? 0 : idx
}

function getTotalSteps(method: AuthMethod): number {
  return method === 'email' ? SIGNUP_EMAIL_STEPS.length : SIGNUP_STEPS.length
}

export function AuthFlowScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteRef = searchParams.get('ref')
  const { loginWithToken, setUser } = useApp()

  const [mode, setMode] = useState<AuthMode>('signin')
  const [method, setMethod] = useState<AuthMethod>('email')
  const [step, setStep] = useState<AuthStep>('select')
  const [busy, setBusy] = useState(false)
  const [direction, setDirection] = useState(1)

  // Email
  const [email, setEmail] = useState('')

  // Phone
  const [countryIso, setCountryIso] = useState<CountryCode>(() => guessDefaultCountry())
  const [nationalNumber, setNationalNumber] = useState('')
  const [otpPhone, setOtpPhone] = useState('')
  const [phoneVerified, setPhoneVerified] = useState(false)

  // PIN + Security
  const [pin, setPinState] = useState('')
  const [securityQuestion, setSecurityQuestion] = useState("What is your pet's name?")
  const [securityAnswer, setSecurityAnswer] = useState('')

  // Profile
  const avatarChoices = useMemo(() => {
    const a = [...AVATAR_SEED_POOL]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a.slice(0, 10)
  }, [])

  // Forgot PIN
  const [recoveryToken, setRecoveryToken] = useState('')

  function goTo(next: AuthStep, dir = 1) {
    setDirection(dir)
    setStep(next)
  }

  function goBack() {
    setDirection(-1)
    if (step === 'select') { navigate(-1); return }
    if (step === 'email-input' || step === 'phone-input') { goTo('select', -1); return }
    if (step === 'otp') { goTo('phone-input', -1); return }
    if (step === 'pin-security') {
      if (method === 'email') goTo('email-input', -1)
      else goTo('otp', -1)
      return
    }
    if (step === 'profile') { goTo('pin-security', -1); return }
    if (step === 'pin-login') { goTo('phone-input', -1); return }
    if (step === 'forgot-pin') { goTo('pin-login', -1); return }
    if (step === 'reset-pin') { goTo('forgot-pin', -1); return }
    goTo('select', -1)
  }

  // ── Email signin/signup ──────────────────────────────────────────────────
  async function onEmailContinue(emailVal: string) {
    setBusy(true)
    try {
      const check = await api.checkUser(emailVal)
      if (check.exists) {
        // existing user → go to PIN login
        setOtpPhone(emailVal) // reuse otpPhone as identifier
        goTo('pin-login')
      } else {
        // new user → signup flow
        setEmail(emailVal)
        goTo('pin-security')
      }
    } catch (err) {
      toast.error(api.getApiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  // ── Phone send OTP ───────────────────────────────────────────────────────
  async function onPhoneSendOtp(phone: string) {
    setBusy(true)
    try {
      const check = await api.checkUser(phone)
      if (check.exists) {
        setOtpPhone(phone)
        goTo('pin-login')
        return
      }
      await api.sendOtp(phone)
      setOtpPhone(phone)
      goTo('otp')
      toast.success('OTP sent!')
    } catch (err) {
      toast.error(api.getApiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function onPhonePinLogin(phone: string) {
    setOtpPhone(phone)
    goTo('pin-login')
  }

  // ── OTP verify ───────────────────────────────────────────────────────────
  async function onOtpVerify(code: string) {
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
        setPhoneVerified(true)
        goTo('pin-security')
        toast.success('Phone verified!')
        return
      }
      loginWithToken(res.token, res.user)
      toast.message('Account exists. Signed in.')
      navigate(shouldForceCategoryOnboarding(res.user) ? '/categories' : '/home', { replace: true })
    } catch (err) {
      toast.error(api.getApiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function onResendOtp() {
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

  function onPinSecurityDone(p: string, sq: string, sa: string) {
    setPinState(p)
    setSecurityQuestion(sq)
    setSecurityAnswer(sa)
    goTo('profile')
  }

  // ── Profile ──────────────────────────────────────────────────────────────
  async function onProfileDone(n: string, gt: string, ak: string) {
    setBusy(true)
    try {
      if (method === 'phone' && phoneVerified) {
        let next = await api.updateProfile({
          displayName: n,
          gameTag: gt,
          avatarKey: ak,
          profilePhotoUrl: null,
          clearCustomPhoto: false,
        })
        if (pin) next = await api.setPin(pin)
        if (securityAnswer) next = await api.setSecurityQuestion(securityQuestion, securityAnswer)
        setUser(next)
        navigate(shouldForceCategoryOnboarding(next) ? '/categories' : '/home', { replace: true })
        return
      }
      const identifier = method === 'email' ? email : buildFullPhoneDigits(countryIso, nationalNumber)
      const res = await api.signup({
        method: method === 'google' ? 'google' : method,
        identifier,
        name: n,
        gameTag: gt,
        avatarKey: ak || undefined,
        pin: pin || undefined,
        securityQuestion: securityAnswer ? securityQuestion : undefined,
        securityAnswer: securityAnswer || undefined,
      })
      loginWithToken(res.token, res.user)
      navigate(shouldForceCategoryOnboarding(res.user) ? '/categories' : '/home', { replace: true })
    } catch (err) {
      toast.error(api.getApiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  // ── PIN login ────────────────────────────────────────────────────────────
  async function onPinLogin(p: string) {
    setBusy(true)
    try {
      const res = await api.loginWithPin(otpPhone, p)
      loginWithToken(res.token, res.user)
      navigate(shouldForceCategoryOnboarding(res.user) ? '/categories' : '/home', { replace: true })
    } catch (err) {
      toast.error(api.getApiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  // ── Forgot PIN ───────────────────────────────────────────────────────────
  async function onForgotPinVerify(code: string, sq: string, sa: string) {
    setBusy(true)
    try {
      const res = await api.forgotPinVerify(otpPhone, code, sq, sa)
      if (!res.verified) { toast.error('Verification failed'); return }
      setRecoveryToken(res.recoveryToken)
      goTo('reset-pin')
      toast.success('Verified! Set new PIN.')
    } catch (err) {
      toast.error(api.getApiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function onResetPin(newPin: string) {
    setBusy(true)
    try {
      await api.resetPin(recoveryToken, newPin)
      toast.success('PIN reset! Login with new PIN.')
      goTo('pin-login')
    } catch (err) {
      toast.error(api.getApiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  // ── Google ───────────────────────────────────────────────────────────────
  async function onGoogleSuccess(credential: string) {
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

  const isSignupStep = ['pin-security', 'profile'].includes(step)
  const showProgress = mode === 'signup' && isSignupStep
  const stepNum = getStepNumber(step, method)
  const totalSteps = getTotalSteps(method)

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -40 : 40, opacity: 0 }),
  }

  return (
    <div className="app-screen relative min-h-[100dvh] overflow-hidden bg-gradient-to-br from-slate-50 to-violet-50/30 safe-pt-header flex items-center justify-center">
      <div className="pointer-events-none absolute -right-24 -top-32 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-indigo-400/15 blur-3xl" aria-hidden />

      <div className="relative w-full max-w-md px-5 py-10">
        {showProgress && (
          <AuthProgressBar current={stepNum} total={totalSteps - 1} onBack={goBack} />
        )}

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: 'easeInOut' }}
          >
            {step === 'select' && (
              <StepMethodSelect
                mode={mode}
                busy={busy}
                inviteRef={inviteRef}
                onModeChange={setMode}
                onSelectEmail={() => { setMethod('email'); setMode('signup'); goTo('email-input') }}
                onSelectPhone={() => { setMethod('phone'); setMode('signup'); goTo('phone-input') }}
                onGoogleSuccess={onGoogleSuccess}
                onBack={() => navigate(-1)}
              />
            )}

            {step === 'email-input' && (
              <StepEmailInput
                mode={mode}
                busy={busy}
                onContinue={onEmailContinue}
                onBack={goBack}
              />
            )}

            {step === 'phone-input' && (
              <StepPhoneInput
                mode={mode}
                busy={busy}
                countryIso={countryIso}
                nationalNumber={nationalNumber}
                onCountryChange={setCountryIso}
                onNumberChange={setNationalNumber}
                onSendOtp={onPhoneSendOtp}
                onPinLogin={onPhonePinLogin}
                onBack={goBack}
              />
            )}

            {step === 'otp' && (
              <StepOtpVerify
                phone={otpPhone}
                busy={busy}
                onVerify={onOtpVerify}
                onResend={onResendOtp}
                onBack={goBack}
              />
            )}

            {step === 'pin-security' && (
              <StepPinSecurity
                busy={busy}
                onDone={onPinSecurityDone}
                onBack={goBack}
              />
            )}

            {step === 'profile' && (
              <StepProfile
                busy={busy}
                avatarChoices={avatarChoices}
                onDone={onProfileDone}
                onBack={goBack}
              />
            )}

            {step === 'pin-login' && (
              <StepPinLogin
                identifier={otpPhone}
                busy={busy}
                onLogin={onPinLogin}
                onForgotPin={() => {
                  api.forgotPinSendOtp(otpPhone)
                    .then(() => { goTo('forgot-pin'); toast.success('OTP sent') })
                    .catch((e) => toast.error(api.getApiErrorMessage(e)))
                }}
                onBack={goBack}
              />
            )}

            {step === 'forgot-pin' && (
              <StepForgotPin
                phone={otpPhone}
                busy={busy}
                onVerify={onForgotPinVerify}
                onBack={goBack}
              />
            )}

            {step === 'reset-pin' && (
              <StepResetPin
                busy={busy}
                onReset={onResetPin}
                onBack={goBack}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
