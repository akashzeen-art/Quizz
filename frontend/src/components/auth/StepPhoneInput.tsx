import { useState, useMemo, useEffect } from 'react'
import { ArrowRight, ChevronDown, ChevronLeft, Globe2, Search, Smartphone } from 'lucide-react'
import type { AuthMode } from '../AuthFlowScreen'
import type { CountryCode } from 'libphonenumber-js/min'
import {
  buildFullPhoneDigits,
  digitsOnly,
  getPhoneCountries,
  maxNationalDigitsForMobile,
  regionFlagEmoji,
  type PhoneCountryOption,
} from '../../lib/phoneCountries'

export function StepPhoneInput({
  mode,
  busy,
  countryIso,
  nationalNumber,
  onCountryChange,
  onNumberChange,
  onSendOtp,
  onPinLogin,
  onBack,
}: {
  mode: AuthMode
  busy: boolean
  countryIso: CountryCode
  nationalNumber: string
  onCountryChange: (iso: CountryCode) => void
  onNumberChange: (n: string) => void
  onSendOtp: (phone: string) => void
  onPinLogin: (phone: string) => void
  onBack: () => void
}) {
  const [loginMode, setLoginMode] = useState<'otp' | 'pin'>('otp')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  const allCountries = useMemo(() => getPhoneCountries(), [])
  const maxLen = useMemo(() => maxNationalDigitsForMobile(countryIso), [countryIso])
  const selectedCountry = useMemo(() => allCountries.find((c) => c.iso === countryIso), [allCountries, countryIso])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allCountries
    return allCountries.filter((c: PhoneCountryOption) =>
      c.name.toLowerCase().includes(q) || c.iso.toLowerCase().includes(q) || c.dial.includes(q)
    )
  }, [allCountries, query])

  useEffect(() => {
    onNumberChange(digitsOnly(nationalNumber).slice(0, maxLen))
  }, [countryIso, maxLen])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const full = buildFullPhoneDigits(countryIso, nationalNumber)
    if (full.length < 8) { setError('Enter a valid mobile number'); return }
    setError('')
    const e164 = `+${full}`
    if (mode === 'signin' && loginMode === 'pin') {
      onPinLogin(e164)
    } else {
      onSendOtp(e164)
    }
  }

  return (
    <div>
      <button type="button" onClick={onBack} className="mb-5 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 text-slate-600 hover:bg-slate-50">
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
        <Smartphone className="h-6 w-6" />
      </div>
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-slate-900">
        {mode === 'signin' ? 'Sign in with Phone' : 'Your Phone Number'}
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        {mode === 'signin' ? 'Enter your number to receive an OTP.' : 'We\'ll verify your number via SMS.'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Country picker */}
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Country</label>
          {selectedCountry && (
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-indigo-200"
            >
              <span className="text-lg leading-none">{regionFlagEmoji(selectedCountry.iso)}</span>
              <span className="flex-1 truncate text-left">+{selectedCountry.dial} · {selectedCountry.name}</span>
              <Globe2 className="h-4 w-4 text-slate-400" />
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
          {dropdownOpen && (
            <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
              <div className="relative border-b border-slate-100 p-2">
                <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-indigo-400"
                  placeholder="Search country…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <ul className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                {filtered.map((c) => (
                  <li key={c.iso}>
                    <button
                      type="button"
                      onClick={() => { onCountryChange(c.iso as CountryCode); setDropdownOpen(false); setQuery('') }}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition ${c.iso === countryIso ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50'}`}
                    >
                      <span className="text-base leading-none">{regionFlagEmoji(c.iso)}</span>
                      <span className="flex-1 font-medium">{c.name}</span>
                      <span className={`tabular-nums text-xs ${c.iso === countryIso ? 'text-indigo-200' : 'text-slate-400'}`}>+{c.dial}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Phone number */}
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Phone number</label>
          <div className={`flex overflow-hidden rounded-2xl border-2 bg-white transition focus-within:ring-2 ${error ? 'border-rose-300 focus-within:ring-rose-500/20' : 'border-slate-200 focus-within:border-indigo-400 focus-within:ring-indigo-500/15'}`}>
            <span className="flex shrink-0 items-center border-r border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold tabular-nums text-indigo-700">
              +{selectedCountry?.dial ?? '—'}
            </span>
            <input
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="Enter number"
              maxLength={maxLen}
              value={nationalNumber}
              onChange={(e) => { onNumberChange(digitsOnly(e.target.value).slice(0, maxLen)); setError('') }}
              className="min-w-0 flex-1 border-0 bg-transparent px-4 py-4 text-base font-semibold tabular-nums text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
            />
          </div>
          {error && <p className="mt-1.5 text-xs font-medium text-rose-500">{error}</p>}
        </div>

        {/* Login mode toggle (signin only) */}
        {mode === 'signin' && (
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
            <button type="button" onClick={() => setLoginMode('otp')}
              className={`rounded-xl py-2 text-xs font-bold transition ${loginMode === 'otp' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>
              Login via OTP
            </button>
            <button type="button" onClick={() => setLoginMode('pin')}
              className={`rounded-xl py-2 text-xs font-bold transition ${loginMode === 'pin' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>
              Login via PIN
            </button>
          </div>
        )}

        <button type="submit" disabled={busy || nationalNumber.length < 4} className="btn-app-primary py-4 text-base disabled:opacity-50">
          {busy ? 'Please wait…' : mode === 'signin' && loginMode === 'pin' ? 'Continue to PIN' : 'Send OTP'}
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <ArrowRight className="h-4 w-4" />
          </span>
        </button>
      </form>
    </div>
  )
}
