import { isCategoryCountValid } from '../constants/categories'
import type { UserProfileDto } from '../types'

const KEY = 'nserve_categories'

export function persistUserCategories(categories: string[] | undefined | null) {
  if (!categories || !isCategoryCountValid(categories.length)) return
  try {
    localStorage.setItem(KEY, JSON.stringify(categories))
  } catch {
    /* ignore quota */
  }
}

export function loadStoredCategories(): string[] | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return null
    const cats = arr.map(String)
    return isCategoryCountValid(cats.length) ? cats : null
  } catch {
    return null
  }
}

export function clearStoredCategories() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

/** Prefer API categories; if missing/invalid, restore from last known good local snapshot. */
export function mergeProfileCategories(p: UserProfileDto): UserProfileDto {
  let categories = p.categories
  if (!isCategoryCountValid(categories.length)) {
    const stored = loadStoredCategories()
    if (stored) categories = stored
  }
  if (isCategoryCountValid(categories.length)) {
    persistUserCategories(categories)
  }
  return { ...p, categories }
}
