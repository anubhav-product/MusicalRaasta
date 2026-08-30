import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlayer } from '../player/context.js'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js'

/**
 * The always-there player. It sits along the bottom edge so the music is never hidden and
 * never competes with whatever owns the centre of the stage — the title card at the start
 * of a chapter, the hero player through the middle, the way onward at the end.
 */
export default function MiniPlayer({ accent, onOpenQueue, hidden }) {
  const { current, isPlaying, toggle, next, queue, fraction } = usePlayer()
  const reduced = usePrefersReducedMotion()

  const bar = (
    <AnimatePresence>
      {current && !hidden && (
        <motion.div
          initial={reduced ? { opacity: 0 } : { y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { y: 90, opacity: 0 }}
          transition={reduced ? { duration: 0.2 } : { type: 'spring', stiffness: 260, damping: 32 }}
          className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/55 backdrop-blur-xl"
        >
          {/* the track's own progress, drawn along the top edge of the bar */}
          <div className="absolute inset-x-0 top-0 h-px bg-white/10">
            <div className="h-full" style={{ background: accent, width: `${fraction * 100}%` }} />
          </div>

          <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-2.5 sm:px-6">
            <span className="h-10 w-10 shrink-0 overflow-hidden rounded-md ring-1 ring-white/15">
              {current.artwork && <img src={current.artwork} alt="" className="h-full w-full object-cover" />}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] text-white/90">{current.title}</span>
              <span className="block truncate text-[10px] tracking-[0.14em] text-white/45">
                {current.artist}
              </span>
            </span>

            <button
              type="button"
              onClick={toggle}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-black"
              style={{ background: accent }}
            >
              {isPlaying ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="ml-0.5">
                  <path d="M6 4l14 8-14 8z" />
                </svg>
              )}
            </button>

            <button
              type="button"
              onClick={next}
              aria-label="Next track"
              className="hidden h-9 w-9 shrink-0 items-center justify-center text-white/55 transition-colors hover:text-white sm:flex"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M16 5h2v14h-2zM4 5l11 7-11 7z" />
              </svg>
            </button>

            <button
              type="button"
              onClick={onOpenQueue}
              aria-label={`Show queue, ${queue.length} songs`}
              className="flex shrink-0 items-center gap-2 rounded-full border border-white/12 px-3 py-1.5 text-[10px] tracking-[0.2em] uppercase text-white/50 transition-colors hover:text-white"
            >
              <span className="hidden sm:inline">{queue.length} songs</span>
              <motion.span
                aria-hidden
                animate={reduced ? {} : { y: [0, -2.5, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 15l-6-6-6 6" />
                </svg>
              </motion.span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  // Portalled to the body for the same reason as the queue sheet: the page-transition
  // wrapper animates transform/filter, which would make it the containing block for this
  // fixed bar and pin it to the bottom of the 500vh scroll track instead of the viewport.
  return typeof document === 'undefined' ? bar : createPortal(bar, document.body)
}
