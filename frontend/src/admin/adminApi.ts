import axios, { isAxiosError } from 'axios'
import type {
  AdminCharts,
  AdminQuizSummary,
  AdminStats,
  AdminUserPage,
} from './types'

const baseURL = import.meta.env.VITE_API_URL || '/api'

export const adminApi = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

adminApi.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

const TOKEN_KEY = 'nserve_admin_jwt'

export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAdminToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
    adminApi.defaults.headers.common.Authorization = `Bearer ${token}`
  } else {
    localStorage.removeItem(TOKEN_KEY)
    delete adminApi.defaults.headers.common.Authorization
  }
}

export function initAdminApiAuth() {
  const t = getAdminToken()
  if (t) adminApi.defaults.headers.common.Authorization = `Bearer ${t}`
}

adminApi.interceptors.request.use((config) => {
  const t = getAdminToken()
  if (t) config.headers.Authorization = `Bearer ${t}`
  return config
})

adminApi.interceptors.response.use(
  (r) => r,
  (err) => {
    if (isAxiosError(err) && err.response?.status === 401) {
      setAdminToken(null)
      if (!window.location.pathname.startsWith('/admin/login')) {
        window.location.href = '/admin/login'
      }
    }
    return Promise.reject(err)
  },
)

export async function adminLogin(email: string, password: string) {
  const { data } = await axios.post<{ accessToken: string }>(
    `${baseURL}/admin/login`,
    { email, password },
  )
  setAdminToken(data.accessToken)
  return data
}

export async function fetchAdminStats() {
  const { data } = await adminApi.get<AdminStats>('/admin/stats')
  return data
}

export async function fetchAdminCharts(days = 14) {
  const { data } = await adminApi.get<AdminCharts>('/admin/stats/charts', {
    params: { days },
  })
  return data
}

export async function fetchAdminUsers(params: {
  search?: string
  status?: 'all' | 'active' | 'inactive'
  page?: number
  size?: number
}) {
  const { data } = await adminApi.get<AdminUserPage>('/admin/users', { params })
  return data
}

export async function fetchAdminQuizzes() {
  const { data } = await adminApi.get<AdminQuizSummary[]>('/admin/quiz/list')
  return data
}

export async function deleteAdminQuiz(id: string) {
  await adminApi.delete(`/admin/quiz/${id}`)
}

export async function uploadAdminMedia(file: File) {
  const fd = new FormData()
  fd.append('file', file)
  const { data } = await adminApi.post<{ url: string }>('/admin/media/upload', fd)
  return data.url
}

/** PDF, DOC, DOCX, TXT — attached as the quiz source material for questions. */
export async function uploadAdminDocument(file: File) {
  const fd = new FormData()
  fd.append('file', file)
  const { data } = await adminApi.post<{ url: string }>(
    '/admin/media/upload-document',
    fd,
  )
  return data.url
}

export async function createAdminQuiz(body: unknown) {
  const { data } = await adminApi.post<AdminQuizSummary>('/admin/quiz/create', body)
  return data
}

export function adminApiError(err: unknown): string {
  if (isAxiosError(err)) {
    const d = err.response?.data as { error?: string } | undefined
    if (d?.error) return d.error
  }
  return 'Request failed'
}
