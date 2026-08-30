import withinYou from '../data/within-you-songs.json'
import forFun from '../data/for-fun-songs.json'

// Chapter backdrops live at src/assets/images/{roadId}/{chapterSlug}/01.jpg ... 10.jpg,
// with 640px variants alongside them under assets/thumbs (see scripts/build-thumbs.mjs).
// Full size is for full-bleed use only; anywhere a photograph renders a few hundred
// pixels wide, the thumbnail is the one to reach for.
const imageModules = import.meta.glob('../assets/images/**/*.{jpg,jpeg,png,webp}', {
  eager: true,
  import: 'default',
})
const thumbModules = import.meta.glob('../assets/thumbs/**/*.{jpg,jpeg,png,webp}', {
  eager: true,
  import: 'default',
})

// A road's `motion` is its animation language, not just its colours.
//   'drift' — slow Ken Burns cross-dissolve, long palette bleed between stops.
//   'cut'   — hard stepped cuts on scroll, snap rhythm, hard palette cut between stops.
// A single chapter may override the road default via its `tempo` field, which is how
// "Open Road & Cruise" gets to be the breather inside an otherwise fast road.
export const ROADS = {
  'within-you': {
    id: 'within-you',
    base: '/within-you',
    title: withinYou.title,
    tagline: withinYou.tagline ?? 'the slow road',
    blurb:
      'Six stops through the music you play when nobody is watching. Nostalgia, devotion, rain, tenderness, noise, and the songs somebody else handed you.',
    motion: 'drift',
    palette: ['#1a120c', '#c98a4b', '#e8d3ab'],
    chapters: withinYou.chapters,
  },
  'for-fun': {
    id: 'for-fun',
    base: '/for-fun',
    title: forFun.title,
    tagline: forFun.tagline ?? 'the loud road',
    blurb:
      'Six stops with the windows down and the volume wrong. Dance floors, chrome, dust, lasers, and one long highway to cool off on.',
    motion: 'cut',
    palette: ['#12030c', '#ff2e88', '#ffd166'],
    chapters: forFun.chapters,
  },
}

export const ROAD_IDS = Object.keys(ROADS)

export function getRoad(roadId) {
  return ROADS[roadId] ?? null
}

/** Which road a pathname belongs to, or null on the landing page. */
export function roadFromPath(pathname) {
  const seg = pathname.split('/').filter(Boolean)[0]
  return seg && ROADS[seg] ? seg : null
}

export function getChapters(roadId) {
  return getRoad(roadId)?.chapters ?? []
}

export function getChapter(roadId, slug) {
  return getChapters(roadId).find((c) => c.slug === slug) ?? null
}

export function getChapterIndex(roadId, slug) {
  return getChapters(roadId).findIndex((c) => c.slug === slug)
}

/** The motion language for one chapter — the road's default unless the chapter overrides it. */
export function motionFor(roadId, chapter) {
  const road = getRoad(roadId)
  if (!road) return 'drift'
  if (chapter?.tempo === 'slow') return 'drift'
  if (chapter?.tempo === 'fast') return 'cut'
  return road.motion
}

/** Where "Continue" goes from a given chapter, and what to call it. */
export function nextStop(roadId, slug) {
  const road = getRoad(roadId)
  const chapters = getChapters(roadId)
  const i = getChapterIndex(roadId, slug)
  if (i < 0) return { href: road.base, label: 'the map' }
  if (i >= chapters.length - 1) return { href: `${road.base}/end`, label: 'the last light' }
  const next = chapters[i + 1]
  return { href: `${road.base}/${next.slug}`, label: next.name }
}

export function prevStop(roadId, slug) {
  const road = getRoad(roadId)
  const chapters = getChapters(roadId)
  const i = getChapterIndex(roadId, slug)
  if (i <= 0) return { href: road.base, label: 'the map' }
  const prev = chapters[i - 1]
  return { href: `${road.base}/${prev.slug}`, label: prev.name }
}

function resolve(modules, kind, roadId, slug) {
  const needle = `/${kind}/${roadId}/${slug}/`
  return Object.entries(modules)
    .filter(([path]) => path.includes(needle))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, src]) => src)
}

/** Full-size backdrops, for full-bleed use. */
export function chapterImages(roadId, slug) {
  return resolve(imageModules, 'images', roadId, slug)
}

/** 640px variants, for anywhere a photograph renders small. Same order, same indices. */
export function chapterThumbs(roadId, slug) {
  const thumbs = resolve(thumbModules, 'thumbs', roadId, slug)
  return thumbs.length ? thumbs : chapterImages(roadId, slug)
}

const LANDING_PALETTE = ['#120d0a', '#b98a54', '#e8d3ab']

/** The three-stop palette that the shell tints itself with for a given route. */
export function paletteForPath(pathname) {
  const roadId = roadFromPath(pathname)
  if (!roadId) return LANDING_PALETTE
  const road = getRoad(roadId)
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length < 2) return road.palette
  if (parts[1] === 'end') {
    const last = road.chapters[road.chapters.length - 1]
    return [road.palette[0], last.suggestedPalette[1], road.palette[2]]
  }
  return getChapter(roadId, parts[1])?.suggestedPalette ?? road.palette
}

/** Transition feel for a route change — a bleed on the slow road, a cut on the loud one. */
export function transitionFor(pathname) {
  const roadId = roadFromPath(pathname)
  if (!roadId) return 'drift'
  const parts = pathname.split('/').filter(Boolean)
  const chapter = parts.length > 1 ? getChapter(roadId, parts[1]) : null
  return motionFor(roadId, chapter)
}

/**
 * Typographic voice per road. The slow road speaks in a light old-style serif; the loud
 * road speaks in heavy condensed caps. Without this the two roads read as one design in
 * two colourways, which is exactly what they should not be.
 */
/**
 * Every road and stop also carries a Hindi name. Most of this music is Hindi, Urdu or
 * Punjabi, and "raasta" is already the word for road — so the two scripts sitting
 * together is the honest way to title it, not decoration.
 */
const HINDI = {
  'within-you': 'अपने भीतर',
  'for-fun': 'मस्ती',
  'nostalgic-classics': 'पुरानी यादें',
  'ghazals-soul': 'ग़ज़लें',
  'heartbreak-longing': 'तन्हाई',
  'sweet-romantic': 'मोहब्बत',
  'peppy-celebratory': 'जश्न',
  'shared-earphones': 'उधार के गाने',
  'bollywood-dance-anthems': 'नाच-गाना',
  'punjabi-hip-hop-trap': 'पंजाबी ट्रैप',
  'haryanvi-desi-bass': 'देसी बास',
  'international-bangers': 'विदेशी धमाल',
  'bass-drops-electronic': 'इलेक्ट्रॉनिक',
  'open-road-cruise': 'खुली सड़क',
}

/** The Hindi name for a road or chapter slug, or null if there isn't one. */
export function hindiFor(slug) {
  return HINDI[slug] ?? null
}

export function typeFor(roadId) {
  return roadId === 'for-fun'
    ? {
        heading: 'font-loud uppercase leading-[0.86] tracking-[0.005em]',
        kicker: 'font-body font-semibold tracking-[0.34em] uppercase',
        display: 'font-loud uppercase leading-[0.88]',
      }
    : {
        heading: 'font-display leading-[0.92]',
        kicker: 'font-body tracking-[0.34em] uppercase',
        display: 'font-display leading-[0.95]',
      }
}

export const SITE = {
  title: 'Annu',
  coffee: 'https://www.buymeacoffee.com/',
}

/** Every stop on both roads, in travel order, tagged with the road it belongs to. */
export function allStops() {
  return ROAD_IDS.flatMap((roadId) =>
    getChapters(roadId).map((chapter, index) => ({ roadId, road: ROADS[roadId], chapter, index })),
  )
}

/** Totals for the whole site — used wherever the scale of the thing is the point. */
export function siteTotals() {
  const stops = allStops()
  return {
    roads: ROAD_IDS.length,
    stops: stops.length,
    songs: stops.reduce((n, s) => n + s.chapter.songs.length, 0),
  }
}

/**
 * A deterministic spread of backdrops drawn from every chapter on both roads, for the
 * drifting moodboard on the landing page. Interleaving by frame index rather than
 * concatenating chapters keeps neighbouring tiles from all coming out of one palette.
 */
export function collageImages(perChapter = 3) {
  const stops = allStops()
  const picks = stops.map(({ roadId, chapter }) => {
    const all = chapterThumbs(roadId, chapter.slug)
    const step = Math.max(1, Math.floor(all.length / perChapter))
    return Array.from({ length: perChapter }, (_, i) => all[(i * step + 1) % all.length]).filter(Boolean)
  })
  const out = []
  for (let frame = 0; frame < perChapter; frame++) {
    for (let i = 0; i < picks.length; i++) {
      // offset the start per frame so each pass through the chapters begins somewhere else
      const src = picks[(i + frame * 5) % picks.length][frame]
      if (src) out.push(src)
    }
  }
  return out
}
