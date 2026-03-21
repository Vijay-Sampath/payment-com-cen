'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface AnimatedCounterProps {
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  duration?: number
  className?: string
}

export function AnimatedCounter({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 800,
  className = '',
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(value)
  const [flashClass, setFlashClass] = useState('')
  const prevValue = useRef(value)
  const animRef = useRef<number | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const start = prevValue.current
    const end = value
    const delta = end - start
    const startTime = performance.now()

    if (animRef.current) cancelAnimationFrame(animRef.current)
    if (flashTimer.current) clearTimeout(flashTimer.current)

    // Flash effect when value changes significantly
    if (Math.abs(delta) > 0.5) {
      const isEscalation = delta > 0
      setFlashClass(isEscalation ? 'value-escalate' : 'value-recover')
      flashTimer.current = setTimeout(() => setFlashClass(''), 650)
    }

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Cubic ease-in-out with slight overshoot feel
      const t = progress
      const eased = t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2
      const current = start + (end - start) * eased
      setDisplay(current)

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        prevValue.current = end
      }
    }

    animRef.current = requestAnimationFrame(animate)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      if (flashTimer.current) clearTimeout(flashTimer.current)
    }
  }, [value, duration])

  const formatted = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toString()

  return (
    <span className={`${className} ${flashClass}`} style={{ display: 'inline-block' }}>
      {prefix}{formatted}{suffix}
    </span>
  )
}
