import type { Step } from 'react-joyride'

export const TOUR_STORAGE_KEY = 'nserve_app_tour_v1_done'

export const START_TOUR_EVENT = 'nserve-start-tour'

export const homeTourSteps: Step[] = [
  {
    target: 'body',
    title: 'Welcome',
    content: (
      <div className="text-left text-sm leading-relaxed text-slate-700">
        <p className="mb-2 font-semibold text-slate-900">
          Here’s a quick tour of the app.
        </p>
        <p>
          You’ll see how to move around, set your location, join quizzes, and
          check scores. Use Next or Skip anytime.
        </p>
      </div>
    ),
    placement: 'center',
    skipBeacon: true,
  },
  {
    target: '[data-tour="tour-menu"]',
    title: 'Menu',
    content:
      'Open the side menu for your calendar, events shortcut, support, FAQ, and sign out.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="tour-location"]',
    title: 'Your location',
    content:
      'Tap here to pick your city from the list. It’s used for a more local experience and leaderboards.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="tour-profile-header"]',
    title: 'Profile',
    content:
      'Open My Profile to change your photo, avatar, display name, and see your plan and scores.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="tour-categories"]',
    title: 'Your interests',
    content:
      'These are the categories you chose — quizzes are matched to what you like.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="tour-scores"]',
    title: 'Scores',
    content:
      'Track how you’re doing today, this week, and this month at a glance.',
    placement: 'top',
  },
  {
    target: '[data-tour="tour-events"]',
    title: 'Events & quizzes',
    content:
      'Swipe the cards to browse live and upcoming quizzes. Tap a live event to jump in.',
    placement: 'top',
  },
  {
    target: '[data-tour="tour-leaderboard-preview"]',
    title: 'Leaderboard preview',
    content:
      'See top players here, or open the full leaderboard for weekly and monthly ranks.',
    placement: 'top',
  },
  {
    target: '[data-tour="bottom-nav"]',
    title: 'Bottom navigation',
    content: (
      <div className="text-left text-sm leading-relaxed text-slate-700">
        <ul className="list-inside list-disc space-y-1">
          <li>
            <strong>Home</strong> — this screen
          </li>
          <li>
            <strong>Events</strong> — schedule and event hub
          </li>
          <li>
            <strong>Play</strong> — start a joinable quiz quickly
          </li>
          <li>
            <strong>Ranks</strong> — full leaderboard
          </li>
          <li>
            <strong>Profile</strong> — your account and settings
          </li>
        </ul>
      </div>
    ),
    placement: 'top',
  },
]
