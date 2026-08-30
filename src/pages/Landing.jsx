import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ROADS, allStops, chapterImages, chapterThumbs, collageImages, siteTotals, SITE, typeFor,
} from '../lib/roads.js'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js'

/**
 * The landing page is the prologue of the journey, not a menu in front of it. It is told
 * in four movements that you scroll through in order:
 *
 *   I.   The threshold — the whole record playing at once behind the title.
 *   II.  The fork      — two roads drawn splitting apart, then offered side by side.
 *   III. The stops     — every room on both roads, laid out as a wall you can browse.
 *   IV.  The dedication — who it is for.
 *
 * Everything on it is built from the real chapter backdrops and the real song counts, so
 * the page is a view of the thing rather than an advertisement for it.
 */
export default function Landing() {
  const reduced = usePrefersReducedMotion()
  const totals = useMemo(() => siteTotals(), [])

  return (
    <main className="relative overflow-hidden">
      <Threshold reduced={reduced} totals={totals} />
      <Fork reduced={reduced} />
      <StopMarquee reduced={reduced} />
      <StopWall reduced={reduced} totals={totals} />
      <Dedication reduced={reduced} totals={totals} />
    </main>
  )
}

/* ------------------------------------------------------------------ movement I */

/**
 * A moodboard of every chapter's photography, drifting in columns at different speeds and
 * directions so it reads as depth rather than a wall. Each column's list is rendered twice
 * and translated by exactly -50%, which is what makes the loop seamless.
 */
function Moodboard() {
  const columns = 7
  const cols = useMemo(() => {
    const images = collageImages(3)
    return Array.from({ length: columns }, (_, c) => images.filter((_, i) => i % columns === c))
  }, [])

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute left-1/2 top-1/2 flex h-[150vh] w-[175vw] -translate-x-1/2 -translate-y-1/2 -rotate-[9deg] gap-2.5 sm:gap-3.5">
        {cols.map((col, c) => (
          <div key={c} className="min-w-0 flex-1 overflow-hidden">
            <div
              className="drift-col flex flex-col gap-2.5 sm:gap-3.5"
              style={{
                '--drift-duration': `${190 + c * 26}s`,
                '--drift-direction': c % 2 ? 'reverse' : 'normal',
              }}
            >
              {[...col, ...col].map((src, i) => (
                <img
                  key={`${src}-${i}`}
                  src={src}
                  alt=""
                  loading={i < 3 ? 'eager' : 'lazy'}
                  decoding="async"
                  className="h-[24vh] w-full rounded-xl object-cover sm:h-[30vh]"
                  style={{ filter: 'saturate(1.18) contrast(1.06) brightness(1.12)' }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Grade the collage toward each road's colour — warm on the side Within You will
          appear on, hot on For Fun's side — so the fork is implied before it is drawn. */}
      <div
        className="absolute inset-0 mix-blend-color"
        style={{
          background:
            'linear-gradient(100deg, #c98a4b 0%, rgba(0,0,0,0) 42%, rgba(0,0,0,0) 58%, #ff2e88 100%)',
          opacity: 0.42,
        }}
      />
      {/* Dark where the type is, clear where it is not: the photographs stay alive around
          the edges instead of the whole frame being sunk to make one headline readable. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(50% 50% at 50% 46%, rgba(7,6,10,0.94) 0%, rgba(7,6,10,0.84) 52%, rgba(7,6,10,0) 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(105% 78% at 50% 50%, rgba(7,6,10,0) 34%, rgba(7,6,10,0.72) 74%, #07060a 100%)',
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-96"
        style={{ background: 'linear-gradient(180deg, transparent 0%, #07060a 82%)' }}
      />
    </div>
  )
}

function Threshold({ reduced, totals }) {
  const line1 = ['Two', 'roads,']
  const line2 = ['one', 'playlist']
  const rise = (i, base) =>
    reduced
      ? { duration: 0.2 }
      : { delay: base + i * 0.085, duration: 1.05, ease: [0.22, 1, 0.36, 1] }

  return (
    <section className="relative flex min-h-svh flex-col items-center justify-center px-6 py-24 text-center sm:px-12">
      <Moodboard />

      <motion.p
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9 }}
        className="text-[10px] tracking-[0.46em] uppercase text-white/60 [text-shadow:0_2px_20px_rgba(7,6,10,0.95)]"
      >
        A mixtape for {SITE.title}
      </motion.p>

      {/* The Hindi line first: raasta is the word the whole site is named for. */}
      <motion.p
        lang="hi"
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.9 }}
        className="mt-6 font-deva text-3xl leading-none sm:text-5xl [text-shadow:0_2px_24px_rgba(7,6,10,0.95)]"
        style={{ color: '#fbbf24' }}
      >
        दो रास्ते, एक प्लेलिस्ट
      </motion.p>

      <h1 className="mt-4 font-display text-[3.4rem] leading-[0.9] sm:text-8xl lg:text-[8.5rem]">
        <span className="block">
          {line1.map((w, i) => (
            <Fragment key={w}>
              <motion.span
                className="inline-block"
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 46, rotateX: -38 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={rise(i, 0.15)}
              >
                {w}
              </motion.span>
              {i < line1.length - 1 ? ' ' : null}
            </Fragment>
          ))}
        </span>
        <span className="block italic" style={{ color: '#e8d3ab' }}>
          {line2.map((w, i) => (
            <Fragment key={w}>
              <motion.span
                className="inline-block"
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 46, rotateX: -38 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={rise(i, 0.34)}
              >
                {w}
              </motion.span>
              {i < line2.length - 1 ? ' ' : null}
            </Fragment>
          ))}
        </span>
      </h1>

      <motion.p
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.62, duration: 0.9 }}
        className="mx-auto mt-11 max-w-lg text-base leading-relaxed text-white/70 sm:text-lg"
      >
        One goes quiet and inward. One goes loud and fast. Both end up in the same place —
        and you can always come back to the fork.
      </motion.p>

      <motion.dl
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 1 }}
        className="mt-12 flex items-stretch gap-8 text-left sm:gap-12"
      >
        {[
          [totals.roads, 'roads'],
          [totals.stops, 'stops'],
          [totals.songs, 'songs'],
        ].map(([n, label]) => (
          <div key={label} className="flex items-baseline gap-2.5">
            <dt className="order-2 text-[10px] tracking-[0.28em] uppercase text-white/40">{label}</dt>
            <dd className="order-1 font-body text-3xl font-light text-white/90 sm:text-4xl">{n}</dd>
          </div>
        ))}
      </motion.dl>

      {/* The first inch of road: a line that draws itself downward and keeps going. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.25, duration: 1 }}
        className="absolute inset-x-0 bottom-8 flex flex-col items-center gap-3"
      >
        <span className="text-[10px] tracking-[0.32em] uppercase text-white/45 [text-shadow:0_2px_20px_rgba(7,6,10,0.95)]">
          Scroll to begin
        </span>
        <span className="relative block h-16 w-px overflow-hidden bg-white/12">
          <motion.span
            className="absolute inset-x-0 top-0 block h-6 bg-white/70"
            animate={reduced ? {} : { y: [-24, 64] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </span>
      </motion.div>
    </section>
  )
}

/* ----------------------------------------------------------------- movement II */

/**
 * The listener at the fork, seen from behind: someone in over-ear headphones standing
 * where the road divides, deciding. He is drawn three times — once in Within You's amber
 * shifted left, once in For Fun's magenta shifted right, then in near-black on top — so
 * each road's light catches one side of him. That is the whole page in one figure.
 */
const TRAVELLER = (
  <>
    {/* Sloped shoulders running out to rounded deltoids, then straight down. Rounding the
        whole torso instead reads as a chess pawn rather than a person. */}
    <path d="M23 150 L26 96 C26 81 36 72 47 69 C51 68 55.5 67 60 67 C64.5 67 69 68 73 69 C84 72 94 81 94 96 L97 150 Z" />
    <path d="M53 48 L67 48 L69 67 C66 65.5 63 65 60 65 C57 65 54 65.5 51 67 Z" />
    <ellipse cx="60" cy="38" rx="15" ry="17" />
    {/* the headband, as a filled arc so it takes the same rim light as everything else */}
    <path d="M38 40 A22 22 0 0 1 82 40 L77 40 A17 17 0 0 0 43 40 Z" />
    <rect x="33" y="31" width="14" height="24" rx="7" />
    <rect x="73" y="31" width="14" height="24" rx="7" />
  </>
)

function Traveller({ reduced }) {
  return (
    <motion.svg
      viewBox="0 0 120 150"
      aria-hidden
      className="relative z-10 h-40 w-auto sm:h-48"
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-15% 0px' }}
      transition={reduced ? { duration: 0.3 } : { duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
    >
      <defs>
        {/* he stands in the dark from the waist down rather than being cut off by an edge */}
        <linearGradient id="traveller-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="68%" stopColor="#fff" stopOpacity="1" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="traveller-mask">
          <rect width="120" height="150" fill="url(#traveller-fade)" />
        </mask>
      </defs>
      <g mask="url(#traveller-mask)">
        <g transform="translate(-2.6 0)" fill="#c98a4b" opacity="0.9">{TRAVELLER}</g>
        <g transform="translate(2.6 0)" fill="#ff2e88" opacity="0.9">{TRAVELLER}</g>
        <g fill="#0b0910">{TRAVELLER}</g>
      </g>
    </motion.svg>
  )
}

/** The road splitting in two under his feet, drawn once the section comes into view. */
function ForkRoad({ reduced }) {
  return (
    <svg
      viewBox="0 0 800 200"
      preserveAspectRatio="none"
      aria-hidden
      className="-mt-px -mb-px h-28 w-full"
    >
      <defs>
        <linearGradient id="fork-left" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c98a4b" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#c98a4b" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="fork-right" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff2e88" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#ff2e88" stopOpacity="0.85" />
        </linearGradient>
      </defs>
      <motion.path
        d="M400 0 L400 96 C400 158 200 142 200 200"
        fill="none" stroke="url(#fork-left)" strokeWidth="1.5"
        initial={reduced ? { opacity: 1 } : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, margin: '-15% 0px' }}
        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.path
        d="M400 0 L400 96 C400 158 600 142 600 200"
        fill="none" stroke="url(#fork-right)" strokeWidth="1.5"
        initial={reduced ? { opacity: 1 } : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, margin: '-15% 0px' }}
        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  )
}

/**
 * The traveller, then the road under him. Below `lg` the two panels stack, so a split
 * would point at nothing — the road simply carries on instead.
 */
function ForkDiagram({ reduced }) {
  return (
    <div className="mt-10 flex flex-col items-center">
      <Traveller reduced={reduced} />
      <div className="hidden w-full lg:block">
        <ForkRoad reduced={reduced} />
      </div>
      <span
        aria-hidden
        className="h-16 w-px lg:hidden"
        style={{ background: 'linear-gradient(180deg, #c98a4b8c 0%, transparent 100%)' }}
      />
    </div>
  )
}

/**
 * One road, offered. The panel cycles through that road's own chapter photography so the
 * choice previews what is behind it, duotoned hard into the road's signature colour — the
 * two panels have to read as two different worlds at a glance, not one design twice.
 * On a wide screen the hovered panel takes room from the other one.
 */
function RoadPanel({ road, index, reduced }) {
  const [hover, setHover] = useState(false)
  const [frame, setFrame] = useState(0)
  const ref = useRef(null)
  const [glow, setGlow] = useState({ x: 50, y: 50 })
  const type = typeFor(road.id)

  const covers = useMemo(
    () => road.chapters.map((c) => chapterImages(road.id, c.slug)[0]).filter(Boolean),
    [road],
  )
  const total = road.chapters.reduce((n, c) => n + c.songs.length, 0)

  // Slow on the slow road, quick on the loud one — the panels keep different time.
  useEffect(() => {
    if (reduced || covers.length < 2) return
    const period = road.id === 'for-fun' ? 2200 : 4200
    const id = setInterval(() => setFrame((f) => (f + 1) % covers.length), period)
    return () => clearInterval(id)
  }, [reduced, covers.length, road.id])

  const onMove = (e) => {
    if (reduced || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    setGlow({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 })
  }

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={reduced ? { duration: 0.2 } : { delay: index * 0.12, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      className="min-w-0 lg:h-full"
      style={{
        flexGrow: hover && !reduced ? 1.32 : 1,
        flexBasis: 0,
        transition: 'flex-grow 750ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <Link
        ref={ref}
        to={road.base}
        state={{ direction: 'forward' }}
        onMouseMove={onMove}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="group relative flex h-full min-h-[26rem] flex-col justify-end overflow-hidden rounded-[1.75rem] border border-white/10 p-7 transition-colors duration-500 hover:border-white/25 sm:min-h-[32rem] sm:p-10"
      >
        {covers.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover transition-[opacity,transform,filter] duration-[1200ms] ease-out"
            style={{
              opacity: (reduced ? i === 0 : i === frame) ? 1 : 0,
              transform: hover && !reduced ? 'scale(1.07)' : 'scale(1)',
              filter: `saturate(${hover && !reduced ? 1.05 : 0.22}) contrast(1.1) brightness(${road.id === 'within-you' ? 1.5 : 1.16})`,
            }}
          />
        ))}

        {/* duotone: the photograph keeps its luminance, the road keeps its colour */}
        <span
          aria-hidden
          className="absolute inset-0 mix-blend-color transition-opacity duration-700"
          style={{ background: road.palette[1], opacity: hover ? 0.3 : 0.82 }}
        />
        <span
          aria-hidden
          className="absolute inset-0 transition-opacity duration-700"
          style={{
            background: `linear-gradient(178deg, ${road.palette[0]}70 0%, ${road.palette[0]}17 15%, ${road.palette[0]}45 40%, ${road.palette[0]}e8 72%, ${road.palette[0]}fc 100%)`,
            opacity: hover ? 0.88 : 1,
          }}
        />
        {/* the cursor carries a little of the road's light with it */}
        {!reduced && (
          <span
            aria-hidden
            className="absolute inset-0 transition-opacity duration-500"
            style={{
              background: `radial-gradient(38% 34% at ${glow.x}% ${glow.y}%, ${road.palette[1]}3d 0%, transparent 70%)`,
              opacity: hover ? 1 : 0,
            }}
          />
        )}
        {/* A neutral plinth under the copy. The palette scrim above carries the road's
            colour, but on a narrow screen the panel is short enough that the blurb and
            the stop names land on whatever the photograph is doing — a lit dome, a blown
            sky — and a tint alone will not hold them. */}
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-3/5"
          style={{
            background:
              'linear-gradient(180deg, rgba(6,5,8,0) 0%, rgba(6,5,8,0.42) 38%, rgba(6,5,8,0.8) 100%)',
          }}
        />
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[3px] origin-left transition-transform duration-700 ease-out"
          style={{ background: road.palette[1], transform: hover ? 'scaleX(1)' : 'scaleX(0)' }}
        />

        <span className="absolute inset-x-0 top-0 z-10 hidden items-center justify-between p-7 sm:flex sm:p-10">
          <span className="font-mono text-[10px] tracking-[0.2em] text-white/45">
            {String(index + 1).padStart(2, '0')} / 02
          </span>
          <span className="flex items-center gap-1.5">
            {road.palette.map((c) => (
              <span
                key={c}
                className="block h-1.5 w-6 rounded-full"
                style={{ background: c, boxShadow: '0 0 0 1px rgba(255,255,255,0.16) inset' }}
              />
            ))}
          </span>
        </span>

        <span className="relative z-10 block">
          <span className="flex items-center gap-3 text-[10px] tracking-[0.34em] uppercase text-white/55">
            <span className="block h-1.5 w-1.5 rounded-full" style={{ background: road.palette[1] }} />
            {road.tagline}
          </span>

          <span
            className={`mt-7 block text-[3.25rem] sm:text-7xl ${type.display}`}
            style={{ color: road.palette[2] }}
          >
            {road.title}
          </span>

          <span className="mt-5 block max-w-md text-sm leading-relaxed text-white/70">
            {road.blurb}
          </span>

          {/* the stops themselves, so the choice is informed rather than blind */}
          <span className="mt-6 flex flex-wrap gap-x-2 gap-y-1.5 text-[10px] tracking-[0.14em] uppercase text-white/40">
            {road.chapters.map((c, i) => (
              <Fragment key={c.slug}>
                {i > 0 && <span aria-hidden className="text-white/15">/</span>}
                <span className="transition-colors duration-500 group-hover:text-white/65">{c.name}</span>
              </Fragment>
            ))}
          </span>

          <span className="mt-8 flex items-center justify-between gap-4 border-t border-white/10 pt-5">
            <span className="text-[10px] tracking-[0.24em] uppercase text-white/50">
              {road.chapters.length} stops · {total} songs
            </span>
            <span
              className="flex items-center gap-2 text-[10px] tracking-[0.26em] uppercase transition-colors duration-300"
              style={{ color: hover ? road.palette[2] : 'rgba(255,255,255,0.5)' }}
            >
              Take this road
              <span
                aria-hidden
                className="text-base transition-transform duration-500 group-hover:translate-x-1.5"
              >
                →
              </span>
            </span>
          </span>
        </span>
      </Link>
    </motion.div>
  )
}

function Fork({ reduced }) {
  const roads = [ROADS['within-you'], ROADS['for-fun']]

  return (
    <section className="relative px-4 pb-20 pt-4 sm:px-8 sm:pb-28">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-12% 0px' }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
        >
          <p className="text-[10px] tracking-[0.4em] uppercase text-white/40">The fork</p>
          <h2 className="mt-4 font-display text-4xl leading-tight sm:text-6xl">
            Pick a <span className="italic text-[#e8d3ab]">direction</span>
          </h2>
        </motion.div>

        <ForkDiagram reduced={reduced} />

        <div className="flex flex-col gap-4 lg:h-[38rem] lg:flex-row">
          {roads.map((road, i) => (
            <RoadPanel key={road.id} road={road} index={i} reduced={reduced} />
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------- the interlude */

/** The whole journey as one unbroken line of stop names, running past. */
function StopMarquee() {
  const stops = useMemo(() => allStops(), [])
  const run = [...stops, ...stops]

  return (
    <div
      aria-hidden
      className="relative flex overflow-hidden border-y border-white/[0.07] py-5"
      style={{
        maskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)',
        WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)',
      }}
    >
      <div className="marquee-track flex shrink-0 items-center gap-8 whitespace-nowrap pr-8">
        {run.map(({ roadId, chapter }, i) => (
          <span key={`${roadId}-${chapter.slug}-${i}`} className="flex items-center gap-8">
            <span
              className={`text-lg sm:text-2xl ${
                roadId === 'for-fun'
                  ? 'font-loud uppercase tracking-[0.02em] text-white/30'
                  : 'font-display italic text-white/35'
              }`}
            >
              {chapter.name}
            </span>
            <span
              className="block h-1 w-1 shrink-0 rounded-full"
              style={{ background: chapter.suggestedPalette[1] }}
            />
          </span>
        ))}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- movement III */

// Deliberately uneven tile heights — an even grid of twelve photographs reads as a
// catalogue, and this is meant to read as a pinboard. Narrow columns get the portrait
// set so the caption always has room; see `.stop-tile` in index.css.
const TILE_RATIOS = [0.76, 0.88, 0.82, 0.7, 0.86, 0.78, 0.72, 0.8, 0.9, 0.84, 0.68, 0.86]
const TILE_RATIOS_WIDE = [0.78, 1.15, 0.92, 1.32, 0.84, 1.05, 1.28, 0.8, 1.1, 0.9, 1.35, 0.86]

function StopTile({ stop, i, reduced }) {
  const { roadId, road, chapter, index } = stop
  const [hover, setHover] = useState(false)
  const image = chapterThumbs(roadId, chapter.slug)[i % 3 === 0 ? 0 : 2]
  const p = chapter.suggestedPalette
  const type = typeFor(roadId)

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 34 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-6% 0px' }}
      transition={reduced ? { duration: 0.2 } : { delay: (i % 4) * 0.07, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
      className="mb-3 break-inside-avoid sm:mb-4"
    >
      <Link
        to={`${road.base}/${chapter.slug}`}
        state={{ direction: 'forward' }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="stop-tile group relative block overflow-hidden rounded-2xl border border-white/10 transition-colors duration-500 hover:border-white/25"
        style={{
          '--tile-ar': TILE_RATIOS[i % TILE_RATIOS.length],
          '--tile-ar-wide': TILE_RATIOS_WIDE[i % TILE_RATIOS_WIDE.length],
          background: p[0],
        }}
      >
        {image && (
          <img
            src={image}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-[transform,filter] duration-[1100ms] ease-out"
            style={{
              transform: hover && !reduced ? 'scale(1.08)' : 'scale(1)',
              filter: `saturate(1.15) contrast(1.09) brightness(${hover && !reduced ? 1 : 0.84})`,
            }}
          />
        )}
        <span
          aria-hidden
          className="absolute inset-0 mix-blend-color transition-opacity duration-700"
          style={{ background: p[1], opacity: hover ? 0.1 : 0.5 }}
        />
        <span
          aria-hidden
          className="absolute inset-0 transition-opacity duration-700"
          style={{
            background: `linear-gradient(180deg, ${p[0]}00 0%, ${p[0]}73 30%, ${p[0]}e6 62%, ${p[0]}ff 88%)`,
            opacity: hover ? 0.86 : 1,
          }}
        />
        {/* A neutral plinth under the caption. The palette-tinted scrim above carries the
            stop's colour, but several of these photographs are pale enough that a tint
            alone leaves cream type sitting at about 2:1 against them. */}
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-2/5"
          style={{
            background:
              'linear-gradient(180deg, rgba(6,5,8,0) 0%, rgba(6,5,8,0.55) 46%, rgba(6,5,8,0.88) 100%)',
          }}
        />
        <span
          aria-hidden
          className="absolute inset-x-4 bottom-0 h-px origin-left transition-transform duration-700 ease-out"
          style={{ background: p[2], transform: hover ? 'scaleX(1)' : 'scaleX(0)' }}
        />

        <span className="absolute inset-x-0 top-0 flex items-center gap-2 p-4">
          <span className="block h-1.5 w-1.5 rounded-full" style={{ background: road.palette[1] }} />
          <span className="text-[9px] tracking-[0.26em] uppercase text-white/50">{road.title}</span>
        </span>

        <span className="absolute inset-x-0 bottom-0 flex flex-col p-4 sm:p-5">
          <span className="font-mono text-[10px] tabular-nums text-white/40">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span
            className={`mt-1.5 block text-xl leading-tight sm:text-2xl ${type.heading}`}
            style={{ color: p[2] }}
          >
            {chapter.name}
          </span>
          <span className="mt-2 text-[10px] tracking-[0.2em] uppercase text-white/45">
            {chapter.songs.length} songs
          </span>
        </span>
      </Link>
    </motion.div>
  )
}

function StopWall({ reduced, totals }) {
  const stops = useMemo(() => allStops(), [])

  return (
    <section className="relative px-4 py-20 sm:px-8 sm:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 40% at 15% 12%, #c98a4b14 0%, transparent 60%), radial-gradient(60% 40% at 85% 20%, #ff2e8814 0%, transparent 60%)',
        }}
      />
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-12% 0px' }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 flex flex-wrap items-end justify-between gap-6 sm:mb-14"
        >
          <div>
            <p className="text-[10px] tracking-[0.4em] uppercase text-white/40">
              Every stop · {totals.stops} rooms · both roads
            </p>
            <h2 className="mt-4 max-w-xl font-display text-4xl leading-tight sm:text-6xl">
              Walk in <span className="italic text-[#e8d3ab]">anywhere</span>
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-white/55">
            Or skip the fork entirely and walk straight into any one of them. Every stop is its
            own page, with its own light.
          </p>
        </motion.div>

        <div className="columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4">
          {stops.map((stop, i) => (
            <StopTile key={`${stop.roadId}-${stop.chapter.slug}`} stop={stop} i={i} reduced={reduced} />
          ))}
        </div>
      </div>
    </section>
  )
}

/* ----------------------------------------------------------------- movement IV */

function Dedication({ reduced, totals }) {
  return (
    <section className="relative px-6 pb-24 pt-0 text-center sm:px-12 sm:pb-28">
      <div className="mx-auto max-w-xl">
        <div aria-hidden className="hairline mx-auto h-px w-40" />
        <motion.p
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15% 0px' }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 font-display text-2xl italic leading-relaxed text-white/70 sm:text-3xl"
        >
          {totals.songs} songs, collected and put in an order that means something.
          Built for {SITE.title} — take whichever road you need today.
        </motion.p>
        <p className="mt-10 text-[10px] tracking-[0.32em] uppercase text-white/30">
          Two roads · one playlist
        </p>
      </div>
    </section>
  )
}
