/** Client-only taglines + effect ids for the quiz feedback banner. */

export const CORRECT_TAGLINES: readonly string[] = [
  'Nailed it! Pure genius.',
  "You're on fire now!",
  'Total masterclass right there.',
  'Spot on. Keep rolling!',
  'Boom! You got it.',
  'Brain power: 100%.',
  'Sharp as a tack!',
  'Nothing gets past you.',
  'Simply flawless work.',
  'Look at you go!',
  'That answer was chef’s kiss.',
  'Legend status unlocked.',
  'Precision mode: on.',
  'You read that question perfectly.',
  'Brains and speed — nice combo.',
  'Another W in the books.',
  'Calm, cool, and correct.',
  'That’s the energy we need.',
  'You made it look easy.',
  'Queue the victory lap.',
]

export const WRONG_TAGLINES: readonly string[] = [
  'Close! Try again soon.',
  'Next one is yours!',
  'Shake it off, Champ!',
  'Almost had it there.',
  'Keep that focus up!',
  'A lesson learned today.',
  'Nice try, stay sharp!',
  'Dust off, keep going!',
  'Smart effort, keep swinging.',
  'Your comeback starts now!',
  'No worries — reset and go.',
  'Tough one. Breathe and continue.',
  'The next question won’t know what hit it.',
  'Even champs miss sometimes.',
  'Use it as fuel for the next round.',
  'Still in the game — keep going.',
  'One swing, one miss — all good.',
  'Refocus. You’ve got this.',
  'Plot twist: you’ll get the next one.',
  'Stay hungry — round two awaits.',
]

export type FeedbackParticle =
  | 'sparkles'
  | 'stars'
  | 'dots'
  | 'rings'
  | 'meteors'
  | 'bubbles'
  | 'diamonds'
  | 'none'

export type CorrectBannerConfig = {
  gradient: string
  glowClass: string
  particle: FeedbackParticle
  motionClass: string
  iconSpin?: boolean
}

export type WrongBannerConfig = {
  gradient: string
  shakeClass: string
  overlayClass: string
  pulseEdges?: boolean
}

/** 20 distinct “win” visuals — gradient + glow + particle choreography. */
export const CORRECT_BANNER_EFFECTS: readonly CorrectBannerConfig[] = [
  {
    gradient: 'from-violet-600 via-fuchsia-600 to-indigo-700',
    glowClass: 'quiz-celebrate-glow',
    particle: 'sparkles',
    motionClass: 'quiz-fx-correct-float',
  },
  {
    gradient: 'from-indigo-600 via-purple-600 to-fuchsia-700',
    glowClass: 'quiz-fx-glow-soft',
    particle: 'stars',
    motionClass: 'quiz-fx-correct-pulse',
  },
  {
    gradient: 'from-sky-600 via-violet-600 to-indigo-800',
    glowClass: 'quiz-celebrate-glow',
    particle: 'dots',
    motionClass: 'quiz-fx-correct-wave',
  },
  {
    gradient: 'from-amber-500 via-orange-500 to-rose-600',
    glowClass: 'quiz-fx-glow-warm',
    particle: 'meteors',
    motionClass: 'quiz-fx-correct-float',
  },
  {
    gradient: 'from-fuchsia-600 via-pink-600 to-violet-800',
    glowClass: 'quiz-fx-glow-soft',
    particle: 'rings',
    motionClass: 'quiz-fx-correct-pulse',
  },
  {
    gradient: 'from-blue-600 via-indigo-600 to-violet-700',
    glowClass: 'quiz-celebrate-glow',
    particle: 'sparkles',
    motionClass: 'quiz-fx-correct-shimmer',
  },
  {
    gradient: 'from-teal-600 via-cyan-600 to-violet-700',
    glowClass: 'quiz-fx-glow-soft',
    particle: 'bubbles',
    motionClass: 'quiz-fx-correct-wave',
  },
  {
    gradient: 'from-violet-700 via-fuchsia-500 to-amber-500',
    glowClass: 'quiz-fx-glow-warm',
    particle: 'diamonds',
    motionClass: 'quiz-fx-correct-float',
  },
  {
    gradient: 'from-purple-700 via-violet-600 to-sky-600',
    glowClass: 'quiz-celebrate-glow',
    particle: 'stars',
    motionClass: 'quiz-fx-correct-shimmer',
  },
  {
    gradient: 'from-rose-500 via-fuchsia-600 to-indigo-700',
    glowClass: 'quiz-fx-glow-soft',
    particle: 'meteors',
    motionClass: 'quiz-fx-correct-pulse',
  },
  {
    gradient: 'from-indigo-700 via-violet-600 to-purple-800',
    glowClass: 'quiz-fx-glow-soft',
    particle: 'dots',
    motionClass: 'quiz-fx-correct-wave',
  },
  {
    gradient: 'from-cyan-600 via-blue-700 to-violet-800',
    glowClass: 'quiz-celebrate-glow',
    particle: 'rings',
    motionClass: 'quiz-fx-correct-float',
  },
  {
    gradient: 'from-violet-600 via-indigo-700 to-slate-800',
    glowClass: 'quiz-fx-glow-soft',
    particle: 'sparkles',
    motionClass: 'quiz-fx-correct-shimmer',
  },
  {
    gradient: 'from-pink-500 via-rose-600 to-violet-800',
    glowClass: 'quiz-fx-glow-warm',
    particle: 'bubbles',
    motionClass: 'quiz-fx-correct-pulse',
  },
  {
    gradient: 'from-emerald-600 via-teal-600 to-indigo-800',
    glowClass: 'quiz-celebrate-glow',
    particle: 'stars',
    motionClass: 'quiz-fx-correct-wave',
  },
  {
    gradient: 'from-fuchsia-700 via-violet-600 to-orange-500',
    glowClass: 'quiz-fx-glow-soft',
    particle: 'diamonds',
    motionClass: 'quiz-fx-correct-float',
  },
  {
    gradient: 'from-blue-700 via-violet-700 to-fuchsia-600',
    glowClass: 'quiz-celebrate-glow',
    particle: 'meteors',
    motionClass: 'quiz-fx-correct-shimmer',
  },
  {
    gradient: 'from-violet-800 via-purple-700 to-pink-600',
    glowClass: 'quiz-fx-glow-warm',
    particle: 'dots',
    motionClass: 'quiz-fx-correct-pulse',
  },
  {
    gradient: 'from-sky-500 via-indigo-600 to-violet-900',
    glowClass: 'quiz-fx-glow-soft',
    particle: 'rings',
    motionClass: 'quiz-fx-correct-wave',
  },
  {
    gradient: 'from-amber-400 via-orange-500 to-violet-900',
    glowClass: 'quiz-celebrate-glow',
    particle: 'sparkles',
    motionClass: 'quiz-fx-correct-float',
    iconSpin: true,
  },
]

/** 20 distinct “miss” visuals — cool neutrals + shake / wobble / vignette. */
export const WRONG_BANNER_EFFECTS: readonly WrongBannerConfig[] = [
  {
    gradient: 'from-slate-800 via-zinc-900 to-neutral-950',
    shakeClass: 'quiz-feedback-shake',
    overlayClass: 'quiz-wrong-vignette',
  },
  {
    gradient: 'from-zinc-800 via-stone-900 to-neutral-950',
    shakeClass: 'quiz-fx-wrong-wobble',
    overlayClass: 'quiz-wrong-scan',
  },
  {
    gradient: 'from-neutral-800 via-slate-900 to-zinc-950',
    shakeClass: 'quiz-fx-wrong-rumble',
    overlayClass: 'quiz-wrong-vignette',
  },
  {
    gradient: 'from-stone-800 via-neutral-900 to-slate-950',
    shakeClass: 'quiz-feedback-shake',
    overlayClass: 'quiz-wrong-dim-pulse',
  },
  {
    gradient: 'from-slate-900 via-zinc-800 to-stone-950',
    shakeClass: 'quiz-fx-wrong-jitter',
    overlayClass: 'quiz-wrong-scan',
  },
  {
    gradient: 'from-gray-800 via-slate-900 to-neutral-950',
    shakeClass: 'quiz-fx-wrong-sway',
    overlayClass: 'quiz-wrong-vignette',
  },
  {
    gradient: 'from-zinc-900 via-neutral-800 to-stone-950',
    shakeClass: 'quiz-fx-wrong-double',
    overlayClass: 'quiz-wrong-dim-pulse',
  },
  {
    gradient: 'from-neutral-900 via-slate-800 to-zinc-950',
    shakeClass: 'quiz-feedback-shake',
    overlayClass: 'quiz-wrong-scan',
  },
  {
    gradient: 'from-stone-900 via-zinc-900 to-neutral-950',
    shakeClass: 'quiz-fx-wrong-wobble',
    overlayClass: 'quiz-wrong-vignette',
  },
  {
    gradient: 'from-slate-800 via-gray-900 to-zinc-950',
    shakeClass: 'quiz-fx-wrong-rumble',
    overlayClass: 'quiz-wrong-dim-pulse',
  },
  {
    gradient: 'from-zinc-950 via-stone-900 to-slate-900',
    shakeClass: 'quiz-fx-wrong-jitter',
    overlayClass: 'quiz-wrong-scan',
  },
  {
    gradient: 'from-neutral-950 via-slate-800 to-stone-950',
    shakeClass: 'quiz-fx-wrong-sway',
    overlayClass: 'quiz-wrong-vignette',
  },
  {
    gradient: 'from-gray-900 via-neutral-900 to-zinc-950',
    shakeClass: 'quiz-fx-wrong-double',
    overlayClass: 'quiz-wrong-dim-pulse',
  },
  {
    gradient: 'from-slate-900 via-zinc-800 to-neutral-950',
    shakeClass: 'quiz-feedback-shake',
    overlayClass: 'quiz-wrong-scan',
  },
  {
    gradient: 'from-stone-950 via-neutral-800 to-slate-950',
    shakeClass: 'quiz-fx-wrong-wobble',
    overlayClass: 'quiz-wrong-vignette',
  },
  {
    gradient: 'from-zinc-800 via-slate-950 to-stone-900',
    shakeClass: 'quiz-fx-wrong-rumble',
    overlayClass: 'quiz-wrong-dim-pulse',
  },
  {
    gradient: 'from-neutral-800 via-zinc-950 to-slate-950',
    shakeClass: 'quiz-fx-wrong-jitter',
    overlayClass: 'quiz-wrong-scan',
  },
  {
    gradient: 'from-slate-800 via-stone-950 to-neutral-900',
    shakeClass: 'quiz-fx-wrong-sway',
    overlayClass: 'quiz-wrong-vignette',
  },
  {
    gradient: 'from-gray-800 via-zinc-900 to-stone-950',
    shakeClass: 'quiz-fx-wrong-double',
    overlayClass: 'quiz-wrong-dim-pulse',
  },
  {
    gradient: 'from-zinc-900 via-slate-900 to-neutral-950',
    shakeClass: 'quiz-feedback-shake',
    overlayClass: 'quiz-wrong-vignette',
    pulseEdges: true,
  },
]

export type FeedbackBundle = {
  message: string
  taglineIndex: number
  effectId: number
  correct: boolean
}

function pickIndex(len: number) {
  return Math.floor(Math.random() * len)
}

/** Independent random tagline + effect for maximum variety (20×20 combos each side). */
export function randomFeedbackBundle(correct: boolean): FeedbackBundle {
  const taglines = correct ? CORRECT_TAGLINES : WRONG_TAGLINES
  const taglineIndex = pickIndex(taglines.length)
  const effectId = pickIndex(20)
  return {
    message: taglines[taglineIndex]!,
    taglineIndex,
    effectId,
    correct,
  }
}

export function getCorrectEffect(id: number): CorrectBannerConfig {
  return CORRECT_BANNER_EFFECTS[id % CORRECT_BANNER_EFFECTS.length]!
}

export function getWrongEffect(id: number): WrongBannerConfig {
  return WRONG_BANNER_EFFECTS[id % WRONG_BANNER_EFFECTS.length]!
}

/** @deprecated use randomFeedbackBundle + message */
export function randomFeedback(correct: boolean): string {
  const taglines = correct ? CORRECT_TAGLINES : WRONG_TAGLINES
  return taglines[pickIndex(taglines.length)]!
}
