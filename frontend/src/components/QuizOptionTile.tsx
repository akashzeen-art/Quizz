import { motion } from 'framer-motion'
import { Check, Volume2, X } from 'lucide-react'
import type { MediaType } from '../types'

export type OptionVisualState = 'idle' | 'correct' | 'wrongPick' | 'dim'

export function optionVisualState(
  i: number,
  correctIdx: number | null | undefined,
  selectedIdx: number | undefined,
  revealed: boolean,
  timedOut: boolean,
): OptionVisualState {
  if (!revealed || correctIdx === undefined || correctIdx === null) return 'idle'
  // Always highlight the correct answer after reveal (including timeout)
  if (correctIdx === i) return 'correct'
  // Only highlight wrong pick if user actually selected this tile (not timeout)
  if (!timedOut && selectedIdx === i) return 'wrongPick'
  return 'dim'
}

export const NEUTRAL_TILES = [
  'border-slate-200/90 bg-slate-100 text-slate-900 hover:border-slate-300 hover:bg-slate-200/90',
  'border-stone-200/90 bg-stone-100 text-stone-900 hover:border-stone-300 hover:bg-stone-200/90',
  'border-zinc-200/90 bg-zinc-100 text-zinc-900 hover:border-zinc-300 hover:bg-zinc-200/90',
  'border-neutral-200/90 bg-neutral-100 text-neutral-900 hover:border-neutral-300 hover:bg-neutral-200/90',
]

// ── OptionTile ────────────────────────────────────────────────────────────────

type TileProps = {
  label: string
  idleClass: string
  visual: OptionVisualState
  disabled: boolean
  large?: boolean
  burgerStyle?: boolean
  onClick: () => void
}

export function OptionTile({ label, idleClass, visual, disabled, large, burgerStyle, onClick }: TileProps) {
  const reveal = visual !== 'idle'
  const stateClass =
    visual === 'correct'   ? 'border-green-700 bg-green-700 text-white ring-2 ring-green-600 shadow-lg shadow-green-700/35'
    : visual === 'wrongPick' ? 'border-red-600 bg-red-600 text-white ring-2 ring-red-500 shadow-md shadow-red-500/30'
    : visual === 'dim'       ? 'border-slate-200/60 bg-slate-50 text-slate-400 opacity-60'
    : idleClass

  return (
    <motion.button
      type="button"
      disabled={disabled}
      initial={false}
      animate={
        visual === 'correct'   ? { scale: [1, 1.04, 1], transition: { duration: 0.45 } }
        : visual === 'wrongPick' ? { x: [0, -4, 4, -3, 3, 0], transition: { duration: 0.4 } }
        : {}
      }
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      className={`relative w-full rounded-2xl border px-3 text-sm font-bold leading-snug shadow-sm transition ${stateClass} ${
        burgerStyle ? 'min-h-[96px] px-5 py-4 text-center text-base'
        : large      ? 'min-h-[120px] py-6 text-base text-center'
        :              'min-h-[88px] py-4 text-center'
      } disabled:cursor-default`}
    >
      {visual === 'correct' && (
        <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-green-900 text-white shadow-md ring-2 ring-white">
          <Check className="h-4 w-4" strokeWidth={3} />
        </span>
      )}
      {visual === 'wrongPick' && (
        <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-700 text-white shadow-md ring-2 ring-white">
          <X className="h-4 w-4" strokeWidth={3} />
        </span>
      )}
      <span className={reveal ? 'pr-7' : ''}>{label}</span>
    </motion.button>
  )
}

// ── MediaBlock ────────────────────────────────────────────────────────────────

export function MediaBlock({ mediaType, url }: { mediaType: MediaType; url?: string }) {
  if (!url || mediaType === 'none') return null

  if (mediaType === 'image' || mediaType === 'gif') {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="mt-4 overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50 shadow-inner ring-1 ring-slate-100">
        <img src={url} alt="" className="max-h-56 w-full object-cover" />
      </motion.div>
    )
  }
  if (mediaType === 'video') {
    return (
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/90 bg-black shadow-sm ring-1 ring-slate-200/50">
        <video src={url} className="max-h-56 w-full" controls playsInline />
      </div>
    )
  }
  if (mediaType === 'audio') {
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className="mt-4 rounded-3xl border border-violet-200/80 bg-gradient-to-b from-violet-50/90 to-white p-6 text-center shadow-sm ring-1 ring-violet-100/60">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/30">
          <Volume2 className="h-8 w-8" />
        </div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-violet-700/90">Listen carefully</p>
        <audio src={url} controls className="w-full accent-violet-600" />
      </motion.div>
    )
  }
  return null
}
