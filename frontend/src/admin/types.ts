export type AdminQuizStatus = 'live' | 'upcoming' | 'ended'

export interface AdminStats {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  totalQuizzes: number
  totalQuestions: number
  activeWindowMinutes: number
}

export interface ChartPoint {
  date: string
  value: number
}

export interface AdminCharts {
  participationByDay: ChartPoint[]
  activeUsersByDay: ChartPoint[]
}

export interface AdminUserRow {
  id: string
  displayName: string
  email?: string
  phone?: string
  status: string
  totalScore: number
  lastActiveAt?: string
}

export interface AdminUserPage {
  content: AdminUserRow[]
  totalElements: number
  totalPages: number
  page: number
  size: number
}

export interface AdminQuizSummary {
  id: string
  title: string
  category: string
  questionCount: number
  createdAt?: string
}

export interface CsvUploadResult {
  questionsUploaded: number
  quizSetsCreated: number
  releasedSetNumber: number
  errors: string[]
}
