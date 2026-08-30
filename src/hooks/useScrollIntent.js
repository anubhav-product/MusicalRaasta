import { useEffect, useRef } from 'react'

/**
 * Detects a deliberate upward scroll and fires `onReveal`.
 *
 * Wheel and touch are read directly rather than watching scrollTop, because the gesture
 * has to work at the very top of the page where there is nothing left to scroll. Upward
 * delta accumulates and decays, so a sustained pull opens the queue while an incidental
 * flick does not. Any downward movement resets the accumulator and fires `onDismiss`.
 */
export function useScrollIntent({ onReveal, onDismiss, threshold = 130, enabled = true }) {
  const accum = useRef(0)
  const lastTouch = useRef(0)

  useEffect(() => {
    if (!enabled) return

    const push = (delta) => {
      // delta < 0 means moving up the page
      if (delta < 0) {
        accum.current += -delta
        if (accum.current > threshold) {
          accum.current = 0
          onReveal?.()
        }
      } else if (delta > 2) {
        accum.current = 0
        onDismiss?.()
      }
    }

    const onWheel = (e) => push(e.deltaY)
    const onTouchStart = (e) => { lastTouch.current = e.touches[0].clientY; accum.current = 0 }
    const onTouchMove = (e) => {
      const y = e.touches[0].clientY
      // dragging finger down == scrolling up
      push(lastTouch.current - y)
      lastTouch.current = y
    }
    const decay = setInterval(() => { accum.current *= 0.72 }, 220)

    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    return () => {
      clearInterval(decay)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
    }
  }, [onReveal, onDismiss, threshold, enabled])
}
