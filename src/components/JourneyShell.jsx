import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { paletteForPath, transitionFor } from '../lib/roads.js'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js'

/**
 * Owns the between-page feeling for the whole site.
 *
 * The two roads leave a stop differently on purpose. "Within You" bleeds: the palette you
 * are leaving floods the screen and the palette you are arriving into washes down through
 * it, so the colour is continuous even though the URL changed. "For Fun" cuts: the new
 * chapter's signature colour slams in and is gone in under a fifth of a second, announcing
 * that the energy just changed rather than smoothing it over.
 */
export default function JourneyShell() {
  const location = useLocation()
  const reduced = usePrefersReducedMotion()
  const palette = paletteForPath(location.pathname)
  const feel = transitionFor(location.pathname)
  const direction = location.state?.direction === 'back' ? 'back' : 'forward'
  const forward = direction === 'forward'

  // Remember the palette we are leaving so the bleed has something to bleed *from*.
  const prevPalette = useRef(palette)
  const [bleed, setBleed] = useState(null)

  useLayoutEffect(() => {
    const from = prevPalette.current
    prevPalette.current = palette
    if (from.join() === palette.join()) return
    setBleed({ id: location.key, from, to: palette, feel, forward })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  // Each stop is its own page: always arrive at the top of it.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  const pageVariants = reduced
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.2 } },
        exit: { opacity: 0, transition: { duration: 0.15 } },
      }
    : feel === 'cut'
      ? {
          // fast, mechanical, no softening
          initial: { opacity: 0, scale: 1.04 },
          animate: { opacity: 1, scale: 1, transition: { duration: 0.26, ease: [0.16, 1, 0.3, 1] } },
          exit: { opacity: 0, scale: 0.985, transition: { duration: 0.14, ease: [0.7, 0, 0.84, 0] } },
        }
      : {
          initial: { opacity: 0.12, x: forward ? 44 : -44, filter: 'blur(9px)' },
          animate: {
            opacity: 1,
            x: 0,
            filter: 'blur(0px)',
            transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
          },
          exit: {
            opacity: 0,
            x: forward ? -32 : 44,
            filter: 'blur(11px)',
            transition: { duration: 0.42, ease: [0.4, 0, 1, 1] },
          },
        }

  return (
    <div
      className="relative min-h-svh"
      style={{
        '--road-deep': palette[0],
        '--road-signature': palette[1],
        '--road-light': palette[2],
      }}
    >
      {/* Lives above the router so it survives route changes. Focusing the wrapper
          directly instead of following the href keeps the hash out of the URL, which
          would otherwise end up in every shared link. */}
      <a
        href="#journey-main"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('journey-main')?.focus()
        }}
      >
        Skip to content
      </a>

      <AnimatePresence>
        {bleed && !reduced && (
          <BleedVeil
            key={bleed.id}
            {...bleed}
            onDone={() => setBleed((b) => (b && b.id === bleed.id ? null : b))}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          id="journey-main"
          tabIndex={-1}
          key={location.pathname}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="relative z-20 min-h-svh outline-none"
          style={{ backgroundColor: palette[0] }}
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function BleedVeil({ from, to, feel, forward, onDone }) {
  if (feel === 'cut') {
    // One hard strike of the incoming signature colour.
    return (
      <motion.div
        className="pointer-events-none fixed inset-0 z-40"
        style={{ background: to[1], mixBlendMode: 'screen' }}
        initial={{ opacity: 0.55 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.17, ease: [0.7, 0, 0.84, 0] }}
        onAnimationComplete={onDone}
        aria-hidden
      />
    )
  }

  // Two layers: the palette being left floods first, then the arriving palette wipes
  // down through it, so one road's colour dissolves into the next rather than cutting.
  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-40"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.5, delay: 0.45, ease: 'easeInOut' }}
      onAnimationComplete={onDone}
      aria-hidden
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(${forward ? 105 : 255}deg, ${from[0]} 0%, ${from[1]} 55%, ${from[2]} 100%)`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.92, 0.92] }}
        transition={{ duration: 0.5, times: [0, 0.45, 1], ease: 'easeOut' }}
      />
      <motion.div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(${forward ? 105 : 255}deg, ${to[0]} 0%, ${to[1]} 52%, ${to[2]} 100%)`,
        }}
        initial={{ clipPath: 'inset(0 0 100% 0)' }}
        animate={{ clipPath: 'inset(0 0 0% 0)' }}
        transition={{ duration: 0.62, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
      />
    </motion.div>
  )
}
