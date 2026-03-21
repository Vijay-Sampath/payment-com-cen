'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTourStore } from './guided-tour-store'
import { TOUR_STEPS, TooltipPosition } from './tour-steps'
import { useApp } from '@/lib/store'

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

const PAD = 8
const SPOTLIGHT_ENABLED = true

function rectChanged(a: Rect | null, b: Rect | null): boolean {
  if (!a && !b) return false
  if (!a || !b) return true
  // Avoid noisy micro-updates from sub-pixel layout shifts.
  return (
    Math.round(a.top) !== Math.round(b.top) ||
    Math.round(a.left) !== Math.round(b.left) ||
    Math.round(a.width) !== Math.round(b.width) ||
    Math.round(a.height) !== Math.round(b.height)
  )
}

function measureTarget(tourId: string): Rect | null {
  const el = document.querySelector(`[data-tour="${tourId}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

function computeTooltipStyle(
  rect: Rect | null,
  preferred: TooltipPosition,
  tooltipW: number,
  tooltipH: number,
): React.CSSProperties {
  if (!rect || preferred === 'center') {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    }
  }

  const vw = window.innerWidth
  const vh = window.innerHeight
  const gap = 16

  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2

  let pos = preferred

  // Check if preferred position has enough room, otherwise flip
  if (pos === 'bottom' && rect.top + rect.height + gap + tooltipH > vh) pos = 'top'
  if (pos === 'top' && rect.top - gap - tooltipH < 0) pos = 'bottom'
  if (pos === 'right' && rect.left + rect.width + gap + tooltipW > vw) pos = 'left'
  if (pos === 'left' && rect.left - gap - tooltipW < 0) pos = 'right'

  let top = 0
  let left = 0

  switch (pos) {
    case 'bottom':
      top = rect.top + rect.height + PAD + gap
      left = cx - tooltipW / 2
      break
    case 'top':
      top = rect.top - PAD - gap - tooltipH
      left = cx - tooltipW / 2
      break
    case 'right':
      top = cy - tooltipH / 2
      left = rect.left + rect.width + PAD + gap
      break
    case 'left':
      top = cy - tooltipH / 2
      left = rect.left - PAD - gap - tooltipW
      break
  }

  // Clamp to viewport
  left = Math.max(12, Math.min(left, vw - tooltipW - 12))
  top = Math.max(12, Math.min(top, vh - tooltipH - 12))

  return { top, left }
}

export function GuidedTour() {
  const { isActive, currentStep, isNavigating, nextStep, prevStep, endTour, setNavigating } = useTourStore()
  const { state, dispatch, startWorkflow } = useApp()
  const router = useRouter()
  const pathname = usePathname()
  const [targetRect, setTargetRect] = useState<Rect | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [tooltipSize, setTooltipSize] = useState({ w: 380, h: 280 })
  const prevStepRef = useRef(-1)
  const openedDirectorByTourRef = useRef(false)
  const hasAutoScrolledRef = useRef(false)
  const navWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRouteRef = useRef<string | null>(null)

  const step = TOUR_STEPS[currentStep]
  const isCentered = !SPOTLIGHT_ENABLED || !step?.target
  const total = TOUR_STEPS.length
  const isLastStep = currentStep === total - 1

  // Measure tooltip size
  useEffect(() => {
    if (!isActive) return
    const el = tooltipRef.current
    if (el) {
      setTooltipSize({ w: el.offsetWidth, h: el.offsetHeight })
    }
  }, [isActive, currentStep])

  // Handle onEnter / onExit for director panel steps
  useEffect(() => {
    if (!isActive || !step) return

    const prevIdx = prevStepRef.current

    // Only process enter/exit when step actually changes — avoids
    // infinite loop where open-director triggers a state change that
    // re-fires this effect and hits close-director on the same step.
    if (prevIdx === currentStep) return

    const prevStep_def = prevIdx >= 0 ? TOUR_STEPS[prevIdx] : null

    // onExit of previous step
    if (prevStep_def?.onExit === 'close-director' && openedDirectorByTourRef.current) {
      dispatch({ type: 'SET_DIRECTOR_OPEN', open: false })
      openedDirectorByTourRef.current = false
    }

    // onEnter of current step
    if (step.onEnter === 'open-director') {
      dispatch({ type: 'SET_DIRECTOR_OPEN', open: true })
      openedDirectorByTourRef.current = true
    }

    prevStepRef.current = currentStep
    hasAutoScrolledRef.current = false
  }, [isActive, currentStep, step, dispatch])

  // Navigate to the correct route when step changes
  useEffect(() => {
    if (!isActive || !step) return

    const targetRoute = step.route
    if (targetRoute && pathname !== targetRoute) {
      if (pendingRouteRef.current !== targetRoute) {
        pendingRouteRef.current = targetRoute
        setNavigating(true)
        router.push(targetRoute)
      }
      return
    }
    if (targetRoute && pathname === targetRoute && pendingRouteRef.current === targetRoute) {
      pendingRouteRef.current = null
    }
  }, [isActive, currentStep, step, pathname, router, setNavigating])

  // Failsafe: never let navigation stay "stuck" forever.
  useEffect(() => {
    if (!isNavigating) {
      if (navWatchdogRef.current) {
        clearTimeout(navWatchdogRef.current)
        navWatchdogRef.current = null
      }
      return
    }

    navWatchdogRef.current = setTimeout(() => {
      setNavigating(false)
      navWatchdogRef.current = null
    }, 2500)

    return () => {
      if (navWatchdogRef.current) {
        clearTimeout(navWatchdogRef.current)
        navWatchdogRef.current = null
      }
    }
  }, [isNavigating, setNavigating])

  // After navigation completes, wait for DOM and measure
  useEffect(() => {
    if (!isActive || !step) return

    const targetRoute = step.route
    if (targetRoute && pathname !== targetRoute) return

    if (isNavigating) {
      // Route matched — wait for render
      const timer = setTimeout(() => {
        setNavigating(false)
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [isActive, step, pathname, isNavigating, setNavigating])

  // Measure target element
  const measureAndSet = useCallback(() => {
    if (!SPOTLIGHT_ENABLED) return
    if (!isActive || !step) return
    if (isNavigating) return

    if (step.target) {
      let cancelled = false
      let attempts = 0
      const maxAttempts = 10
      const delay = step.onEnter === 'open-director' ? 450 : 80
      let timer: ReturnType<typeof setTimeout> | null = null

      const tryMeasure = () => {
        if (cancelled) return
        const rect = measureTarget(step.target!)
        if (rect) {
          const el = document.querySelector(`[data-tour="${step.target!}"]`) as HTMLElement | null
          const outOfView =
            rect.top < 0 ||
            rect.left < 0 ||
            rect.top + rect.height > window.innerHeight ||
            rect.left + rect.width > window.innerWidth
          if (el && outOfView && !hasAutoScrolledRef.current) {
            hasAutoScrolledRef.current = true
            el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' })
            const refreshed = measureTarget(step.target!)
            setTargetRect((prev) => (rectChanged(prev, refreshed) ? refreshed : prev))
            return
          }
          setTargetRect((prev) => (rectChanged(prev, rect) ? rect : prev))
          return
        }
        attempts += 1
        if (attempts >= maxAttempts) {
          setTargetRect(null)
          return
        }
        timer = setTimeout(tryMeasure, 120)
      }

      timer = setTimeout(tryMeasure, delay)
      return () => {
        cancelled = true
        if (timer) clearTimeout(timer)
      }
    } else {
      setTargetRect(null)
    }
  }, [isActive, step, isNavigating])

  useEffect(() => {
    if (!SPOTLIGHT_ENABLED) return
    return measureAndSet()
  }, [measureAndSet])

  // Re-measure on window resize only.
  // Scroll-driven re-measure creates high-frequency state churn that can
  // conflict with animated chart layout updates during the tour.
  useEffect(() => {
    if (!SPOTLIGHT_ENABLED) return
    if (!isActive) return

    const handler = () => {
      if (step?.target && !isNavigating) {
        const rect = measureTarget(step.target)
        setTargetRect((prev) => (rectChanged(prev, rect) ? rect : prev))
      }
    }

    window.addEventListener('resize', handler)
    return () => {
      window.removeEventListener('resize', handler)
    }
  }, [isActive, step, isNavigating])

  const handleFinish = useCallback(() => {
    endTour()
    startWorkflow()
    dispatch({ type: 'SET_AUTOPLAY', enabled: true })
  }, [endTour, startWorkflow, dispatch])

  const handleNext = useCallback(() => {
    if (isNavigating) {
      setNavigating(false)
    }
    if (isLastStep) {
      handleFinish()
      return
    }
    nextStep()
  }, [isNavigating, setNavigating, isLastStep, handleFinish, nextStep])

  const handlePrev = useCallback(() => {
    if (isNavigating) {
      setNavigating(false)
    }
    prevStep()
  }, [isNavigating, setNavigating, prevStep])

  // Keyboard shortcuts
  useEffect(() => {
    if (!isActive) return

    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrev()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        endTour()
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isActive, endTour, handleNext, handlePrev])

  // Cleanup director panel on tour end
  useEffect(() => {
    if (!isActive) {
      prevStepRef.current = -1
      if (openedDirectorByTourRef.current) {
        dispatch({ type: 'SET_DIRECTOR_OPEN', open: false })
        openedDirectorByTourRef.current = false
      }
      if (navWatchdogRef.current) {
        clearTimeout(navWatchdogRef.current)
        navWatchdogRef.current = null
      }
      pendingRouteRef.current = null
    }
  }, [isActive, dispatch])

  if (!isActive || !step) return null

  const progress = ((currentStep + 1) / total) * 100

  const spotlightStyle: React.CSSProperties | null =
    targetRect && !isCentered
      ? {
          position: 'fixed',
          top: targetRect.top - PAD,
          left: targetRect.left - PAD,
          width: targetRect.width + PAD * 2,
          height: targetRect.height + PAD * 2,
          borderRadius: 12,
          boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.6)',
          zIndex: 71,
          pointerEvents: 'none' as const,
        }
      : null

  const ringStyle: React.CSSProperties | null =
    targetRect && !isCentered
      ? {
          position: 'fixed',
          top: targetRect.top - PAD,
          left: targetRect.left - PAD,
          width: targetRect.width + PAD * 2,
          height: targetRect.height + PAD * 2,
          borderRadius: 12,
          border: '2px solid #0d9488',
          zIndex: 71,
          pointerEvents: 'none' as const,
        }
      : null

  const tooltipStyle = computeTooltipStyle(
    targetRect,
    step.position,
    tooltipSize.w,
    tooltipSize.h,
  )

  return (
    <>
      {/* Click-catcher overlay */}
      <div
        className="fixed inset-0 z-[70]"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: isCentered || !targetRect ? 'rgba(15, 23, 42, 0.6)' : 'transparent',
        }}
      />

      {/* Spotlight cutout */}
      {spotlightStyle && (
        <div style={spotlightStyle} />
      )}

      {/* Teal ring */}
      {ringStyle && (
        <div style={ringStyle} className="tour-spotlight-pulse" />
      )}

      {/* Tooltip card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          ref={tooltipRef}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="fixed z-[72] w-[380px] bg-white rounded-xl shadow-xl border border-[#e2e8f0]"
          style={tooltipStyle}
        >
          {/* Progress bar */}
          <div className="h-1 bg-[#f1f5f9] rounded-t-xl overflow-hidden">
            <motion.div
              className="h-full bg-[#0d9488]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="p-5">
            {/* Top row: step counter + skip */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] text-[#64748b] font-medium">
                {currentStep + 1} of {total}
              </span>
              <button
                onClick={endTour}
                className="text-[13px] text-[#94a3b8] hover:text-[#64748b] transition-colors"
              >
                Skip tour
              </button>
            </div>

            {/* Navigating state */}
            {isNavigating ? (
              <div className="py-4 text-center">
                <div className="text-[14px] text-[#64748b]">Navigating...</div>
              </div>
            ) : (
              <>
                <h3 className="text-[16px] font-bold text-[#0f172a] mb-2">{step.title}</h3>
                <p className="text-[14px] text-[#64748b] leading-relaxed mb-5">
                  {step.description}
                </p>
                {!isCentered && !targetRect && (
                  <p className="text-[12px] text-[#d97706] mb-3">
                    Highlight target is still loading on this screen. You can click Next to continue.
                  </p>
                )}
              </>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold border border-[#e2e8f0] text-[#64748b] hover:text-[#0f172a] hover:border-[#cbd5e1] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {isLastStep ? (
                <button
                  onClick={handleFinish}
                  className="px-5 py-2 rounded-lg text-[13px] font-bold bg-[#0d9488] text-white hover:bg-[#0f766e] transition-all disabled:opacity-50"
                >
                  Start Demo
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="px-5 py-2 rounded-lg text-[13px] font-bold bg-[#0d9488] text-white hover:bg-[#0f766e] transition-all disabled:opacity-50"
                >
                  Next
                </button>
              )}
            </div>

            {/* Keyboard hint */}
            <div className="mt-3 text-center">
              <span className="text-[11px] text-[#94a3b8]">
                Arrow keys to navigate, Esc to close
              </span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  )
}
