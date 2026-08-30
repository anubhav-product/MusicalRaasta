import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlayer } from '../player/context.js'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js'

/**
 * The song list, kept out of the way. A slim now-playing bar is the only thing on screen
 * by default; the full queue rises over the chapter when the reader scrolls up, drags the
 * handle, or clicks it. Scrolling down again, Escape, or the scrim puts it away.
 */
const fmtDur = (ms) => {
  if (!ms) return ''
  const total = Math.round(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export default function QueueSheet({ open, onClose, accent, mode = 'drift', chapterName }) {
  const { queue, index, playAt, isPlaying } = usePlayer()
  const reduced = usePrefersReducedMotion()
  const listRef = useRef(null)
  const activeRef = useRef(null)

  // Keep the playing track in view whenever the sheet opens or the track changes.
  useEffect(() => {
    if (!open || !activeRef.current) return
    activeRef.current.scrollIntoView({
      block: 'center',
      behavior: reduced ? 'auto' : 'smooth',
    })
  }, [open, index, reduced])

  // The page behind must not scroll while the queue is up.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const spring = reduced
    ? { duration: 0.2 }
    : mode === 'cut'
      ? { type: 'spring', stiffness: 520, damping: 42 }
      : { type: 'spring', stiffness: 260, damping: 34 }

  const sheet = (
    <>
      {/* expanded queue */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0.15 : 0.3 }}
              onClick={onClose}
              aria-hidden
            />
            <motion.div
              role="dialog"
              aria-label="Queue"
              className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[84svh] w-full max-w-3xl flex-col rounded-t-3xl border border-b-0 border-white/15 bg-[#0c0b12]/97 shadow-[0_-30px_80px_rgba(0,0,0,0.65)] backdrop-blur-2xl"
              initial={reduced ? { opacity: 0 } : { y: '100%' }}
              animate={reduced ? { opacity: 1 } : { y: 0 }}
              exit={reduced ? { opacity: 0 } : { y: '100%' }}
              transition={spring}
              drag={reduced ? false : 'y'}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.45 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 110 || info.velocity.y > 550) onClose()
              }}
            >
              <div className="flex shrink-0 cursor-grab flex-col items-center pt-3 active:cursor-grabbing">
                <span className="h-1 w-10 rounded-full bg-white/25" aria-hidden />
              </div>

              <div className="flex shrink-0 items-center justify-between px-5 py-4 sm:px-7">
                <div className="min-w-0">
                  <p className="text-[10px] tracking-[0.28em] uppercase" style={{ color: accent }}>
                    Up next
                  </p>
                  <p className="mt-1 truncate text-sm text-white/70">
                    {chapterName ? `${chapterName} · ` : ''}{queue.length} songs
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-white/15 px-4 py-2 text-[10px] tracking-[0.24em] uppercase text-white/60 transition-colors hover:text-white"
                >
                  Close
                </button>
              </div>

              <ol ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-8 sm:px-4">
                {queue.map((song, i) => {
                  const active = i === index
                  return (
                    <li key={`${song.trackId ?? song.title}-${i}`} ref={active ? activeRef : null}>
                      <button
                        type="button"
                        onClick={() => { playAt(i); onClose() }}
                        aria-current={active ? 'true' : undefined}
                        className="flex w-full items-center gap-3 rounded-xl border-l-2 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
                        style={{
                          background: active ? `${accent}1a` : undefined,
                          borderLeftColor: active ? accent : 'transparent',
                        }}
                      >
                        <span className="w-6 shrink-0 text-center font-mono text-[10px] tabular-nums text-white/35">
                          {active && isPlaying ? (
                            <span className="inline-flex h-3 items-end gap-[2px]" aria-label="Playing">
                              {[0, 1, 2].map((b) => (
                                <motion.span
                                  key={b}
                                  className="w-[2px] rounded-full"
                                  style={{ background: accent }}
                                  animate={reduced ? { height: '40%' } : { height: ['30%', '100%', '45%'] }}
                                  transition={{ duration: 0.55 + b * 0.15, repeat: Infinity, repeatType: 'mirror' }}
                                />
                              ))}
                            </span>
                          ) : (
                            String(i + 1).padStart(2, '0')
                          )}
                        </span>
                        <span className="h-10 w-10 shrink-0 overflow-hidden rounded-md ring-1 ring-white/10">
                          {song.artwork && (
                            <img src={song.artwork} alt="" loading="lazy" className="h-full w-full object-cover" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className="block truncate text-[15px] leading-tight"
                            style={{ color: active ? accent : 'rgba(255,255,255,0.92)' }}
                          >
                            {song.title}
                          </span>
                          <span className="block truncate text-[11px] tracking-[0.06em] text-white/45">
                            {song.artist}
                          </span>
                        </span>
                        <span className="shrink-0 pl-2 font-mono text-[10px] tabular-nums text-white/30">
                          {fmtDur(song.durationMs)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )

  // Portalled to the body: the page-transition wrapper animates transform/filter, which
  // would otherwise become the containing block for these fixed layers.
  return typeof document === 'undefined' ? sheet : createPortal(sheet, document.body)
}
