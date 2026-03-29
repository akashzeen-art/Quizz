import { useMemo, useState } from 'react'

/** Prefer video background when connection looks fast enough (mockup: network quality). */
export function usePreferVideo() {
  const [prefer] = useState(() => {
    if (typeof navigator === 'undefined') return true
    const conn = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string }
      }
    ).connection
    if (conn?.saveData) return false
    if (conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g') {
      return false
    }
    return true
  })

  return useMemo(() => prefer, [prefer])
}
