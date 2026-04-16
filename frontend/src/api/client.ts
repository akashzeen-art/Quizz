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
    gameTag:
      r.gameTag != null && String(r.gameTag).trim() !== ''
        ? String(r.gameTag).trim()
        : undefined,
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
  sessionId?: string
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
  const legacy = typeof r.score === 'number' ? (r.score as number) : undefined
  const num = (k: string) => {
    const v = r[k]
    return typeof v === 'number' && !Number.isNaN(v) ? v : undefined
  }
  const total = num('totalScore') ?? legacy ?? 0
  return {
    rank: num('rank') ?? 0,
    userId: String(r.userId ?? ''),
    displayName: String(r.displayName ?? 'Player'),
    avatarSeed: r.avatarSeed != null ? String(r.avatarSeed) : undefined,
    avatarUrl: r.avatarUrl != null ? String(r.avatarUrl) : undefined,
    totalScore: total,
    weeklyScore: num('weeklyScore') ?? 0,
    monthlyScore: num('monthlyScore') ?? 0,
    dayScore: num('dayScore') ?? 0,
    points: num('points') ?? 0,
    totalTimeMs: num('totalTimeMs') ?? 0,
    dummy: r.dummy === true,
  }
}

export async function fetchLeaderboard(sort: LeaderboardSort = 'total') {
  return fetchLeaderboardCached(sort, false)
}

export async function fetchQuizLeaderboard(quizId: string) {
  return fetchQuizLeaderboardCached(quizId, false)
}

const LEADERBOARD_TTL_MS = 30_000
const LEADERBOARD_CACHE_PREFIX = 'nserve_lb:'
const leaderboardMemCache = new Map<string, { at: number; data: LeaderboardEntryDto[] }>()

function readLeaderboardCache(key: string): LeaderboardEntryDto[] | null {
  const mem = leaderboardMemCache.get(key)
  const now = Date.now()
  if (mem && now - mem.at < LEADERBOARD_TTL_MS) return mem.data
  try {
    const raw = sessionStorage.getItem(LEADERBOARD_CACHE_PREFIX + key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { at: number; data: LeaderboardEntryDto[] }
    if (!parsed || !Array.isArray(parsed.data)) return null
    if (now - Number(parsed.at || 0) >= LEADERBOARD_TTL_MS) return null
    leaderboardMemCache.set(key, { at: parsed.at, data: parsed.data })
    return parsed.data
  } catch {
    return null
  }
}

function writeLeaderboardCache(key: string, data: LeaderboardEntryDto[]) {
  const payload = { at: Date.now(), data }
  leaderboardMemCache.set(key, payload)
  try {
    sessionStorage.setItem(LEADERBOARD_CACHE_PREFIX + key, JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}

export function clearLeaderboardCache() {
  leaderboardMemCache.clear()
  try {
    const keys = Object.keys(sessionStorage)
    for (const k of keys) {
      if (k.startsWith(LEADERBOARD_CACHE_PREFIX)) sessionStorage.removeItem(k)
    }
  } catch {
    /* ignore */
  }
}

export async function fetchLeaderboardCached(
  sort: LeaderboardSort = 'total',
  forceRefresh = false,
): Promise<LeaderboardEntryDto[]> {
  const key = `global:${sort}`
  if (!forceRefresh) {
    const cached = readLeaderboardCache(key)
    if (cached) return cached
  }
  const { data } = await api.get<unknown[]>('/leaderboard', { params: { sort } })
  const normalized = Array.isArray(data) ? data.map(normalizeLeaderboardEntry) : []
  writeLeaderboardCache(key, normalized)
  return normalized
}

export async function fetchQuizLeaderboardCached(
  quizId: string,
  forceRefresh = false,
): Promise<LeaderboardEntryDto[]> {
  const key = `quiz:${quizId}`
  if (!forceRefresh) {
    const cached = readLeaderboardCache(key)
    if (cached) return cached
  }
  const { data } = await api.get<unknown[]>(`/leaderboard/quiz/${quizId}`)
  const normalized = Array.isArray(data) ? data.map(normalizeLeaderboardEntry) : []
  writeLeaderboardCache(key, normalized)
  return normalized
}

export async function fetchMyRank(sort: LeaderboardSort = 'total'): Promise<number> {
  try {
    const { data } = await api.get<{ rank: number }>('/leaderboard/my-rank', { params: { sort } })
    return data.rank
  } catch {
    return 0
  }
}
