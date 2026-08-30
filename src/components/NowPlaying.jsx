import { motion, AnimatePresence } from 'framer-motion'
import { usePlayer } from '../player/context.js'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js'

const fmt = (s) => {
  if (!Number.isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

/** Four bars that breathe while audio is playing — the only "it's alive" cue on screen. */
function Equalizer({ active, color }) {
  const reduced = usePrefersReducedMotion()
  const bars = [0.5, 0.9, 0.65, 1]
  return (
    <span className="flex h-3 items-end gap-[2px]" aria-hidden>
      {bars.map((h, i) => (
        <motion.span
          key={i}
          className="w-[2px] rounded-full"
          style={{ background: color }}
          animate={
            active && !reduced
              ? { height: [`${h * 40}%`, '100%', `${h * 55}%`] }
              : { height: '35%' }
          }
          transition={
            active && !reduced
              ? { duration: 0.6 + i * 0.12, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }
              : { duration: 0.2 }
          }
        />
      ))}
    </span>
  )
}

/**
 * The centre of a chapter page: artwork, the track, and transport. It replaces the old
 * inline embed list — the song list itself now lives in the queue sheet, out of the way.
 */
export default function NowPlaying({ accent, mode = 'drift', onOpenQueue, titleClass = 'font-display' }) {
  const {
    current, isPlaying, toggle, next, prev, seek, nudge, fraction, progress, duration,
    needsGesture, index, queue,
    fullSongs, canOfferFullSongs, upgrading, upgradeError, enableFullSongs,
    youtubeAvailable, enableYouTube, disableYouTube, backend,
    volume, muted, setVolume, toggleMute,
  } = usePlayer()
  const reduced = usePrefersReducedMotion()

  if (!current) return null

  const swap = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 } }
    : mode === 'cut'
      ? {
          initial: { opacity: 0, y: 16, filter: 'blur(0px)' },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -12 },
          transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1] },
        }
      : {
          initial: { opacity: 0, y: 24, filter: 'blur(6px)' },
          animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
          exit: { opacity: 0, y: -18, filter: 'blur(6px)' },
          transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
        }

  return (
    <div className="pointer-events-auto relative flex w-full max-w-xl flex-col items-center gap-7">
      {/* guarantees legibility whatever the backdrop frame happens to be */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-32 -inset-y-24 -z-10"
        style={{
          background:
            'radial-gradient(60% 55% at 50% 50%, rgba(6,5,10,0.72) 0%, rgba(6,5,10,0.45) 45%, transparent 78%)',
        }}
      />
      {/* artwork */}
      <div className="relative">
        <motion.div
          aria-hidden
          className="absolute -inset-8 rounded-full opacity-45 blur-3xl"
          style={{ background: accent }}
          animate={reduced ? { opacity: 0.3 } : { opacity: isPlaying ? [0.3, 0.55, 0.3] : 0.22 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <AnimatePresence mode="wait">
          <motion.div
            key={current.trackId ?? current.title}
            {...swap}
            className="relative h-44 w-44 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/15 sm:h-56 sm:w-56"
          >
            {current.artwork ? (
              <motion.img
                src={current.artwork}
                alt=""
                className="h-full w-full object-cover"
                animate={reduced ? {} : { scale: isPlaying ? 1.04 : 1 }}
                transition={{ duration: 2.4, ease: 'easeOut' }}
              />
            ) : (
              <div className="h-full w-full" style={{ background: accent }} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* track */}
      <AnimatePresence mode="wait">
        <motion.div key={current.trackId ?? current.title} {...swap} className="w-full text-center">
          <div className="flex items-center justify-center gap-2.5">
            <Equalizer active={isPlaying} color={accent} />
            <span className="text-[10px] tracking-[0.28em] uppercase text-white/45">
              {index + 1} of {queue.length}
            </span>
          </div>
          <h2 className={`mt-3 text-balance px-4 text-3xl leading-tight sm:text-4xl ${titleClass}`}>
            {current.title}
          </h2>
          <p className="mt-2 text-sm tracking-[0.08em] text-white/60">{current.artist}</p>
        </motion.div>
      </AnimatePresence>

      {/* scrubber */}
      <div className="w-full px-4">
        <div
          role="slider"
          tabIndex={0}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(fraction * 100)}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            seek((e.clientX - r.left) / r.width)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') seek(Math.min(1, fraction + 0.05))
            if (e.key === 'ArrowLeft') seek(Math.max(0, fraction - 0.05))
          }}
          className="group relative h-8 cursor-pointer"
        >
          <div className="absolute top-1/2 h-[3px] w-full -translate-y-1/2 rounded-full bg-white/15">
            <motion.div
              className="h-full rounded-full"
              style={{ background: accent, width: `${fraction * 100}%` }}
            />
          </div>
          <motion.span
            className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
            style={{ background: accent, left: `calc(${fraction * 100}% - 6px)` }}
          />
        </div>
        <div className="flex justify-between text-[10px] tabular-nums tracking-widest text-white/40">
          <span>{fmt(progress)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>

      {/* transport */}
      <div className="flex items-center gap-4 sm:gap-6">
        <button
          type="button"
          onClick={() => nudge(-10)}
          aria-label="Back 10 seconds"
          className="flex flex-col items-center text-white/50 transition-colors hover:text-white"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
            <path d="M12 5V2L7 6l5 4V7a6 6 0 1 1-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="mt-0.5 text-[9px] tabular-nums tracking-wider">10</span>
        </button>

        <button
          type="button"
          onClick={prev}
          aria-label="Previous track"
          className="text-white/55 transition-colors hover:text-white"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M6 5h2v14H6zM20 5v14l-11-7z" />
          </svg>
        </button>

        <motion.button
          type="button"
          onClick={toggle}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          whileTap={reduced ? {} : { scale: 0.92 }}
          className="relative flex h-16 w-16 items-center justify-center rounded-full text-black shadow-xl"
          style={{ background: accent }}
        >
          {needsGesture && !reduced && (
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full"
              style={{ border: `2px solid ${accent}` }}
              animate={{ scale: [1, 1.35], opacity: [0.7, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
          {isPlaying ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="ml-1">
              <path d="M6 4l14 8-14 8z" />
            </svg>
          )}
        </motion.button>

        <button
          type="button"
          onClick={next}
          aria-label="Next track"
          className="text-white/55 transition-colors hover:text-white"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M16 5h2v14h-2zM4 5l11 7-11 7z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => nudge(10)}
          aria-label="Forward 10 seconds"
          className="flex flex-col items-center text-white/50 transition-colors hover:text-white"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
            <path d="M12 5V2l5 4-5 4V7a6 6 0 1 0 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="mt-0.5 text-[9px] tabular-nums tracking-wider">10</span>
        </button>
      </div>

      {/* volume */}
      <div className="flex w-full max-w-[15rem] items-center gap-3">
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? 'Unmute' : 'Mute'}
          className="shrink-0 text-white/50 transition-colors hover:text-white"
        >
          {muted || volume === 0 ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M11 5 6 9H3v6h3l5 4zM16.5 9.5l5 5m0-5-5 5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M11 5 6 9H3v6h3l5 4z" />
              <path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" />
            </svg>
          )}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={muted ? 0 : volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          aria-label="Volume"
          className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-white
                     [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3
                     [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full"
          style={{ accentColor: accent }}
        />
        <span className="w-7 shrink-0 text-right text-[10px] tabular-nums text-white/35">
          {Math.round((muted ? 0 : volume) * 100)}
        </span>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-5 text-[10px] tracking-[0.24em] uppercase">
          <button
            type="button"
            onClick={onOpenQueue}
            className="text-white/45 transition-colors hover:text-white"
          >
            Queue ({queue.length})
          </button>
          <span aria-hidden className="text-white/20">·</span>
          {current.youtubeId ? (
            <a
              href={`https://www.youtube.com/watch?v=${current.youtubeId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/45 transition-colors hover:text-white"
            >
              Watch video ↗
            </a>
          ) : (
            <a
              href={current.appleMusicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/45 transition-colors hover:text-white"
            >
              Open in Apple Music ↗
            </a>
          )}
        </div>

        {/* Say plainly that this is a clip, and offer the way out of it. */}
        {!fullSongs && (
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-[10px] tracking-[0.16em] text-white/35">
              30-second preview
            </p>
            {youtubeAvailable && (
              <button
                type="button"
                onClick={() => enableYouTube('yt-mount')}
                disabled={upgrading}
                className="rounded-full border px-4 py-1.5 text-[10px] tracking-[0.2em] uppercase transition-colors disabled:opacity-50"
                style={{ borderColor: `${accent}66`, color: accent }}
              >
                {upgrading ? 'Loading full song…' : 'Play full songs'}
              </button>
            )}
            {canOfferFullSongs && (
              <button
                type="button"
                onClick={enableFullSongs}
                disabled={upgrading}
                className="rounded-full border px-4 py-1.5 text-[10px] tracking-[0.2em] uppercase transition-colors disabled:opacity-50"
                style={{ borderColor: `${accent}66`, color: accent }}
              >
                {upgrading ? 'Connecting…' : 'Play full songs with Apple Music'}
              </button>
            )}
            {upgradeError && (
              <p className="max-w-xs text-center text-[10px] leading-snug text-white/35">{upgradeError}</p>
            )}
          </div>
        )}
        {fullSongs && (
          <div className="flex items-center gap-3 text-[10px] tracking-[0.16em]">
            <span style={{ color: accent }}>
              Full songs · {backend === 'youtube' ? 'YouTube' : 'Apple Music'}
            </span>
            {backend === 'youtube' && (
              <>
                <span aria-hidden className="text-white/20">·</span>
                <button
                  type="button"
                  onClick={disableYouTube}
                  className="uppercase tracking-[0.2em] text-white/35 transition-colors hover:text-white/80"
                >
                  Previews
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
