import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowDownCircle, ArrowUpCircle, Coins, Plus, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import * as api from '../api/client'
import type { CreditTransaction } from '../api/client'
import { useApp } from '../context/AppContext'
import { AppBottomNav } from './AppBottomNav'
import { canJoinQuiz } from '../lib/quizEvents'
import { Skeleton } from './ui/Skeleton'

const QUICK_AMOUNTS = [25, 50, 100, 200]

export function WalletScreen() {
  const navigate = useNavigate()
  const { user, refreshProfile } = useApp()
  const [transactions, setTransactions] = useState<CreditTransaction[] | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [rupees, setRupees] = useState('50')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.fetchWalletTransactions()
      .then(setTransactions)
      .catch(() => setTransactions([]))
  }, [user?.walletPaise])

  async function handleAdd() {
    const amt = Math.floor(Number(rupees) || 0)
    if (amt < 1) { toast.error('Enter at least ₹1'); return }
    setBusy(true)
    try {
      await api.addWalletCredits({ amountRupees: amt })
      await refreshProfile()
      toast.success(`Added ₹${amt} to wallet`)
      setAddOpen(false)
      setRupees('50')
    } catch (e) {
      toast.error(api.getApiErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function onPlay() {
    try {
      const list = await api.fetchQuizList()
      const hit = list.find((q) => canJoinQuiz(q))
      if (hit) navigate(`/quiz/${hit.id}/loading`)
      else toast.message('No joinable quiz right now')
    } catch { toast.error('Could not load quizzes') }
  }

  const walletRupees = user?.walletRupees ?? 0
  const totalSpentPaise = user?.totalSpentPaise ?? 0
  const currencySymbol =
    typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('en-us')
      ? '$'
      : '₹'

  return (
    <div className="app-screen min-h-[100dvh] pb-bottom-nav">
      {/* Header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-950 px-4 pb-8 shadow-[0_12px_40px_-8px_rgba(91,33,182,0.35)] safe-pt-header">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 left-10 h-32 w-32 rounded-full bg-amber-400/20 blur-2xl" />

        <div className="relative flex items-center justify-between gap-3">
          <button
            type="button"
            aria-label="Back"
            className="rounded-xl p-2 text-white hover:bg-white/10"
            onClick={() => navigate('/home')}
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <span className="text-sm font-bold text-white/80">My Wallet</span>
          <div className="w-10" />
        </div>

        {/* Balance card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mt-5 rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Wallet Balance</p>
          <div className="mt-1 flex items-end gap-2">
            <Coins className="mb-1 h-7 w-7 text-amber-300" />
            <p className="tabular-nums leading-none">
              <span className="text-5xl font-extrabold text-white">
                {currencySymbol}{walletRupees.toFixed(2)}
              </span>
            </p>
          </div>
          <p className="mt-2 text-xs text-white/50">Lifetime spent: {currencySymbol}{(totalSpentPaise / 100).toFixed(2)}</p>

          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-xs text-white/70">
            <span>Quiz entry: ₹10</span>
            <span className="mx-1 opacity-40">·</span>
            <span>Correct: +₹1</span>
            <span className="mx-1 opacity-40">·</span>
            <span>Wrong: -₹0.10</span>
          </div>

          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-bold text-violet-700 shadow-lg transition hover:bg-violet-50 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Add Money
          </button>
        </motion.div>
      </header>

      {/* Transaction history */}
      <div className="px-4 pt-5">
        <h2 className="mb-3 text-sm font-bold text-slate-700">Transaction History</h2>

        {transactions === null ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-slate-400">
            <Coins className="mx-auto mb-2 h-8 w-8 opacity-30" />
            <p className="text-sm font-medium">No transactions yet</p>
            <p className="mt-1 text-xs">Add credits to get started</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {transactions.map((tx, i) => {
              const isAdd = tx.type === 'credit_added'
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0"
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isAdd ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                    {isAdd
                      ? <ArrowDownCircle className="h-5 w-5 text-emerald-600" />
                      : <ArrowUpCircle className="h-5 w-5 text-rose-500" />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{tx.description}</p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(tx.createdAt).toLocaleString()} · Balance: {tx.balanceAfter}
                    </p>
                  </div>
                  <span className={`shrink-0 text-sm font-extrabold tabular-nums ${isAdd ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {isAdd ? '+' : '-'}{tx.amount}
                  </span>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      <AppBottomNav
        active="wallet"
        onPlay={onPlay}
      />

      {/* Add Credits modal */}
      <AnimatePresence>
        {addOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { if (!busy) setAddOpen(false) }}
            />
            <motion.div
              className="fixed inset-x-4 bottom-4 z-50 rounded-3xl bg-white p-5 shadow-2xl sm:inset-x-auto sm:left-1/2 sm:w-full sm:max-w-sm sm:-translate-x-1/2"
              initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            >
              <h3 className="text-lg font-extrabold text-slate-900">Add Money</h3>
              <p className="mt-1 text-xs text-slate-500">₹1 added directly to your wallet</p>

              {/* Quick amounts */}
              <div className="mt-4 grid grid-cols-4 gap-2">
                {QUICK_AMOUNTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setRupees(String(a))}
                    className={`rounded-xl border py-2 text-sm font-bold transition ${
                      rupees === String(a)
                        ? 'border-violet-500 bg-violet-600 text-white'
                        : 'border-slate-200 text-slate-700 hover:border-violet-300'
                    }`}
                  >
                    ₹{a}
                  </button>
                ))}
              </div>

              <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Custom amount (₹)
              </label>
              <input
                type="number" min={1} inputMode="numeric"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base font-semibold text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
                value={rupees}
                onChange={(e) => setRupees(e.target.value)}
                disabled={busy}
              />
              <p className="mt-1.5 text-sm font-semibold text-violet-700">
                ₹{Math.max(0, Math.floor(Number(rupees) || 0))} will be added to wallet
              </p>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  disabled={busy}
                  onClick={() => setAddOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-md disabled:opacity-50"
                  disabled={busy}
                  onClick={() => void handleAdd()}
                >
                  {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Add'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
