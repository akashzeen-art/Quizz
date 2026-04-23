import { useState } from 'react'
import { ArrowRight, ChevronLeft, User } from 'lucide-react'
import { dicebearUrl } from '../../constants/avatars'

export function StepProfile({
  busy,
  avatarChoices,
  onDone,
  onBack,
}: {
  busy: boolean
  avatarChoices: string[]
  onDone: (name: string, gameTag: string, avatarKey: string) => void
  onBack: () => void
}) {
  const [name, setName] = useState('')
  const [gameTag, setGameTag] = useState('')
  const [avatarKey, setAvatarKey] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Full name is required'
    const tag = gameTag.trim().replace(/\s+/g, '').replace(/[^A-Za-z0-9_]/g, '')
    if (tag.length < 4) e.gameTag = 'Game tag must be at least 4 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    const tag = gameTag.trim().replace(/\s+/g, '').replace(/[^A-Za-z0-9_]/g, '')
    onDone(name.trim(), tag, avatarKey)
  }

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <button type="button" onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 text-slate-600 hover:bg-slate-50">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Your Profile</h1>
          <p className="text-xs text-slate-500">Almost done! Set up your player profile</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Avatar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
              <User className="h-4 w-4" />
            </div>
            <p className="text-sm font-bold text-slate-900">Choose Avatar</p>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {avatarChoices.map((seed) => {
              const selected = avatarKey === seed
              return (
                <button
                  key={seed}
                  type="button"
                  onClick={() => setAvatarKey(seed)}
                  className={`overflow-hidden rounded-xl border-2 bg-white p-0.5 transition ${selected ? 'border-violet-600 ring-2 ring-violet-200 shadow-md' : 'border-slate-100 hover:border-violet-200'}`}
                >
                  <img src={dicebearUrl(seed)} alt="" className="aspect-square w-full rounded-lg bg-slate-50" />
                </button>
              )
            })}
          </div>
          {!avatarKey && (
            <p className="mt-2 text-center text-xs text-slate-400">Tap to select an avatar</p>
          )}
        </div>

        {/* Name + Game Tag */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Full name</label>
            <input
              type="text"
              placeholder="Your full name"
              maxLength={80}
              autoComplete="name"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })) }}
              className={`w-full rounded-xl border px-4 py-3 text-sm font-medium outline-none transition focus:ring-2 ${errors.name ? 'border-rose-300 focus:ring-rose-500/20' : 'border-slate-200 focus:border-violet-400 focus:ring-violet-500/20'}`}
            />
            {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Game tag</label>
            <input
              type="text"
              placeholder="e.g. Player_9921"
              maxLength={24}
              value={gameTag}
              onChange={(e) => { setGameTag(e.target.value); setErrors((p) => ({ ...p, gameTag: '' })) }}
              className={`w-full rounded-xl border px-4 py-3 text-sm font-medium outline-none transition focus:ring-2 ${errors.gameTag ? 'border-rose-300 focus:ring-rose-500/20' : 'border-slate-200 focus:border-violet-400 focus:ring-violet-500/20'}`}
            />
            {errors.gameTag
              ? <p className="mt-1 text-xs text-rose-500">{errors.gameTag}</p>
              : <p className="mt-1 text-xs text-slate-400">Letters, numbers, underscore. Min 4 chars. Must be unique.</p>
            }
          </div>
        </div>

        <button type="submit" disabled={busy} className="btn-app-primary py-4 text-base disabled:opacity-50">
          {busy ? 'Creating account…' : 'Create Account 🎉'}
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <ArrowRight className="h-4 w-4" />
          </span>
        </button>
      </form>
    </div>
  )
}
