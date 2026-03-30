import { isCategoryCountValid } from '../constants/categories'
import type { UserProfileDto } from '../types'

function keyForUser(userId: string): string {
  return `nserve_categories_onboarding_seen:${userId}`
}

export function hasSeenCategoryOnboarding(userId: string): boolean {
  try {
    return localStorage.getItem(keyForUser(userId)) === '1'
  } catch {
    return false
  }
}

export function markCategoryOnboardingSeen(userId: string) {
  try {
    localStorage.setItem(keyForUser(userId), '1')
  } catch {
    /* ignore */
  }
}

/** Show category onboarding only once if categories are currently missing/invalid. */
export function shouldForceCategoryOnboarding(user: UserProfileDto | null | undefined): boolean {
  if (!user) return false
  if (isCategoryCountValid(user.categories?.length ?? 0)) return false
  return !hasSeenCategoryOnboarding(user.id)
}
