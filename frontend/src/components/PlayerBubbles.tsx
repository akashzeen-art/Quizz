import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { WINNER_NAMES } from '../constants/bubbles'

function pickRandom(arr: string[], n: number) {
  const copy = [...arr]
  const out: string[] = []
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(Math.random() * copy.length)
    out.push(copy.splice(idx, 1)[0]!)
  }
  return out
}

export function PlayerBubbles({ count = 8 }: { count?: number }) {
  const names = useMemo(() => pickRandom(WINNER_NAMES, count), [count])

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {names.map((name, i) => (
        <motion.div
          key={`${name}-${i}`}
          className="absolute max-w-[min(200px,45vw)] rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white/90 shadow-lg backdrop-blur-md"
          initial={{
            x: `${10 + (i * 37) % 80}%`,
            y: '110%',
            opacity: 0,
            scale: 0.85,
          }}
          animate={{
            y: '-20%',
            opacity: [0, 1, 1, 0],
            scale: [0.85, 1, 1, 0.9],
            x: `${8 + (i * 41) % 84}%`,
          }}
          transition={{
            duration: 10 + (i % 5),
            repeat: Infinity,
            delay: i * 1.2,
            ease: 'linear',
          }}
        >
          {name}
        </motion.div>
      ))}
    </div>
  )
}
