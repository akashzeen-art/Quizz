export const QUIZ_CATEGORIES = [
  { id: 'music', label: 'Music', emoji: '🎵' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'food', label: 'Food', emoji: '🍕' },
  { id: 'art', label: 'Art', emoji: '🎨' },
  { id: 'science', label: 'Science', emoji: '🔬' },
  { id: 'movies', label: 'Movies', emoji: '🎬' },
  { id: 'history', label: 'History', emoji: '📜' },
  { id: 'geography', label: 'Geography', emoji: '🌍' },
] as const

/** Minimum interests required before continuing. */
export const MIN_CATEGORY_COUNT = 5

/** Maximum interests (all options in {@link QUIZ_CATEGORIES}). */
export const MAX_CATEGORY_COUNT = QUIZ_CATEGORIES.length

export function isCategoryCountValid(count: number): boolean {
  return count >= MIN_CATEGORY_COUNT && count <= MAX_CATEGORY_COUNT
}
