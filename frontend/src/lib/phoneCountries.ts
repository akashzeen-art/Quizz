import mobileExamples from 'libphonenumber-js/mobile/examples'
import { getCountries, getCountryCallingCode, type CountryCode } from 'libphonenumber-js/min'

export type PhoneCountryOption = {
  iso: CountryCode
  dial: string
  name: string
}

let cached: PhoneCountryOption[] | null = null

/** All regions supported by libphonenumber, sorted by English name. */
export function getPhoneCountries(): PhoneCountryOption[] {
  if (cached) return cached
  let display: Intl.DisplayNames
  try {
    display = new Intl.DisplayNames(['en'], { type: 'region' })
  } catch {
    cached = getCountries().map((iso) => ({
      iso,
      dial: String(getCountryCallingCode(iso)),
      name: iso,
    }))
    cached.sort((a, b) => a.name.localeCompare(b.name))
    return cached
  }

  const raw = getCountries().map((iso) => {
    try {
      const option: PhoneCountryOption = {
        iso,
        dial: String(getCountryCallingCode(iso)),
        name: display.of(iso) ?? iso,
      }
      return option
    } catch {
      return null
    }
  })

  cached = raw.filter((x): x is PhoneCountryOption => x !== null)
  cached.sort((a, b) => a.name.localeCompare(b.name))
  return cached
}

export function digitsOnly(s: string): string {
  return s.replace(/\D/g, '')
}

/** Max national (local) digit length for typical mobile numbers, from libphonenumber mobile examples. */
export function maxNationalDigitsForMobile(iso: CountryCode): number {
  const sample = (mobileExamples as Record<string, string | undefined>)[iso]
  if (sample && /^\d+$/.test(sample)) return sample.length
  const cc = String(getCountryCallingCode(iso)).length
  return Math.max(4, 15 - cc)
}

/** E.164-style digits only: country calling code + national number (no leading 0 on national). */
export function buildFullPhoneDigits(countryIso: CountryCode, nationalDigits: string): string {
  const dial = String(getCountryCallingCode(countryIso))
  const national = digitsOnly(nationalDigits).replace(/^0+/, '')
  return dial + national
}

/** Unicode regional-indicator flag for ISO 3166-1 alpha-2 (e.g. IN → 🇮🇳). */
export function regionFlagEmoji(iso: string): string {
  const u = iso.toUpperCase()
  if (u.length !== 2 || !/^[A-Z]{2}$/.test(u)) return '🌍'
  return String.fromCodePoint(
    ...[...u].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0)),
  )
}

export function guessDefaultCountry(): CountryCode {
  try {
    const region = new Intl.Locale(navigator.language).maximize().region
    if (region && getCountries().includes(region as CountryCode)) {
      return region as CountryCode
    }
  } catch {
    /* ignore */
  }
  return 'US'
}
