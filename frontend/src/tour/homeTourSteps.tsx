import type { Step } from 'react-joyride'

export const TOUR_STORAGE_KEY = 'nserve_app_tour_v2_done'

export const START_TOUR_EVENT = 'nserve-start-tour'

export const homeTourSteps: Step[] = [
  {
    target: 'body',
    title: '👋 Welcome to Nserve Quiz!',
    content: (
      <div className="text-left text-sm leading-relaxed text-slate-700">
        <p className="mb-2 font-semibold text-slate-900">Quick 5-step tour</p>
        <p>Learn how to play quizzes, track your scores, and climb the leaderboard. Takes 30 seconds!</p>
      </div>
    ),
    placement: 'center',
    skipBeacon: true,
  },
  {
    target: '[data-tour="tour-scores"]',
    title: '📊 Your Scores',
    content: 'Track your Day, Week, and Month scores here. Every correct answer gives +10 pts, wrong answer −2 pts.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="tour-events"]',
    title: '🎯 Play a Quiz',
    content: 'Swipe to browse live and upcoming quizzes. Tap any Live card to join instantly. Each quiz costs 10 credits.',
    placement: 'top',
  },
  {
    target: '[data-tour="tour-leaderboard-preview"]',
    title: '🏆 Leaderboard',
    content: 'See top players here. Finish quizzes to climb the ranks — weekly and monthly boards reset regularly.',
    placement: 'top',
  },
  {
    target: '[data-tour="bottom-nav"]',
    title: '🧭 Navigation',
    content: (
      <div className="text-left text-sm leading-relaxed text-slate-700">
        <ul className="list-inside list-disc space-y-1">
          <li><strong>Home</strong> — scores &amp; events</li>
          <li><strong>Events</strong> — full schedule</li>
          <li><strong>Play</strong> — quick start</li>
          <li><strong>Ranks</strong> — leaderboard</li>
          <li><strong>Wallet</strong> — credits &amp; top-up</li>
        </ul>
      </div>
    ),
    placement: 'top',
  },
]
