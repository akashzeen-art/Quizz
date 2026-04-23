import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'

const RULES = [
  {
    icon: '🧠',
    title: 'Questions',
    text: 'Questions are set based on regional content preferences and proficiency. Each question may consist of a few options or an input method to register your response.',
  },
  {
    icon: '🏆',
    title: 'Scoring',
    text: 'Each question answered correctly provides +10 points, and deducts -1 point when answered incorrectly. Unanswered questions score 0.',
  },
  {
    icon: '💰',
    title: 'Wallet & Credits',
    text: 'Your wallet balance can be positive, negative, or zero. To enter a quiz, a minimum of 10 credits are required. Pay-in facility is available to all players.',
  },
  {
    icon: '💸',
    title: 'Withdrawal',
    text: 'Cash-out is available in multiples of 500 only (e.g. ₹500, ₹1000, ₹1500) to ensure a fair chance of gameplay for all users in a competitive environment.',
  },
  {
    icon: '📊',
    title: 'Leaderboard Score',
    text: 'Your score is driven by activity, accuracy, and credits in the game. Play more to answer skill-based questions and win more.',
  },
  {
    icon: '⚖️',
    title: 'Tie-Breaker',
    text: 'In case of a tie, we use robust tie-breaker services by easypromos™ under GLI-19 v3.0 standard for fair play.',
  },
]

export function RulesModal({ onConfirm }: { onConfirm: () => void }) {
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleConfirm() {
    if (!checked || busy) return
    setBusy(true)
    await onConfirm()
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center p-4">
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 24, stiffness: 300 }}
        className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200/80 flex flex-col"
        style={{ maxHeight: '90dvh' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-xl">
            🎮
          </div>
          <div className="flex-1">
            <h2 className="text-base font-extrabold text-slate-900">Rules of the Game</h2>
            <p className="text-xs text-slate-500">Please read before you start playing</p>
          </div>
        </div>

        {/* Rules list */}
        <div className="overflow-y-auto px-5 py-4 space-y-3 flex-1">
          {RULES.map((rule) => (
            <div key={rule.title} className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5">
              <span className="text-xl shrink-0 mt-0.5">{rule.icon}</span>
              <div>
                <p className="text-sm font-bold text-slate-900">{rule.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{rule.text}</p>
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3.5 text-xs leading-relaxed text-violet-800">
            <span className="font-bold">Operator:</span> nServeTechnology FZ LLC · Ras Al Khaimah, UAE<br />
            <span className="font-bold">Support:</span> info@nservetechnology.com
          </div>
        </div>

        {/* Confirm section */}
        <div className="border-t border-slate-100 px-5 py-4 space-y-3 shrink-0">
          <label className="flex items-start gap-3 cursor-pointer">
            <div
              onClick={() => setChecked((v) => !v)}
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${checked ? 'border-violet-600 bg-violet-600' : 'border-slate-300 bg-white'}`}
            >
              {checked && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
            </div>
            <span className="text-xs leading-relaxed text-slate-700">
              I have read and understood the Rules of the Game and agree to play by these rules.
            </span>
          </label>

          <button
            type="button"
            disabled={!checked || busy}
            onClick={() => void handleConfirm()}
            className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-md shadow-violet-500/25 transition hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? 'Saving…' : 'I Confirm — Let\'s Play! 🚀'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
