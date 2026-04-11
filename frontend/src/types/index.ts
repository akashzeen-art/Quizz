export type MediaType = 'image' | 'video' | 'gif' | 'audio' | 'none'
export type InputType = 'mcq4' | 'binary' | 'mcq3' | 'slider'

export interface QuestionDto {
  id: string
  questionText: string
  mediaUrl?: string
  mediaType: MediaType
  inputType: InputType
  options: string[]
  category: string
  /** Maps this item to part of the quiz source document (if used). */
  documentReference?: string
}

export interface QuizDto {
  id: string
  title: string
  description: string
  status: 'live' | 'upcoming' | 'ended'
  startsAt?: string
  /** Optional event window end (ISO). */
  endsAt?: string
  questionCount: number
  /** Optional material admins attach so questions align with it. */
  referenceDocumentUrl?: string
  referenceDocumentName?: string
}

export interface QuizDetailDto {
  quiz: QuizDto
  questions: QuestionDto[]
}

export interface UserProfileDto {
  id: string
  displayName: string
  email?: string
  phone?: string
  totalScore: number
  weeklyScore: number
  monthlyScore: number
  points: number
  dayScore: number
  /** Wallet balance (quiz starts cost credits). */
  credits: number
  /** Lifetime credits spent. */
  totalSpent: number
  categories: string[]
  playedDates: string[]
  /** City / region label (optional). */
  location?: string
  /** Path served under `/files/...` after gallery upload. */
  profilePhotoUrl?: string
  /** Dicebear / preset avatar seed. */
  avatarKey?: string
  planType: string
  planStatus: string
  profileUpdatedAt?: string
}

export type LeaderboardSort = 'total' | 'weekly' | 'monthly' | 'points'

export interface LeaderboardEntryDto {
  rank: number
  displayName: string
  userId: string
  totalScore: number
  weeklyScore: number
  monthlyScore: number
  points: number
}

export interface SubmitAnswerResponse {
  correct: boolean
  timedOut: boolean
  pointsEarned: number
  feedbackMessage: string
  totalScore: number
  correctAnswerIndex?: number | null
}
