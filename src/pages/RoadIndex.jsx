import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { chapterImages, getRoad, motionFor, typeFor } from '../lib/roads.js'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js'

/**
 * The map of one road. Not a table of contents — a route drawn top to bottom, with the
 * stops hung off a dashed centre line in the order you would drive them. Each milestone
 * alternates sides so the eye is pulled down the road rather than down a column, and the
 * line between two stops is the road itself: dashed, in that road's signature colour.
 */
export default function RoadIndex({ roadId }) {
  const road = getRoad(roadId)
  const reduced = usePrefersReducedMotion()
  const cut = road.motion === 'cut'
  const type = typeFor(roadId)
  const total = road.chapters.reduce((n, c) => n + c.songs.length, 0)

  return (
    <main className="relative min-h-svh pb-28">
      <RoadHero road={road} type={type} total={total} reduced={reduced} cut={cut} />

      <div className="relative mx-auto max-w-5xl px-5 pt-16 sm:px-8 sm:pt-24">
        {/* The road. It runs behind the milestones, from the first stop to the last. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-[1.35rem] w-0 border-l-2 border-dashed lg:left-1/2 lg:-translate-x-1/2"
          style={{ borderColor: `${road.palette[1]}3d` }}
        />

        <ol className="relative space-y-14 sm:space-y-20">
          {road.chapters.map((c, i) => (
            <Milestone
              key={c.slug}
              road={road}
              chapter={c}
              index={i}
              type={type}
              reduced={reduced}
              cut={cut}
              breather={motionFor(roadId, c) !== road.motion}
              images={chapterImages(roadId, c.slug)}
            />
          ))}
        </ol>

        <RoadFoot road={road} type={type} reduced={reduced} />
      </div>
    </main>
  )
}

/* --------------------------------------------------------------------- the head */

function RoadHero({ road, type, total, reduced, cut }) {
  // A strip of this road's own photography, so the header is made of the journey rather
  // than of a gradient. Duotoned hard into the road's colour — the two roads have to be
  // unmistakable from the first frame.
  const strip = useMemo(
    () => road.chapters.map((c) => chapterImages(road.id, c.slug)[0]).filter(Boolean),
    [road],
  )

  return (
    <header className="relative overflow-hidden px-5 pb-14 pt-20 sm:px-8 sm:pb-20 sm:pt-24">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 flex">
          {strip.map((src, i) => (
            <img
              key={src}
              src={src}
              alt=""
              loading={i < 2 ? 'eager' : 'lazy'}
              decoding="async"
              className="h-full min-w-0 flex-1 object-cover"
              style={{ filter: 'saturate(0.18) contrast(1.12) brightness(1.3)' }}
            />
          ))}
        </div>
        <div
          className="absolute inset-0 mix-blend-color"
          style={{ background: road.palette[1], opacity: 0.86 }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, ${road.palette[0]}70 0%, ${road.palette[0]}b3 40%, ${road.palette[0]}ed 74%, #07060a 100%)`,
          }}
        />
      </div>

      <div className="mx-auto max-w-5xl">
        <Link
          to="/"
          state={{ direction: 'back' }}
          className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/25 px-4 py-2 text-[10px] tracking-[0.28em] uppercase text-white/60 backdrop-blur-md transition-colors hover:border-white/30 hover:text-white"
        >
          ← The fork
        </Link>

        <motion.p
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className={`mt-12 text-[10px] text-white/55 ${type.kicker}`}
        >
          {road.tagline}
        </motion.p>

        <motion.h1
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: cut ? 16 : 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: cut ? 0.35 : 0.85, ease: [0.22, 1, 0.36, 1] }}
          className={`mt-7 text-[3.6rem] sm:text-8xl lg:text-9xl ${type.display}`}
          style={{ color: road.palette[2] }}
        >
          {road.title}
        </motion.h1>

        <motion.p
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: cut ? 0.35 : 0.7 }}
          className="mt-7 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg"
        >
          {road.blurb}
        </motion.p>

        <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-3">
          {[
            [road.chapters.length, 'stops'],
            [total, 'songs'],
          ].map(([n, label]) => (
            <span key={label} className="flex items-baseline gap-2">
              <span className="font-body text-2xl font-light text-white/90">{n}</span>
              <span className="text-[10px] tracking-[0.28em] uppercase text-white/45">{label}</span>
            </span>
          ))}
          <Link
            to={`${road.base}/${road.chapters[0].slug}`}
            state={{ direction: 'forward' }}
            className="group flex items-center gap-2.5 rounded-full px-6 py-3 text-[11px] tracking-[0.24em] uppercase transition-transform duration-300 hover:scale-[1.03]"
            style={{ background: road.palette[1], color: road.palette[0] }}
          >
            Start the drive
            <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>
      </div>
    </header>
  )
}

/* --------------------------------------------------------------- one milestone */

function Milestone({ road, chapter, index, type, reduced, cut, breather, images }) {
  const p = chapter.suggestedPalette
  const flip = index % 2 === 1
  const image = images[index % 2 === 0 ? 0 : 3] ?? images[0]

  return (
    <motion.li
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: cut ? 18 : 38 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-12% 0px' }}
      transition={{ duration: cut ? 0.35 : 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      {/* the marker where this stop meets the road */}
      <span
        aria-hidden
        className="absolute top-7 left-[1.35rem] z-10 flex h-3.5 w-3.5 -translate-x-1/2 items-center justify-center rounded-full lg:left-1/2"
        style={{ background: p[1], boxShadow: `0 0 0 5px #07060a, 0 0 22px ${p[1]}` }}
      />

      <Link
        to={`${road.base}/${chapter.slug}`}
        state={{ direction: 'forward' }}
        className="group grid items-center gap-5 pl-12 lg:grid-cols-2 lg:gap-14 lg:pl-0"
      >
        <div
          className={`relative overflow-hidden rounded-2xl border border-white/10 transition-colors duration-500 group-hover:border-white/25 ${
            flip ? 'lg:order-2' : 'lg:order-1'
          }`}
          style={{ aspectRatio: 1.58, background: p[0] }}
        >
          {image && (
            <img
              src={image}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover brightness-110 transition-transform duration-[1100ms] ease-out group-hover:scale-[1.06]"
            />
          )}
          <span
            aria-hidden
            className="absolute inset-0 transition-opacity duration-700 group-hover:opacity-40"
            style={{
              background: `linear-gradient(${flip ? 250 : 110}deg, ${p[0]}00 0%, ${p[0]}52 60%, ${p[0]}b8 100%)`,
            }}
          />
          {/* the stop's number, set large enough to be a landmark */}
          <span
            aria-hidden
            className="absolute right-4 bottom-2 font-body text-6xl font-light leading-none text-white/15 transition-colors duration-500 group-hover:text-white/30 sm:text-7xl"
          >
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>

        <div className={flip ? 'lg:order-1 lg:text-right' : 'lg:order-2'}>
          <span
            className={`flex items-center gap-2.5 text-[10px] text-white/50 ${type.kicker} ${
              flip ? 'lg:justify-end' : ''
            }`}
          >
            <span className="block h-1.5 w-1.5 rounded-full" style={{ background: p[1] }} />
            {chapter.kicker}
            {breather && <span className="text-white/30">· the breather</span>}
          </span>

          <h2
            className={`mt-4 text-3xl leading-tight sm:text-4xl lg:text-5xl ${type.heading}`}
            style={{ color: p[2] }}
          >
            {chapter.name}
          </h2>

          <p className="mt-4 text-sm leading-relaxed text-white/65 sm:text-base">
            {chapter.description}
          </p>

          <span
            className={`mt-5 flex items-center gap-3 text-[10px] tracking-[0.24em] uppercase text-white/45 transition-colors duration-300 group-hover:text-white/85 ${
              flip ? 'lg:justify-end' : ''
            }`}
          >
            {chapter.songs.length} songs
            <span aria-hidden className="h-px w-8" style={{ background: `${p[1]}80` }} />
            <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
              Pull in →
            </span>
          </span>
        </div>
      </Link>
    </motion.li>
  )
}

/* --------------------------------------------------------------------- the foot */

function RoadFoot({ road, type, reduced }) {
  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="relative mt-20 pl-12 lg:pl-0 lg:text-center"
    >
      {/* the road runs out here */}
      <span
        aria-hidden
        className="absolute -top-14 left-[1.35rem] block h-14 w-0 -translate-x-1/2 border-l-2 border-dashed lg:left-1/2"
        style={{ borderColor: `${road.palette[1]}3d` }}
      />
      <span
        aria-hidden
        className="absolute top-0 left-[1.35rem] block h-2 w-2 -translate-x-1/2 rotate-45 lg:left-1/2"
        style={{ background: road.palette[1] }}
      />

      <p className="pt-8 text-[10px] tracking-[0.32em] uppercase text-white/40">
        {road.chapters.length} stops from here to the last light
      </p>

      <div className="mt-7 flex flex-wrap items-center gap-4 lg:justify-center">
        <Link
          to={`${road.base}/${road.chapters[0].slug}`}
          state={{ direction: 'forward' }}
          className={`rounded-full px-7 py-4 text-xl transition-transform duration-300 hover:scale-[1.02] ${type.display}`}
          style={{ background: road.palette[1], color: road.palette[0] }}
        >
          Start at {road.chapters[0].name} →
        </Link>
        <Link
          to={`${road.base}/end`}
          state={{ direction: 'forward' }}
          className="text-[10px] tracking-[0.24em] uppercase text-white/35 transition-colors hover:text-white/75"
        >
          Skip to the end
        </Link>
      </div>
    </motion.div>
  )
}
