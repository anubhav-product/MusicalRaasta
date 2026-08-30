import { motion } from 'framer-motion'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js'

/**
 * A quiet legend for how this page works: scrolling travels through the stop, and the
 * arrows step between its images. Shown because neither is discoverable otherwise.
 */
export default function ControlHint({ accent, imageIndex, imageCount, onPrev, onNext }) {
  const reduced = usePrefersReducedMotion()

  return (
    <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/10 bg-black/35 px-3 py-2 backdrop-blur-md">
      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous image"
        className="text-white/50 transition-colors hover:text-white disabled:opacity-25"
        disabled={imageIndex <= 0}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <span className="flex items-center gap-1.5" aria-hidden>
        {Array.from({ length: imageCount }).map((_, i) => (
          <motion.span
            key={i}
            className="block rounded-full"
            animate={{
              width: i === imageIndex ? 12 : 4,
              height: 4,
              backgroundColor: i === imageIndex ? accent : 'rgba(255,255,255,0.28)',
            }}
            transition={reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 320, damping: 26 }}
          />
        ))}
      </span>

      <button
        type="button"
        onClick={onNext}
        aria-label="Next image"
        className="text-white/50 transition-colors hover:text-white disabled:opacity-25"
        disabled={imageIndex >= imageCount - 1}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      <span className="ml-1 hidden text-[9px] leading-tight tracking-[0.16em] uppercase text-white/35 sm:block">
        ↕ scroll · ←→ image
      </span>
    </div>
  )
}
