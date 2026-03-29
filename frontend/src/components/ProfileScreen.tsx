import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Calendar,
  CalendarDays,
  CalendarRange,
  Camera,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  UserRound,
} from 'lucide-react'
import * as api from '../api/client'
import { AVATAR_SEED_POOL, dicebearUrl } from '../constants/avatars'
import { canJoinQuiz } from '../lib/quizEvents'
import { useApp } from '../context/AppContext'
import { AppBottomNav } from './AppBottomNav'
import { LocationPickerSheet } from './LocationPickerSheet'
import type { LucideIcon } from 'lucide-react'
import type { UserProfileDto } from '../types'

function pickTenSeeds(): string[] {
  const a = [...AVATAR_SEED_POOL]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, 10)
}

type ScorePeriod = 'daily' | 'weekly' | 'monthly'

const SCORE_PERIODS: {
  id: ScorePeriod
  label: string
  hint: string
  Icon: LucideIcon
}[] = [
  {
    id: 'daily',
    label: 'Daily',
    hint: 'Quiz points earned today (resets at midnight UTC).',
    Icon: CalendarDays,
  },
  {
    id: 'weekly',
    label: 'Weekly',
    hint: 'Running total for the current week on the leaderboard.',
    Icon: CalendarRange,
  },
  {
    id: 'monthly',
    label: 'Monthly',
    hint: 'Running total for the current calendar month.',
    Icon: Calendar,
  },
]

function periodPoints(user: UserProfileDto, p: ScorePeriod) {
  switch (p) {
    case 'daily':
      return user.dayScore
    case 'weekly':
      return user.weeklyScore
    case 'monthly':
      return user.monthlyScore
    default:
      return 0
  }
}

export function ProfileScreen() {
  const navigate = useNavigate()
  const { user, setUser, loading } = useApp()
  const [name, setName] = useState('')
  const [avatarKey, setAvatarKey] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)
  const [clearGalleryOnSave, setClearGalleryOnSave] = useState(false)
  const [locationOpen, setLocationOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [scorePeriod, setScorePeriod] = useState<ScorePeriod>('daily')
  const fileRef = useRef<HTMLInputElement>(null)
  const avatarChoices = useMemo(() => pickTenSeeds(), [])

  useEffect(() => {
    if (!user) return
    setName(user.displayName || 'Player')
    setAvatarKey(user.avatarKey ?? '')
    setPendingFile(null)
    setClearGalleryOnSave(false)
  }, [user?.id, user?.displayName, user?.avatarKey, user?.profilePhotoUrl])

  useEffect(() => {
    if (!pendingFile) {
      setPendingPreview(null)
      return
    }
    const url = URL.createObjectURL(pendingFile)
    setPendingPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [pendingFile])

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true })
    }
  }, [loading, user, navigate])

  async function onPlay() {
    try {
      const quizzes = await api.fetchQuizList()
      const hit = quizzes.find((q) => canJoinQuiz(q))
      if (hit) navigate(`/quiz/${hit.id}/loading`)
      else if (quizzes.length)
        toast.message('No joinable quiz right now — check Events')
      else toast.message('No quizzes loaded')
    } catch {
      toast.error('Could not load quizzes')
    }
  }

  const previewSrc: string | undefined = (() => {
    if (pendingPreview) return pendingPreview
    if (user && !clearGalleryOnSave) {
      const u = api.resolveProfileImageUrl(user)
      if (u) return u
    }
    if (avatarKey.trim()) return dicebearUrl(avatarKey.trim())
    return undefined
  })()

  async function onSave() {
    if (!user) return
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('Please enter a display name')
      return
    }
    setSaving(true)
    try {
      if (pendingFile) {
        const afterUpload = await api.uploadProfilePhoto(pendingFile)
        setUser(afterUpload)
      }
      const clearCustom = clearGalleryOnSave

      const next = await api.updateProfile({
        displayName: trimmed,
        avatarKey: avatarKey.trim(),
        profilePhotoUrl: null,
        clearCustomPhoto: clearCustom,
      })
      setUser(next)
      setPendingFile(null)
      setClearGalleryOnSave(false)
      toast.success('Profile saved')
    } catch (e) {
      toast.error(api.getApiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f || !f.type.startsWith('image/')) {
      toast.error('Choose an image file')
      return
    }
    if (f.size > 3 * 1024 * 1024) {
      toast.error('Image must be 3MB or smaller')
      return
    }
    setPendingFile(f)
    setClearGalleryOnSave(false)
    setAvatarKey('')
  }

  if (loading || !user) {
    return (
      <div className="app-screen flex min-h-[100dvh] flex-col items-center justify-center gap-3 text-slate-600 safe-pt-header">
        <div className="h-12 w-12 animate-pulse rounded-2xl bg-gradient-to-br from-violet-300 to-indigo-400" />
        <p className="text-sm font-semibold">Loading…</p>
      </div>
    )
  }

  const planActive = user.planStatus?.toUpperCase() === 'ACTIVE'

  return (
    <div className="app-screen min-h-[100dvh] pb-bottom-nav">
      <header className="sticky top-0 z-20 border-b border-violet-100/80 bg-white/90 px-4 pb-3 shadow-sm shadow-violet-500/5 backdrop-blur-xl safe-pt-sticky">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button
            type="button"
            aria-label="Back"
            className="rounded-xl p-2 text-slate-600 hover:bg-slate-100"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
            My Profile
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-6 px-4 py-6">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-violet-200 bg-violet-50 shadow-inner">
              {previewSrc ? (
                <img
                  src={previewSrc}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserRound className="h-14 w-14 text-violet-300" />
              )}
            </div>
            <button
              type="button"
              aria-label="Upload from gallery"
              title="My Profile — upload photo"
              className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg ring-4 ring-white"
              onClick={() => fileRef.current?.click()}
            >
              <Camera className="h-5 w-5" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={onPickFile}
            />
          </div>
          <p className="mt-3 text-center text-xs text-slate-500">
            Upload from gallery (preview above). Max 3MB.
          </p>
          {(user.profilePhotoUrl || pendingFile) && (
            <button
              type="button"
              className="mt-2 text-xs font-medium text-rose-600 hover:underline"
              onClick={() => {
                setPendingFile(null)
                setClearGalleryOnSave(true)
              }}
            >
              Remove custom photo
            </button>
          )}
        </div>

        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Choose an avatar
          </p>
          <div className="grid grid-cols-5 gap-2">
            {avatarChoices.map((seed) => {
              const selected = avatarKey.trim() === seed
              return (
                <button
                  key={seed}
                  type="button"
                  title={seed}
                  onClick={() => {
                    setAvatarKey(seed)
                    if (user.profilePhotoUrl) setClearGalleryOnSave(true)
                  }}
                  className={`overflow-hidden rounded-xl border-2 bg-white p-0.5 shadow-sm transition ${
                    selected
                      ? 'border-violet-600 ring-2 ring-violet-200'
                      : 'border-slate-100 hover:border-violet-200'
                  }`}
                >
                  <img
                    src={dicebearUrl(seed)}
                    alt=""
                    className="aspect-square w-full rounded-lg bg-slate-50"
                  />
                </button>
              )
            })}
          </div>
        </section>

        <section className="space-y-2">
          <label className="text-xs font-semibold text-slate-600" htmlFor="dn">
            Display name
          </label>
          <input
            id="dn"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className="input-app text-sm"
          />
        </section>

        {(user.email?.trim() || user.phone?.trim()) && (
          <section className="app-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Account
            </p>
            {user.email?.trim() && (
              <div className="mt-3 flex items-start gap-3">
                <Mail
                  className="mt-0.5 h-4 w-4 shrink-0 text-violet-600"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-slate-500">Email</p>
                  <p className="break-all text-sm font-semibold text-slate-900">
                    {user.email.trim()}
                  </p>
                </div>
              </div>
            )}
            {user.phone?.trim() && (
              <div
                className={`flex items-start gap-3 ${user.email?.trim() ? 'mt-4 border-t border-slate-100 pt-4' : 'mt-3'}`}
              >
                <Phone
                  className="mt-0.5 h-4 w-4 shrink-0 text-violet-600"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-slate-500">Phone</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {user.phone.trim()}
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        <section className="app-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Plan
          </p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-lg font-bold text-slate-900">
              {user.planType || 'FREE'}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                planActive
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {planActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          {user.profileUpdatedAt && (
            <p className="mt-2 text-[11px] text-slate-400">
              Profile last updated:{' '}
              {new Date(user.profileUpdatedAt).toLocaleString()}
            </p>
          )}
        </section>

        <section className="app-card p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Your points
          </p>
          <div
            className="flex rounded-xl bg-slate-100 p-1"
            role="tablist"
            aria-label="Score period"
          >
            {SCORE_PERIODS.map(({ id, label, Icon }) => {
              const active = scorePeriod === id
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                    active
                      ? 'bg-white text-violet-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  onClick={() => setScorePeriod(id)}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                  {label}
                </button>
              )
            })}
          </div>
          <div className="mt-4 rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/90 to-white px-4 py-5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-violet-600/90">
              {SCORE_PERIODS.find((x) => x.id === scorePeriod)?.label} score
            </p>
            <p className="mt-1 tabular-nums text-4xl font-bold tracking-tight text-slate-900">
              {periodPoints(user, scorePeriod).toLocaleString()}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              {SCORE_PERIODS.find((x) => x.id === scorePeriod)?.hint}
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
            <div>
              <p className="text-slate-500">All-time total</p>
              <p className="font-bold tabular-nums text-slate-900">
                {user.totalScore.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Skill points</p>
              <p className="font-bold tabular-nums text-violet-600">
                {user.points.toLocaleString()}
              </p>
            </div>
          </div>
        </section>

        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-2xl border border-violet-100 bg-violet-50/80 px-4 py-3 text-left text-sm"
          onClick={() => setLocationOpen(true)}
        >
          <span className="flex items-center gap-2 text-slate-700">
            <MapPin className="h-4 w-4 text-violet-600" />
            Location
          </span>
          <span className="truncate text-xs font-semibold text-violet-800">
            {user.location?.trim() || 'Set'}
          </span>
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() => void onSave()}
          className="btn-app-primary py-3.5 text-[13px] font-bold normal-case tracking-normal disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Save className="h-5 w-5" />
          )}
          Save changes
        </button>
      </main>

      <AppBottomNav
        active="profile"
        onPlay={onPlay}
        onProfile={() => navigate('/profile')}
      />

      <LocationPickerSheet
        open={locationOpen}
        onClose={() => setLocationOpen(false)}
        initial={user.location}
        onSave={async (location) => {
          if (!user) {
            toast.error('Not signed in')
            throw new Error('no user')
          }
          try {
            const { profile, synced } = await api.saveUserLocation(location, user)
            setUser(profile)
            if (synced) {
              toast.success(location ? 'Location saved' : 'Location cleared')
            } else {
              toast.message(
                location
                  ? 'Saved on this device. Start the backend to sync.'
                  : 'Location cleared locally.',
                { duration: 4500 },
              )
            }
          } catch (e) {
            toast.error(api.getApiErrorMessage(e))
            throw e
          }
        }}
      />
    </div>
  )
}
