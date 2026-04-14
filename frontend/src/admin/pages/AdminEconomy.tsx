import { useEffect, useState } from 'react'
import { Loader2, Save, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { adminApi, adminApiError } from '../adminApi'

interface EconomyConfig {
  quizStartCost: number
  creditsPerRupee: number
  starterCredits: number
  correctPoints: number
  wrongPoints: number
  timeoutPoints: number
  boosterMultiplier: number
  boosterDurationMinutes: number
  boosterConsecutiveWrongTrigger: number
  boosterInactivityHoursTrigger: number
  boosterBottomPercentTrigger: number
}

const DEFAULTS: EconomyConfig = {
  quizStartCost: 10,
  creditsPerRupee: 2,
  starterCredits: 100,
  correctPoints: 10,
  wrongPoints: -2,
  timeoutPoints: 0,
  boosterMultiplier: 2,
  boosterDurationMinutes: 10,
  boosterConsecutiveWrongTrigger: 2,
  boosterInactivityHoursTrigger: 24,
  boosterBottomPercentTrigger: 0.40,
}

function Field({
  label, hint, value, onChange, min, max, step = 1,
}: {
  label: string; hint: string; value: number
  onChange: (v: number) => void; min: number; max: number; step?: number
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-200">{label}</label>
        <span className="rounded-lg bg-violet-600/20 px-2 py-0.5 text-sm font-bold tabular-nums text-violet-300">
          {value}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-violet-500"
      />
      <p className="text-[11px] text-slate-500">{hint}</p>
    </div>
  )
}

export default function AdminEconomy() {
  const [cfg, setCfg] = useState<EconomyConfig>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    adminApi.get<EconomyConfig>('/admin/economy')
      .then(r => setCfg(r.data))
      .catch(() => toast.error('Could not load economy config'))
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    try {
      const { data } = await adminApi.put<EconomyConfig>('/admin/economy', cfg)
      setCfg(data)
      toast.success('Economy settings saved')
    } catch (e) {
      toast.error(adminApiError(e))
    } finally {
      setSaving(false)
    }
  }

  function set(key: keyof EconomyConfig, val: number) {
    setCfg(prev => ({ ...prev, [key]: val }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Economy Control</h1>
          <p className="mt-1 text-sm text-slate-400">Configure quiz cost, scoring rules, and booster triggers</p>
        </div>
        <div className="flex gap-2">
          <button type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700"
            onClick={() => setCfg(DEFAULTS)}>
            <RotateCcw className="h-4 w-4" /> Reset defaults
          </button>
          <button type="button" disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-500 disabled:opacity-50"
            onClick={() => void save()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Wallet */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400">💰 Wallet</h2>
          <Field label="Quiz start cost" hint="Credits deducted per quiz attempt"
            value={cfg.quizStartCost} onChange={v => set('quizStartCost', v)} min={1} max={100} />
          <Field label="Credits per ₹1" hint="₹50 = 100 credits at rate 2"
            value={cfg.creditsPerRupee} onChange={v => set('creditsPerRupee', v)} min={1} max={10} />
          <Field label="Starter credits" hint="Free credits given on first login"
            value={cfg.starterCredits} onChange={v => set('starterCredits', v)} min={0} max={500} step={10} />
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3 text-xs text-slate-400 space-y-1">
            <p>₹50 → <span className="text-white font-bold">{50 * cfg.creditsPerRupee} credits</span></p>
            <p>₹100 → <span className="text-white font-bold">{100 * cfg.creditsPerRupee} credits</span></p>
            <p>Quizzes per ₹50 → <span className="text-white font-bold">{Math.floor(50 * cfg.creditsPerRupee / cfg.quizStartCost)}</span></p>
          </div>
        </div>

        {/* Scoring */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-400">🎯 Scoring</h2>
          <Field label="Correct answer points" hint="Points awarded for correct answer"
            value={cfg.correctPoints} onChange={v => set('correctPoints', v)} min={1} max={50} />
          <Field label="Wrong answer penalty" hint="Points deducted for wrong answer (negative)"
            value={cfg.wrongPoints} onChange={v => set('wrongPoints', v)} min={-20} max={0} />
          <Field label="Timeout points" hint="Points for unanswered question (usually 0)"
            value={cfg.timeoutPoints} onChange={v => set('timeoutPoints', v)} min={-10} max={5} />
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3 text-xs text-slate-400 space-y-1">
            <p>All correct (10q) → <span className="text-emerald-400 font-bold">+{10 * cfg.correctPoints} pts</span></p>
            <p>All wrong (10q) → <span className="text-rose-400 font-bold">{10 * cfg.wrongPoints} pts</span></p>
            <p>With booster → <span className="text-amber-400 font-bold">+{10 * cfg.correctPoints * cfg.boosterMultiplier} pts</span></p>
          </div>
        </div>

        {/* Booster */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-orange-400">🔥 Booster</h2>
          <Field label="Score multiplier" hint="Multiplier applied to correct answers"
            value={cfg.boosterMultiplier} onChange={v => set('boosterMultiplier', v)} min={1} max={5} />
          <Field label="Duration (minutes)" hint="How long booster stays active"
            value={cfg.boosterDurationMinutes} onChange={v => set('boosterDurationMinutes', v)} min={1} max={60} />
          <Field label="Consecutive wrong trigger" hint="Wrong answers in a row to trigger booster"
            value={cfg.boosterConsecutiveWrongTrigger} onChange={v => set('boosterConsecutiveWrongTrigger', v)} min={1} max={10} />
          <Field label="Inactivity trigger (hours)" hint="Hours inactive before booster triggers"
            value={cfg.boosterInactivityHoursTrigger} onChange={v => set('boosterInactivityHoursTrigger', v)} min={1} max={168} />
          <Field label="Bottom % trigger" hint="Bottom X% of ranked users get booster"
            value={Math.round(cfg.boosterBottomPercentTrigger * 100)}
            onChange={v => set('boosterBottomPercentTrigger', v / 100)} min={10} max={80} step={5} />
        </div>
      </div>
    </div>
  )
}
