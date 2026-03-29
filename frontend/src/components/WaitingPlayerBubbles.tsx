import { motion } from 'framer-motion'

const PLAYERS = [
  { name: 'Andrew', bg: 'bg-sky-500' },
  { name: 'Clinton', bg: 'bg-amber-500' },
  { name: 'Tyra', bg: 'bg-rose-500' },
  { name: 'Pedro', bg: 'bg-emerald-500' },
  { name: 'Leif', bg: 'bg-violet-500' },
  { name: 'Freida', bg: 'bg-orange-500' },
]

function initials(n: string) {
  return n
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function WaitingPlayerBubbles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {PLAYERS.map((p, i) => (
        <motion.div
          key={p.name}
          className="absolute flex items-center gap-2 rounded-full border border-white/25 bg-white/15 py-1.5 pl-1.5 pr-3 shadow-lg backdrop-blur-md"
          style={{
            left: `${8 + (i * 17) % 72}%`,
            top: `${42 + (i % 3) * 8}%`,
          }}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{
            opacity: 1,
            y: [0, -6, 0],
            x: [0, i % 2 === 0 ? 8 : -8, 0],
          }}
          transition={{
            opacity: { delay: i * 0.08 },
            y: { duration: 3 + i * 0.2, repeat: Infinity, ease: 'easeInOut' },
            x: { duration: 4 + i * 0.15, repeat: Infinity, ease: 'easeInOut' },
          }}
        >
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${p.bg}`}
          >
            {initials(p.name)}
          </span>
          <span className="max-w-[100px] truncate text-xs font-semibold text-white">
            {p.name}
          </span>
        </motion.div>
      ))}
    </div>
  )
}
