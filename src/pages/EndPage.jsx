import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { chapterImages, chapterThumbs, getRoad, SITE, typeFor } from '../lib/roads.js'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js'

/**
 * The closing stop of a road. Shared by both, re-themed per road.
 *
 * Arriving here should feel like arriving somewhere, so the page is built out of the last
 * stop's own light and carries a receipt of the drive: every stop you passed, in order, on
 * one dashed line you can step back onto at any point.
 */
export default function EndPage({ roadId }) {
  const road = getRoad(roadId)
  const other = roadId === 'within-you' ? getRoad('for-fun') : getRoad('within-you')
  const reduced = usePrefersReducedMotion()
  const last = road.chapters[road.chapters.length - 1]
  const accent = last.suggestedPalette[2]
  const signature = last.suggestedPalette[1]
  const total = road.chapters.reduce((n, c) => n + c.songs.length, 0)
  const type = typeFor(roadId)

  const closing =
    roadId === 'within-you'
      ? 'That was all of it — what you inherited, what keeps you up, what broke, what stayed, and the songs somebody handed you through one earphone. Nothing here got fixed, and nothing here was ever supposed to. But you sat with it a while, and that counts for something. Come back whenever the hour gets late again.'
      : 'Ears ringing, voice gone, completely fine. That was every drop, every dusty bass line, and one long amber highway to come down on. Nothing got solved and nothing needed to be. The road is still here the next time you need out of your own head.'

  return (
    <main className="relative flex min-h-svh flex-col justify-center overflow-hidden px-5 py-24 sm:px-8">
      <LastLight road={road} last={last} reduced={reduced} />

      <div className="relative mx-auto w-full max-w-3xl text-center">
        <motion.p
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className={`text-[10px] text-white/55 ${type.kicker}`}
        >
          {road.title} · end of the road
        </motion.p>

        <motion.h1
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className={`mt-6 text-[3rem] sm:text-7xl ${type.display}`}
          style={{ color: accent }}
        >
          Thanks for riding along
        </motion.h1>

        <motion.p
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg"
        >
          {closing}
        </motion.p>

        <TravelledRoad road={road} reduced={reduced} signature={signature} type={type} />

        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.8 }}
          className="mt-14 flex flex-col items-center gap-6"
        >
          <a
            href={SITE.coffee}
            target="_blank"
            rel="noopener noreferrer"
            className={`group flex items-center gap-3 rounded-full px-9 py-4 text-xl transition-transform duration-300 hover:scale-[1.03] ${type.display}`}
            style={{
              background: accent,
              color: last.suggestedPalette[0],
              boxShadow: `0 0 60px -12px ${signature}`,
            }}
          >
            <span aria-hidden>☕</span>
            Buy me a coffee
            <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </a>

          <p className="text-[10px] tracking-[0.26em] uppercase text-white/35">
            {road.chapters.length} stops · {total} songs · for {SITE.title}
          </p>

          {/* The byline belongs at the end of the road as well as on the landing page:
              a deep link drops you straight onto a stop, so this may be the only place a
              given visitor ever learns whose experience picked all of it. */}
          <p className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 text-[10px] tracking-[0.26em] uppercase text-white/45">
            Curated by
            {/* The lighter of the stop's two accents, not the signature: several roads end
                on a deep signature that leaves Devanagari muddy against their own light. */}
            <span
              lang="hi"
              className="font-deva text-2xl leading-none normal-case tracking-normal"
              style={{ color: accent }}
            >
              {SITE.author.deva}
            </span>
            <span>{SITE.author.name}</span>
          </p>
        </motion.div>

        <OtherRoad other={other} reduced={reduced} />

        <div className="mt-10 flex items-center justify-center gap-5 text-[10px] tracking-[0.24em] uppercase text-white/35">
          <Link to={road.base} state={{ direction: 'back' }} className="transition-colors hover:text-white/80">
            Back to the map
          </Link>
          <span aria-hidden className="text-white/15">·</span>
          <Link to="/" state={{ direction: 'back' }} className="transition-colors hover:text-white/80">
            The fork
          </Link>
        </div>
      </div>
    </main>
  )
}

/** The last stop's photography, held low on the frame like a horizon at dusk. */
function LastLight({ road, last, reduced }) {
  const images = useMemo(() => chapterImages(road.id, last.slug).slice(0, 4), [road, last])
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (reduced || images.length < 2) return
    const id = setInterval(() => setFrame((f) => (f + 1) % images.length), 6500)
    return () => clearInterval(id)
  }, [reduced, images.length])

  const p = last.suggestedPalette

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          loading={i === 0 ? 'eager' : 'lazy'}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[2200ms] ease-in-out"
          style={{ opacity: (reduced ? i === 0 : i === frame) ? 1 : 0 }}
        />
      ))}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(80% 55% at 50% 108%, ${p[1]}4d 0%, transparent 62%), linear-gradient(180deg, #07060a 0%, ${p[0]}e0 32%, ${p[0]}cc 62%, #07060af0 100%)`,
        }}
      />
      {/* the light going down behind the horizon */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/3"
        style={{ background: `linear-gradient(180deg, transparent 0%, ${p[0]} 70%, #07060a 100%)` }}
      />
    </div>
  )
}

/** Every stop you passed, in order, still one click away. */
function TravelledRoad({ road, reduced, signature, type }) {
  return (
    <motion.nav
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.85 }}
      aria-label={`The stops on ${road.title}`}
      className="relative mx-auto mt-14 max-w-2xl"
    >
      <p className="text-[10px] tracking-[0.3em] uppercase text-white/35">The road behind you</p>

      <ol className="relative mt-7 flex flex-wrap justify-center gap-x-2 gap-y-6 sm:flex-nowrap sm:gap-x-3">
        {/* the road, running back through every stop */}
        <span
          aria-hidden
          className="absolute inset-x-4 top-8 hidden border-t-2 border-dashed sm:block"
          style={{ borderColor: `${signature}33` }}
        />
        {road.chapters.map((c, i) => {
          const image = chapterThumbs(road.id, c.slug)[0]
          return (
            <li key={c.slug} className="relative z-10 w-[calc(33.333%-0.5rem)] sm:w-auto sm:flex-1">
              <Link
                to={`${road.base}/${c.slug}`}
                state={{ direction: 'back' }}
                className="group block"
                title={`${c.name} — ${c.songs.length} songs`}
              >
                <span
                  className="relative block aspect-square w-full overflow-hidden rounded-xl border transition-all duration-500 group-hover:scale-[1.06]"
                  style={{ borderColor: `${c.suggestedPalette[1]}59`, background: c.suggestedPalette[0] }}
                >
                  {image && (
                    <img
                      src={image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover opacity-70 transition-opacity duration-500 group-hover:opacity-100"
                    />
                  )}
                  <span
                    aria-hidden
                    className="absolute inset-0 mix-blend-color"
                    style={{ background: c.suggestedPalette[1], opacity: 0.35 }}
                  />
                </span>
                <span className="mt-2.5 block font-mono text-[9px] text-white/35">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  className={`mt-0.5 block text-[10px] leading-tight text-white/60 transition-colors duration-300 group-hover:text-white ${
                    type.kicker
                  } !tracking-[0.08em]`}
                >
                  {c.name}
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
    </motion.nav>
  )
}

/** The road not taken — offered as a place, not as a footnote. */
function OtherRoad({ other, reduced }) {
  const cover = chapterThumbs(other.id, other.chapters[0].slug)[1]
  const otherType = typeFor(other.id)

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9, duration: 0.85 }}
      className="mt-14"
    >
      <Link
        to={other.base}
        state={{ direction: 'forward' }}
        className="group relative flex items-center gap-5 overflow-hidden rounded-2xl border border-white/10 p-4 text-left transition-colors duration-500 hover:border-white/25 sm:p-5"
      >
        {cover && (
          <img
            src={cover}
            alt=""
            loading="lazy"
            decoding="async"
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
            style={{ filter: 'saturate(0.2) brightness(1.1)' }}
          />
        )}
        <span
          aria-hidden
          className="absolute inset-0 mix-blend-color"
          style={{ background: other.palette[1], opacity: 0.8 }}
        />
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `linear-gradient(100deg, ${other.palette[0]}e8 0%, ${other.palette[0]}c4 60%, ${other.palette[0]}96 100%)`,
          }}
        />

        <span className="relative z-10 min-w-0 flex-1">
          <span className="block text-[10px] tracking-[0.28em] uppercase text-white/50">
            The road not taken · {other.tagline}
          </span>
          <span
            className={`mt-2 block text-3xl sm:text-4xl ${otherType.display}`}
            style={{ color: other.palette[2] }}
          >
            {other.title}
          </span>
          <span className="mt-2 block text-xs text-white/55">
            {other.chapters.length} stops ·{' '}
            {other.chapters.reduce((n, c) => n + c.songs.length, 0)} songs waiting
          </span>
        </span>
        <span
          aria-hidden
          className="relative z-10 pr-1 text-2xl transition-transform duration-300 group-hover:translate-x-1.5"
          style={{ color: other.palette[2] }}
        >
          →
        </span>
      </Link>
    </motion.div>
  )
}
