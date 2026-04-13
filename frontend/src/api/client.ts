import axios, { isAxiosError } from 'axios'
import { isCategoryCountValid } from '../constants/categories'
import { persistUserCategories } from '../lib/categoryStorage'
import { isAllowedPresetLocation } from '../constants/locations'
import type {
  LeaderboardEntryDto,
  LeaderboardSort,
  QuestionDto,
  QuizDetailDto,
  QuizDto,
  SubmitAnswerResponse,
  UserProfileDto,
} from '../types'

const baseURL = import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

/** So `multipart/form-data` gets the correct boundary; default `application/json` breaks photo upload. */
api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    config.headers.delete('Content-Type')
  }
  return config
})

/** User-facing message; use in catch blocks instead of a generic "Something went wrong". */
export function getApiErrorMessage(err: unknown): string {
  if (err instanceof Error && !isAxiosError(err)) {
    return err.message || 'Something went wrong'
  }
  if (isAxiosError(err)) {
    const status = err.response?.status
    const data = err.response?.data as { error?: string } | undefined
    if (status === 502) {
      return 'Cannot reach the API. Start the backend on port 8080: cd backend && mvn spring-boot:run'
    }
    if (status === 503 && data?.error) return data.error
    if (status === 503) {
      return 'Database unavailable. Check MongoDB Atlas, MONGODB_URI in backend/.env, and network/TLS.'
    }
    if (status === 500 && data?.error) return data.error
    if (status === 402) {
      const m =
        (data as { error?: string; message?: string } | undefined)?.error ??
        (data as { message?: string } | undefined)?.message
      if (m) return m
      return 'Not enough credits to continue'
    }
    if (data?.error) return data.error
    const msgOnly = (data as { message?: string } | undefined)?.message
    if (msgOnly) return msgOnly
    if (err.message) return err.message
  }
  return 'Something went wrong'
}

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`
    localStorage.setItem('nserve_token', token)
  } else {
    delete api.defaults.headers.common.Authorization
    localStorage.removeItem('nserve_token')
  }
}

export function loadStoredToken() {
  const t = localStorage.getItem('nserve_token')
  if (t) api.defaults.headers.common.Authorization = `Bearer ${t}`
  return t
}

export function normalizeUserProfile(raw: unknown): UserProfileDto {
  const r = raw as Record<string, unknown>
  const cats = Array.isArray(r.categories) ? r.categories.map(String) : []
  const played = Array.isArray(r.playedDates) ? r.playedDates.map(String) : []
  const loc = r.location
  const ppu = r.profilePhotoUrl
  const ak = r.avatarKey
  return {
    id: String(r.id ?? ''),
    displayName: String(r.displayName ?? 'Player'),
    email: r.email != null ? String(r.email) : undefined,
    phone: r.phone != null ? String(r.phone) : undefined,
    totalScore: Number(r.totalScore ?? 0),
    weeklyScore: Number(r.weeklyScore ?? 0),
    monthlyScore: Number(r.monthlyScore ?? 0),
    points: Number(r.points ?? 0),
    dayScore: Number(r.dayScore ?? 0),
    credits: Number(r.credits ?? 0),
    totalSpent: Number(r.totalSpent ?? 0),
    categories: cats,
    playedDates: played,
    location:
      loc != null && String(loc).trim() !== ''
        ? String(loc).trim()
        : undefined,
    profilePhotoUrl:
      ppu != null && String(ppu).trim() !== ''
        ? String(ppu).trim()
        : undefined,
    avatarKey:
      ak != null && String(ak).trim() !== '' ? String(ak).trim() : undefined,
    planType: String(r.planType ?? 'FREE'),
    planStatus: String(r.planStatus ?? 'ACTIVE'),
    profileUpdatedAt:
      r.profileUpdatedAt != null ? String(r.profileUpdatedAt) : undefined,
  }
}

/** Image URL for header / profile circle: gallery first, else Dicebear from {@code avatarKey}. */
export function resolveProfileImageUrl(user: UserProfileDto): string | undefined {
  const photo = user.profilePhotoUrl?.trim()
  if (photo) {
    if (photo.startsWith('http://') || photo.startsWith('https://')) return photo
    return photo.startsWith('/') ? photo : `/${photo}`
  }
  const key = user.avatarKey?.trim()
  if (key) {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(key)}`
  }
  return undefined
}

export type ProfileUpdatePayload = {
  displayName: string
  /** Empty string clears the preset avatar on the server. */
  avatarKey: string
  profilePhotoUrl: string | null
  clearCustomPhoto: boolean
}

export async function updateProfile(payload: ProfileUpdatePayload) {
  const { data } = await api.put<unknown>('/user/profile', payload)
  return normalizeUserProfile(data)
}

/** Saves the file on disk and updates the user in MongoDB; returns the latest profile. */
export async function uploadProfilePhoto(file: File) {
  const fd = new FormData()
  fd.append('file', file)
  const { data } = await api.post<unknown>('/user/profile/photo', fd)
  return normalizeUserProfile(data)
}

export async function loginEmail(identifier: string) {
  const { data } = await api.post<{ token: string; user: unknown }>(
    '/auth/login',
    { identifier, method: 'email' },
  )
  return { token: data.token, user: normalizeUserProfile(data.user) }
}

export async function loginPhone(phoneDigits: string) {
  const { data } = await api.post<{ token: string; user: unknown }>(
    '/auth/login',
    { identifier: phoneDigits, method: 'phone' },
  )
  return { token: data.token, user: normalizeUserProfile(data.user) }
}

/** Google Identity Services JWT → backend verifies and returns session token. */
export async function loginWithGoogle(credential: string) {
  const { data } = await api.post<{ token: string; user: unknown }>(
    '/auth/google',
    { credential },
  )
  return { token: data.token, user: normalizeUserProfile(data.user) }
}

const LOCATION_FALLBACK_KEY = 'nserve_user_location'

export function getLocationFallback(): string | undefined {
  try {
    const v = localStorage.getItem(LOCATION_FALLBACK_KEY)
    return v?.trim() ? v.trim() : undefined
  } catch {
    return undefined
  }
}

export function clearLocationFallback() {
  try {
    localStorage.removeItem(LOCATION_FALLBACK_KEY)
  } catch {
    /* ignore */
  }
}

function setLocationFallback(value: string) {
  const t = value.trim()
  try {
    if (t) localStorage.setItem(LOCATION_FALLBACK_KEY, t)
    else localStorage.removeItem(LOCATION_FALLBACK_KEY)
  } catch {
    /* ignore */
  }
}

/** Merge server profile with locally saved location when API has no location yet. */
export function mergeProfileWithLocationFallback(
  profile: UserProfileDto,
): UserProfileDto {
  const fb = getLocationFallback()
  if (fb && !(profile.location?.trim())) {
    return { ...profile, location: fb }
  }
  return profile
}

export async function fetchProfile() {
  const { data } = await api.get<unknown>('/user/profile')
  const p = normalizeUserProfile(data)
  if (p.location?.trim()) clearLocationFallback()
  return mergeProfileWithLocationFallback(p)
}

export async function savePreferences(categories: string[]) {
  const { data } = await api.post<unknown>('/user/preferences', {
    categories,
  })
  const p = normalizeUserProfile(data)
  persistUserCategories(p.categories)
  return p
}

/**
 * Saves location via `POST /user/preferences` with the user's current five categories and
 * `location`. That route is always registered on the API, so you avoid a spurious 404 from
 * `POST /user/location` when an older backend build is still running.
 */
export async function saveUserLocation(
  location: string,
  currentUser: UserProfileDto,
): Promise<{ profile: UserProfileDto; synced: boolean }> {
  const trimmed = location.trim()
  if (trimmed && !isAllowedPresetLocation(trimmed)) {
    throw new Error('Location must be from the preset list')
  }
  const cats = currentUser.categories ?? []
  if (!isCategoryCountValid(cats.length)) {
    const t = trimmed
    setLocationFallback(t)
    return {
      profile: { ...currentUser, location: t || undefined },
      synced: false,
    }
  }

  function profileFromSaveResponse(data: unknown): UserProfileDto {
    const normalized = normalizeUserProfile(data)
    const locationOut =
      trimmed === ''
        ? undefined
        : normalized.location?.trim() || trimmed || undefined
    return { ...normalized, location: locationOut }
  }

  try {
    const { data } = await api.post<unknown>('/user/preferences', {
      categories: cats,
      location: trimmed,
    })
    clearLocationFallback()
    const profile = profileFromSaveResponse(data)
    persistUserCategories(profile.categories)
    return { profile, synced: true }
  } catch (e) {
    const status = isAxiosError(e) ? e.response?.status : undefined
    if (
      status !== undefined &&
      [404, 405, 502, 503].includes(status)
    ) {
      const t = trimmed
      setLocationFallback(t)
      return {
        profile: { ...currentUser, location: t || undefined },
        synced: false,
      }
    }
    throw e
  }
}

function normalizeQuiz(raw: unknown): QuizDto {
  const r = raw as Record<string, unknown>
  const st = String(r.status ?? 'live')
  const status =
    st === 'upcoming' || st === 'ended' || st === 'live'
      ? (st as QuizDto['status'])
      : 'live'
  return {
    id: String(r.id ?? ''),
    title: String(r.title ?? ''),
    description: String(r.description ?? ''),
    status,
    startsAt: r.startsAt != null ? String(r.startsAt) : undefined,
    endsAt: r.endsAt != null ? String(r.endsAt) : undefined,
    questionCount: typeof r.questionCount === 'number' ? r.questionCount : 0,
    referenceDocumentUrl:
      r.referenceDocumentUrl != null
        ? String(r.referenceDocumentUrl)
        : undefined,
    referenceDocumentName:
      r.referenceDocumentName != null
        ? String(r.referenceDocumentName)
        : undefined,
  }
}

function normalizeQuestion(raw: unknown): QuestionDto {
  const r = raw as Record<string, unknown>
  const media = r.mediaType
  const input = r.inputType
  return {
    id: String(r.id ?? ''),
    questionText: String(r.questionText ?? ''),
    mediaUrl: r.mediaUrl != null ? String(r.mediaUrl) : undefined,
    mediaType:
      media === 'image' ||
      media === 'video' ||
      media === 'gif' ||
      media === 'audio' ||
      media === 'none'
        ? media
        : 'none',
    inputType:
      input === 'mcq4' ||
      input === 'binary' ||
      input === 'mcq3' ||
      input === 'slider'
        ? input
        : 'mcq4',
    options: Array.isArray(r.options)
      ? (r.options as unknown[]).map((o) => String(o ?? ''))
      : [],
    category: String(r.category ?? ''),
    documentReference:
      r.documentReference != null ? String(r.documentReference) : undefined,
  }
}

const QUIZ_PLAY_STORAGE_PREFIX = 'nserve_quiz_play:'

/** Stable idempotency key per quiz tab session; reused so refresh does not double-charge. */
export function getQuizPlayClientId(quizId: string): string {
  try {
    const k = QUIZ_PLAY_STORAGE_PREFIX + quizId
    let v = sessionStorage.getItem(k)
    if (!v) {
      v = crypto.randomUUID()
      sessionStorage.setItem(k, v)
    }
    return v
  } catch {
    return crypto.randomUUID()
  }
}

export function clearQuizPlayClientId(quizId: string) {
  try {
    sessionStorage.removeItem(QUIZ_PLAY_STORAGE_PREFIX + quizId)
  } catch {
    /* ignore */
  }
}

export type WalletBalanceDto = { credits: number; totalSpent: number }

export async function fetchWalletBalance() {
  const { data } = await api.get<WalletBalanceDto>('/wallet/balance')
  return data
}

export type CreditTransaction = {
  id: string
  type: 'credit_added' | 'credit_used'
  amount: number
  balanceAfter: number
  description: string
  createdAt: string
}

export async function fetchWalletTransactions(): Promise<CreditTransaction[]> {
  const { data } = await api.get<CreditTransaction[]>('/wallet/transactions')
  return data
}

export async function addWalletCredits(payload: {
  amountRupees?: number
  credits?: number
  paymentProvider?: string
  externalPaymentId?: string
}) {
  const { data } = await api.post<WalletBalanceDto>('/wallet/add-credits', payload)
  return data
}

export async function deductQuizCredits(quizId: string, clientRequestId: string) {
  const { data } = await api.post<WalletBalanceDto & { clientRequestId: string; quizId: string }>(
    '/quiz/deduct-credits',
    { quizId, clientRequestId },
  )
  return data
}

export async function fetchQuizList() {
  const { data } = await api.get<unknown[]>('/quiz/list')
  return Array.isArray(data) ? data.map(normalizeQuiz) : []
}

export async function fetchAnsweredQuestionIds(quizId: string, playRef?: string): Promise<string[]> {
  try {
    const { data } = await api.get<string[]>(`/quiz/${quizId}/answered`, {
      headers: playRef ? { 'X-Quiz-Play-Ref': playRef } : {},
    })
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export async function fetchQuiz(id: string, playRef?: string) {
  const { data } = await api.get<Record<string, unknown>>(`/quiz/${id}`, {
    headers: playRef ? { 'X-Quiz-Play-Ref': playRef } : {},
  })
  const quizRaw = data.quiz
  const questions = data.questions
  return {
    quiz: normalizeQuiz(quizRaw),
    questions: Array.isArray(questions)
      ? questions.map(normalizeQuestion)
      : [],
  } as QuizDetailDto
}

export async function submitAnswer(body: {
  quizId: string
  questionId: string
  answerIndex?: number
  sliderValue?: number
  timeMs: number
  timedOut: boolean
}) {
  const { data } = await api.post<SubmitAnswerResponse>(
    '/quiz/submit-answer',
    body,
  )
  return data
}

/** Backend may omit fields or return legacy `{ score }` only — coerce so UI never sees undefined. */
function normalizeLeaderboardEntry(raw: unknown): LeaderboardEntryDto {
  const r = raw as Record<string, unknown>
  const legacy =
    typeof r.score === 'number' ? (r.score as number) : undefined
  const num = (k: string) => {
    const v = r[k]
    return typeof v === 'number' && !Number.isNaN(v) ? v : undefined
  }
  const total = num('totalScore') ?? legacy ?? 0
  return {
    rank: num('rank') ?? 0,
    userId: String(r.userId ?? ''),
    displayName: String(r.displayName ?? 'Player'),
    totalScore: total,
    weeklyScore: num('weeklyScore') ?? 0,
    monthlyScore: num('monthlyScore') ?? 0,
    points: num('points') ?? 0,
  }
}

export async function fetchLeaderboard(sort: LeaderboardSort = 'total') {
  const { data } = await api.get<unknown[]>('/leaderboard', {
    params: { sort },
  })
  return Array.isArray(data) ? data.map(normalizeLeaderboardEntry) : []
}
