import { useCallback, useEffect, useState } from 'react'
import { ACTIONS, EVENTS, Joyride } from 'react-joyride'
import type { EventHandler } from 'react-joyride'
import { homeTourSteps, START_TOUR_EVENT, TOUR_STORAGE_KEY } from '../tour/homeTourSteps'

type Props = {
  /** When false, tour never auto-starts (e.g. not on home). */
  enabled?: boolean
}

export function AppTour({ enabled = true }: Props) {
  const [run, setRun] = useState(false)

  const scrollToStepTarget = useCallback((stepIndex: number) => {
    const step = homeTourSteps[stepIndex]
    if (!step) return
    const target = step.target
    if (target === 'body') return

    let el: HTMLElement | null = null
    if (typeof target === 'string') {
      el = document.querySelector<HTMLElement>(target)
    } else if (target instanceof HTMLElement) {
      el = target
    }
    if (!el) return

    // Keep tour movement feeling directional (up/down) when pressing Next/Back.
    window.requestAnimationFrame(() => {
      el?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      })
    })
  }, [])

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
        return
      }

      if (data.type === EVENTS.STEP_AFTER) {
        if (data.action === ACTIONS.NEXT) {
          scrollToStepTarget(data.index + 1)
        } else if (data.action === ACTIONS.PREV) {
          scrollToStepTarget(data.index - 1)
        }
      }
    },
    [markDone, scrollToStepTarget],
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
