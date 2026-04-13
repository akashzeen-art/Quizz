import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'

type Props = {
  active: boolean
  justActivated: boolean
  secondsLeft?: number
}

export function BoosterBanner({ active, justActivated, secondsLeft }: Props) {
  const [showActivation, setShowActivation] = useState(false)

  useEffect(() => {
    if (justActivated) {
      setShowActivation(true)
      const t = setTimeout(() => setShowActivation(false), 3000)
      return () => clearTimeout(t)
    }
  }, [justActivated])

  return (
    <>
      {/* Activation splash — shows for 3s when booster triggers */}
      <AnimatePresence>
        {showActivation && (
          <motion.div
            key="booster-splash"
            className="fixed inset-x-0 top-0 z-50 flex items-center justify-center safe-pt-header"
            initial={{ opacity: 0, y: -60, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -60, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="mx-4 mt-2 flex items-center gap-3 rounded-2xl border border-orange-300 bg-gradient-to-r from-orange-500 to-red-500 px-5 py-3 shadow-2xl shadow-orange-500/40">
              <motion.span
                className="text-2xl"
                animate={{ rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.3, 1] }}
                transition={{ duration: 0.6, repeat: 3 }}
              >
                🔥
              </motion.span>
              <div>
                <p className="text-sm font-extrabold text-white">Score Booster Activated!</p>
                <p className="text-xs font-medium text-white/80">×2 points for next {secondsLeft ?? 600}s</p>
              </div>
              <motion.span
                className="text-2xl"
                animate={{ rotate: [0, 15, -15, 10, -10, 0], scale: [1, 1.3, 1] }}
                transition={{ duration: 0.6, repeat: 3 }}
              >
                🔥
              </motion.span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent pill — shows while booster is active */}
      <AnimatePresence>
        {active && !showActivation && (
          <motion.div
            key="booster-pill"
            className="fixed right-4 top-20 z-40"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
          >
            <motion.div
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-3 py-1.5 shadow-lg shadow-orange-500/30"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <span className="text-sm">🔥</span>
              <span className="text-xs font-extrabold text-white">×2</span>
              {secondsLeft !== undefined && secondsLeft > 0 && (
                <span className="text-[10px] font-semibold text-white/80">{secondsLeft}s</span>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
