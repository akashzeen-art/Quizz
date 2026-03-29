import { AnimatePresence, motion } from 'framer-motion'
import { MapPin, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { PRESET_LOCATIONS } from '../constants/locations'

type Props = {
  open: boolean
  onClose: () => void
  initial?: string
  onSave: (location: string) => Promise<void>
}

export function LocationPickerSheet({ open, onClose, initial, onSave }: Props) {
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setQuery('')
    }
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return PRESET_LOCATIONS
    return PRESET_LOCATIONS.filter((s) => s.toLowerCase().includes(q))
  }, [query])

  async function save(value: string) {
    const v = value.trim()
    setBusy(true)
    try {
      await onSave(v)
      onClose()
    } catch {
      /* error surfaced in parent (toast); keep sheet open */
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-labelledby="location-sheet-title"
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl safe-pb"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 pb-3 safe-pt-sticky">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="location-sheet-title" className="text-base font-bold text-slate-900">
                    Choose your location
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Pick a city from the list — saved with your profile.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  placeholder="Search cities…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="max-h-[48vh] overflow-y-auto px-2 py-2">
              {filtered.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  No matches — try a different search.
                </p>
              ) : (
                filtered.map((city) => {
                  const selected = initial?.trim() === city
                  return (
                    <button
                      key={city}
                      type="button"
                      disabled={busy}
                      onClick={() => void save(city)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium disabled:opacity-50 ${
                        selected
                          ? 'bg-violet-100 text-violet-900'
                          : 'text-slate-800 hover:bg-violet-50'
                      }`}
                    >
                      <MapPin className="h-4 w-4 shrink-0 text-violet-500" />
                      {city}
                    </button>
                  )
                })
              )}
            </div>

            <div className="border-t border-slate-100 px-4 py-4">
              <button
                type="button"
                disabled={busy}
                className="w-full rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                onClick={() => {
                  void save('')
                }}
              >
                Clear location
              </button>
              {initial?.trim() &&
                !PRESET_LOCATIONS.includes(initial.trim()) && (
                  <p className="mt-2 text-center text-[10px] text-amber-700">
                    Your saved place isn&apos;t on this list — tap a city above or clear.
                  </p>
                )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
