import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ChapterBackdrop from '../components/ChapterBackdrop.jsx'
import RoadProgress from '../components/RoadProgress.jsx'
import NowPlaying from '../components/NowPlaying.jsx'
import QueueSheet from '../components/QueueSheet.jsx'
import MiniPlayer from '../components/MiniPlayer.jsx'
import { usePlayer } from '../player/context.js'
import ControlHint from '../components/ControlHint.jsx'
import {
  chapterImages, getChapter, getRoad, hindiFor, motionFor, nextStop, prevStop, typeFor,
} from '../lib/roads.js'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js'

/**
 * A chapter is a full-screen stage, not a document. Scrolling moves the imagery and the
 * chapter's own progress; the song list stays out of sight in the queue sheet until the
 * reader scrolls up for it. Three things share the screen over the scroll:
 *   the title card (start) -> the player (middle) -> the way onward (end).
 */
export default function ChapterPage({ roadId }) {
  const { chapterSlug } = useParams()
  const road = getRoad(roadId)
  const chapter = getChapter(roadId, chapterSlug)
  const reduced = usePrefersReducedMotion()
  const { loadQueue } = usePlayer()

  const [progress, setProgress] = useState(0)
  const [queueOpen, setQueueOpen] = useState(false)

  const images = useMemo(() => (chapter ? chapterImages(roadId, chapter.slug) : []), [roadId, chapter])
  const mode = chapter ? motionFor(roadId, chapter) : 'drift'

  // Arriving at a stop loads its songs and starts them. Autoplay is allowed because the
  // click that navigated here counts as user activation; on a cold deep link the player
  // falls back to a pulsing play button.
  useEffect(() => {
    if (!chapter) return
    loadQueue(`${roadId}/${chapter.slug}`, chapter.songs, { autoplay: true })
  }, [roadId, chapter, loadQueue])

  const openQueue = useCallback(() => setQueueOpen(true), [])
  const closeQueue = useCallback(() => setQueueOpen(false), [])

  // Images sit in the middle 80% of the scroll track, so stepping between them never
  // lands on the title card or the outro.
  const imageCount = images.length || 1
  const imageIndex = Math.min(
    imageCount - 1,
    Math.max(0, Math.round(Math.min(1, Math.max(0, (progress - 0.1) / 0.8)) * (imageCount - 1))),
  )
  const goToImage = useCallback((i) => {
    const clamped = Math.max(0, Math.min(imageCount - 1, i))
    const within = imageCount > 1 ? clamped / (imageCount - 1) : 0
    const target = (0.1 + within * 0.8) * (document.body.scrollHeight - window.innerHeight)
    window.scrollTo({ top: target, behavior: reduced ? 'auto' : 'smooth' })
  }, [imageCount, reduced])

  // Left/right steps the imagery; space toggles playback.
  useEffect(() => {
    if (queueOpen) return
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea, [contenteditable]')) return
      if (e.key === 'ArrowRight') { e.preventDefault(); goToImage(imageIndex + 1) }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goToImage(imageIndex - 1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goToImage, imageIndex, queueOpen])

  if (!chapter) return <Navigate to={road.base} replace />

  const next = nextStop(roadId, chapter.slug)
  const prev = prevStop(roadId, chapter.slug)
  const palette = chapter.suggestedPalette
  const accent = palette[2]
  const type = typeFor(roadId)

  // Scroll is the chapter's timeline. The three things that can own the centre of the
  // stage hand off in sequence and never share it: each one leaves along -Y as the next
  // arrives from +Y, and their opacity bands are disjoint, so they cross in time without
  // ever crossing in space.
  const band = (a, b) => Math.max(0, Math.min(1, (progress - a) / (b - a)))
  const titleGone = band(0.04, 0.11)
  const heroIn = band(0.13, 0.22)
  const heroGone = band(0.8, 0.87)
  const outroIn = band(0.88, 0.95)

  const title = { opacity: 1 - titleGone, y: -150 * titleGone }
  const hero = { opacity: heroIn * (1 - heroGone), y: 110 * (1 - heroIn) - 90 * heroGone }
  const outro = { opacity: outroIn, y: 90 * (1 - outroIn) }

  const words = chapter.name.split(' ')
  const stagger = mode === 'cut' ? 0.045 : 0.085

  return (
    <>
      <ChapterBackdrop images={images} palette={palette} mode={mode} onProgress={setProgress}>
        {/* top bar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 px-4 py-4 sm:px-8">
          <Link
            to={road.base}
            state={{ direction: 'back' }}
            className="pointer-events-auto rounded-full border border-white/10 bg-black/25 px-4 py-2 text-[10px] tracking-[0.24em] uppercase text-white/55 backdrop-blur-md transition-colors hover:text-white"
          >
            ← {road.title}
          </Link>
          <RoadProgress roadId={roadId} currentSlug={chapter.slug} accent={accent} mode={mode} />
        </div>

        {/* chapter progress rail */}
        <div className="absolute inset-y-0 left-0 hidden w-[2px] bg-white/5 lg:block" aria-hidden>
          <motion.div
            className="w-full origin-top"
            style={{ background: accent, height: `${progress * 100}%` }}
          />
        </div>

        {/* title card */}
        <div
          className="absolute inset-0 flex items-center justify-center px-6"
          style={{
            opacity: title.opacity,
            transform: `translate3d(0, ${title.y}px, 0)`,
            visibility: title.opacity < 0.02 ? 'hidden' : 'visible',
          }}
        >
          <div className="max-w-3xl text-center">
            <motion.p
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className={`text-[10px] text-white/55 ${type.kicker}`}
            >
              {road.title} · {chapter.kicker}
            </motion.p>
            {hindiFor(chapter.slug) && (
              <motion.p
                lang="hi"
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.7 }}
                className="mt-4 font-deva text-3xl leading-none sm:text-4xl"
                style={{ color: accent }}
              >
                {hindiFor(chapter.slug)}
              </motion.p>
            )}
            <h1 className={`mt-3 text-5xl sm:text-7xl lg:text-8xl ${type.heading}`}>
              {words.map((word, i) => (
                <Fragment key={`${word}-${i}`}>
                  <motion.span
                    className="inline-block"
                    initial={
                      reduced ? { opacity: 0 }
                        : mode === 'cut' ? { opacity: 0, y: 14, skewX: -8 } : { opacity: 0, y: 32 }
                    }
                    animate={{ opacity: 1, y: 0, skewX: 0 }}
                    transition={
                      reduced ? { duration: 0.2 }
                        : { delay: 0.1 + stagger * i, duration: mode === 'cut' ? 0.32 : 0.75,
                            ease: mode === 'cut' ? [0.16, 1, 0.3, 1] : [0.22, 1, 0.36, 1] }
                    }
                  >
                    {word}
                  </motion.span>
                  {i < words.length - 1 ? ' ' : null}
                </Fragment>
              ))}
            </h1>
            <motion.p
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + stagger * words.length + 0.1, duration: mode === 'cut' ? 0.4 : 0.8 }}
              className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-white/75"
            >
              {chapter.description}
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.7 }}
              className="mt-12 flex flex-col items-center gap-2"
            >
              <span className="text-[10px] tracking-[0.28em] uppercase text-white/40">
                {chapter.songs.length} songs · scroll to travel
              </span>
              <motion.span
                aria-hidden
                className="text-white/40"
                animate={reduced ? {} : { y: [0, 7, 0] }}
                transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </motion.span>
            </motion.div>
          </div>
        </div>

        {/* the player */}
        <div
          className="absolute inset-0 flex items-center justify-center px-6 pb-24"
          style={{
            opacity: hero.opacity,
            transform: `translate3d(0, ${hero.y}px, 0)`,
            visibility: hero.opacity < 0.02 ? 'hidden' : 'visible',
          }}
        >
          <NowPlaying
            accent={accent}
            mode={mode}
            onOpenQueue={openQueue}
            titleClass={roadId === 'for-fun' ? 'font-body font-semibold tracking-[-0.01em]' : 'font-display'}
          />
        </div>

        {/* the way onward */}
        <div
          className="absolute inset-0 flex items-center justify-center px-6 pb-24"
          style={{
            opacity: outro.opacity,
            transform: `translate3d(0, ${outro.y}px, 0)`,
            visibility: outro.opacity < 0.02 ? 'hidden' : 'visible',
          }}
        >
          <div className="pointer-events-auto w-full max-w-lg text-center">
            <p className="text-[10px] tracking-[0.3em] uppercase text-white/45">
              End of {chapter.name}
            </p>
            <Link
              to={next.href}
              state={{ direction: 'forward' }}
              className="group mt-6 block overflow-hidden rounded-2xl border px-7 py-6 backdrop-blur-md transition-colors"
              style={{ borderColor: `${accent}55`, background: `${accent}14` }}
            >
              <span className="block text-[10px] tracking-[0.28em] uppercase text-white/50">
                Continue to
              </span>
              <span className={`mt-2 block text-3xl sm:text-4xl ${type.heading}`} style={{ color: accent }}>
                {next.label}
              </span>
              <span
                aria-hidden
                className="mt-3 inline-block text-xl transition-transform duration-300 group-hover:translate-x-1"
                style={{ color: accent }}
              >
                →
              </span>
            </Link>
            <div className="mt-6 flex items-center justify-center gap-5 text-[10px] tracking-[0.24em] uppercase text-white/35">
              <Link to={prev.href} state={{ direction: 'back' }} className="transition-colors hover:text-white/80">
                ← {prev.label}
              </Link>
              <span aria-hidden className="text-white/15">·</span>
              <Link to={road.base} state={{ direction: 'back' }} className="transition-colors hover:text-white/80">
                The map
              </Link>
            </div>
          </div>
        </div>

        {/* how this page works */}
        <AnimatePresence>
          {!queueOpen && progress > 0.06 && progress < 0.94 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute inset-x-0 bottom-[4.75rem] flex justify-center"
            >
              <ControlHint
                accent={accent}
                imageIndex={imageIndex}
                imageCount={imageCount}
                onPrev={() => goToImage(imageIndex - 1)}
                onNext={() => goToImage(imageIndex + 1)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </ChapterBackdrop>

      {/* The bar and the hero player never both hold the transport: the bar carries the
          music while the title card and the outro own the centre, and stands down while
          the hero player is up. */}
      <MiniPlayer
        accent={accent}
        onOpenQueue={openQueue}
        hidden={queueOpen || hero.opacity > 0.6}
      />
      <QueueSheet
        open={queueOpen}
        onClose={closeQueue}
        accent={accent}
        mode={mode}
        chapterName={chapter.name}
      />
    </>
  )
}
