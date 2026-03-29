import { useCallback, useEffect, useState } from 'react'
import { EVENTS, Joyride } from 'react-joyride'
import type { EventHandler } from 'react-joyride'
import { homeTourSteps, START_TOUR_EVENT, TOUR_STORAGE_KEY } from '../tour/homeTourSteps'

type Props = {
  /** When false, tour never auto-starts (e.g. not on home). */
  enabled?: boolean
}

export function AppTour({ enabled = true }: Props) {
  const [run, setRun] = useState(false)

  const markDone = useCallback(() => {
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
    setRun(false)
  }, [])

  useEffect(() => {
    if (!enabled) return
    try {
      if (localStorage.getItem(TOUR_STORAGE_KEY)) return
    } catch {
      return
    }
    const id = window.setTimeout(() => setRun(true), 700)
    return () => clearTimeout(id)
  }, [enabled])

  useEffect(() => {
    const onStart = () => setRun(true)
    window.addEventListener(START_TOUR_EVENT, onStart)
    return () => window.removeEventListener(START_TOUR_EVENT, onStart)
  }, [])

  const handleEvent: EventHandler = useCallback(
    (data) => {
      if (data.type === EVENTS.TOUR_END) {
        markDone()
      }
    },
    [markDone],
  )

  if (!enabled) return null

  return (
    <Joyride
      run={run}
      steps={homeTourSteps}
      continuous
      scrollToFirstStep
      onEvent={handleEvent}
      options={{
        primaryColor: '#7c3aed',
        textColor: '#0f172a',
        backgroundColor: '#ffffff',
        overlayColor: 'rgba(15, 23, 42, 0.72)',
        arrowColor: '#ffffff',
        zIndex: 10050,
        showProgress: true,
        buttons: ['back', 'close', 'primary', 'skip'],
      }}
      styles={{
        tooltip: {
          borderRadius: 16,
        },
        buttonPrimary: {
          backgroundColor: '#7c3aed',
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 600,
        },
        buttonBack: {
          color: '#64748b',
          fontSize: 13,
        },
        buttonSkip: {
          color: '#64748b',
          fontSize: 12,
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Done',
        next: 'Next',
        skip: 'Skip tour',
      }}
    />
  )
}
