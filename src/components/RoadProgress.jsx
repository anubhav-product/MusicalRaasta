import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getChapters, getRoad } from '../lib/roads.js'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js'

/**
 * Position across the whole road — one dot per stop, shown on every chapter page.
 * Shared by both roads; only the accent colour and the spring feel change.
 */
export default function RoadProgress({ roadId, currentSlug, accent = '#ffffff', mode = 'drift' }) {
  const road = getRoad(roadId)
  const chapters = getChapters(roadId)
  const index = chapters.findIndex((c) => c.slug === currentSlug)
  const reduced = usePrefersReducedMotion()

  const spring = reduced
    ? { duration: 0.2 }
    : mode === 'cut'
      ? { type: 'spring', stiffness: 700, damping: 26 }
      : { type: 'spring', stiffness: 260, damping: 24 }

  return (
    <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/10 bg-black/25 px-3 py-2 backdrop-blur-md">
      <Link
        to={road.base}
        state={{ direction: 'back' }}
        className="text-[10px] tracking-[0.22em] uppercase text-white/55 transition-colors hover:text-white"
      >
        Map
      </Link>
      <ol className="flex items-center gap-2" aria-label={`Progress along ${road.title}`}>
        {chapters.map((c, i) => {
          const active = i === index
          return (
            <li key={c.slug} className="flex">
              <Link
                to={`${road.base}/${c.slug}`}
                state={{ direction: i > index ? 'forward' : 'back' }}
                aria-current={active ? 'step' : undefined}
                title={c.name}
                className="block p-1"
              >
                <span className="sr-only">{c.name}</span>
                <motion.span
                  className="block rounded-full"
                  animate={{
                    width: active ? 20 : 7,
                    height: 7,
                    backgroundColor: active ? accent : 'rgba(255,255,255,0.3)',
                  }}
                  transition={spring}
                />
              </Link>
            </li>
          )
        })}
      </ol>
      <span className="text-[10px] tabular-nums tracking-[0.16em] text-white/45">
        {index >= 0 ? `${index + 1}/${chapters.length}` : `${chapters.length}`}
      </span>
    </div>
  )
}
