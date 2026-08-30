/**
 * Resolves each track to a YouTube video id — accurately.
 *
 * A naive search returns covers, karaoke, lyric videos, live cuts and reuploads. This
 * scores candidates instead, and the decisive signal is duration: iTunes gives the exact
 * length of the real recording, so a video within a couple of seconds of it is almost
 * certainly the same master. "<Artist> - Topic" channels are YouTube Music's own
 * auto-generated uploads of the official audio, so they are ranked highest of all.
 *
 * Anything it is not confident about is written as low confidence rather than guessed at,
 * and `src/data/youtube-overrides.json` always wins so you can pin an exact video by hand.
 *
 * Usage:
 *   YOUTUBE_API_KEY=... node scripts/resolve-youtube.mjs [--limit 100] [--force] [--road within-you]
 *
 * The free quota is 100 search calls/day, so this is resumable: it skips tracks that are
 * already resolved and picks up where it stopped.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'

const KEY = process.env.YOUTUBE_API_KEY
if (!KEY) {
  console.error('Set YOUTUBE_API_KEY. See the "Full songs via YouTube" section of README.md.')
  process.exit(1)
}

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : fallback
}
const FORCE = process.argv.includes('--force')
const LIMIT = Number(arg('limit', 95))          // stay under the 100/day search quota
const ONLY_ROAD = arg('road', null)
const OVERRIDES_PATH = 'src/data/youtube-overrides.json'
// Raw candidates are cached so the scoring can be re-tuned without spending quota.
const CACHE_PATH = '.cache/youtube-candidates.json'
const RESCORE = process.argv.includes('--rescore')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const strip = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()

const tokens = (s) => new Set(strip(s).split(' ').filter((w) => w.length > 2))

const overlap = (a, b) => {
  const A = tokens(a), B = tokens(b)
  if (!A.size) return 0
  let hit = 0
  for (const t of A) if (B.has(t)) hit++
  return hit / A.size
}

/** ISO-8601 duration -> seconds */
const isoSeconds = (iso) => {
  const m = /^P(?:\d+D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso ?? '')
  if (!m) return null
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)
}

// The official labels that actually own this catalogue. A T-Series or Saregama upload is
// as canonical as a "- Topic" channel, and without this the correct match keeps losing to
// a random reupload that happens to echo the artist's name in its channel title.
const LABELS = [
  't-series', 'saregama', 'sony music india', 'sonymusicindia', 'universal music india',
  'umusicindia', 'zee music company', 'tips official', 'tips music', 'ishtar music',
  'shemaroo', 'venus', 'eros now', 'speed records', 'white hill', 'times music',
  'yrf', 'yash raj films', 'aditya music', 'ultra bollywood', 'sa re ga ma',
  'coke studio', 'believe music', 'panorama music', 'lahari music', 'muzik247',
]

// Channels that exist to repost other people's audio. Usually the right recording, but
// unofficial and liable to vanish, so they lose to anything official.
const REUPLOADER = /lyric|lyrics|karaoke|status|whatsapp|reupload|hits|old songs|purane|nostalgi/i

// Words that mean "this is not the recording on the playlist" — unless the track itself
// says so (a song genuinely titled "... (Unplugged)" should match an unplugged video).
const BAD = ['cover', 'karaoke', 'instrumental', 'reaction', 'mashup', 'remix', 'lofi',
  'lo fi', 'slowed', 'reverb', 'ringtone', 'dj ', 'mix', 'live', 'concert', 'unplugged',
  'tutorial', 'lesson', 'making of', 'behind the scenes', 'trailer', 'teaser', 'review']

async function api(path, params) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  url.searchParams.set('key', KEY)
  const res = await fetch(url)
  const body = await res.json()
  if (!res.ok) {
    const reason = body?.error?.errors?.[0]?.reason ?? res.status
    const err = new Error(`${path} failed: ${reason}`)
    err.reason = reason
    throw err
  }
  return body
}

function scoreCandidate(track, video) {
  const ytSecs = isoSeconds(video.contentDetails?.duration)
  if (ytSecs == null) return null
  if (video.status?.embeddable === false) return null

  const wantSecs = track.durationMs ? Math.round(track.durationMs / 1000) : null
  const delta = wantSecs == null ? null : Math.abs(ytSecs - wantSecs)

  // A minute or more adrift is a different recording — a live cut, a full qawwali, or a
  // compilation. Never accept it, whatever else it has going for it.
  if (delta != null && delta > 60) return null

  let score = 0
  // 1. duration — the strongest evidence that this is the same recording
  if (delta == null) score += 0
  else if (delta <= 2) score += 50
  else if (delta <= 5) score += 40
  else if (delta <= 10) score += 22
  else if (delta <= 20) score += 4
  else score -= 35

  // 2. who uploaded it
  const channel = video.snippet?.channelTitle ?? ''
  const chanLower = channel.toLowerCase()
  if (/-\s*topic$/i.test(channel)) score += 40           // YouTube Music's official audio
  else if (/vevo$/i.test(chanLower)) score += 34
  else if (LABELS.some((l) => chanLower.includes(l))) score += 32  // the label that owns it
  else if (overlap(track.artist, channel) > 0.4) score += 25
  else if (/official|records|music|films|movies/i.test(chanLower)) score += 8
  if (REUPLOADER.test(channel)) score -= 22

  // 3. does the title actually name this song
  const ytTitle = video.snippet?.title ?? ''
  score += Math.round(overlap(track.title, ytTitle) * 30)
  if (overlap(track.artist, ytTitle) > 0.3) score += 8

  // 4. red flags the source track does not itself claim
  const srcLower = strip(`${track.title} ${track.album ?? ''}`)
  const ytLower = strip(ytTitle)
  for (const bad of BAD) {
    if (ytLower.includes(strip(bad)) && !srcLower.includes(strip(bad))) { score -= 35; break }
  }

  return { videoId: video.id, score, delta, channel, ytTitle, ytSecs }
}

function confidenceOf(best) {
  if (!best) return 'none'
  if (best.score >= 95 && best.delta != null && best.delta <= 5) return 'high'
  if (best.score >= 65 && best.delta != null && best.delta <= 12) return 'medium'
  return 'low'
}

const cache = existsSync(CACHE_PATH) ? JSON.parse(readFileSync(CACHE_PATH, 'utf8')) : {}
const saveCache = () => {
  mkdirSync('.cache', { recursive: true })
  writeFileSync(CACHE_PATH, JSON.stringify(cache))
}

async function resolveTrack(track) {
  const album = (track.album ?? '')
    .replace(/\(Original Motion Picture Soundtrack\)/gi, '')
    .replace(/- (Single|EP)$/i, '').trim()
  const q = `${track.title} ${track.artist} ${album}`.slice(0, 180)

  let items = cache[track.trackId]
  if (!items) {
    if (RESCORE) return { best: null, considered: 0, skipped: true }
    const search = await api('search', {
      part: 'snippet', q, type: 'video', maxResults: '10',
      videoEmbeddable: 'true', videoCategoryId: '10',
    })
    const ids = (search.items ?? []).map((i) => i.id?.videoId).filter(Boolean)
    if (!ids.length) { cache[track.trackId] = []; return { best: null, considered: 0 } }

    // one cheap batched call for the details that actually decide the match
    const details = await api('videos', {
      part: 'contentDetails,snippet,status', id: ids.join(','), maxResults: '50',
    })
    items = (details.items ?? []).map((v) => ({
      id: v.id,
      duration: v.contentDetails?.duration,
      title: v.snippet?.title,
      channelTitle: v.snippet?.channelTitle,
      embeddable: v.status?.embeddable,
    }))
    cache[track.trackId] = items
  }

  const scored = items
    .map((v) => ({
      id: v.id,
      contentDetails: { duration: v.duration },
      snippet: { title: v.title, channelTitle: v.channelTitle },
      status: { embeddable: v.embeddable },
    }))
    .map((v) => scoreCandidate(track, v))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)

  return { best: scored[0] ?? null, considered: scored.length }
}

// Fail fast with a readable diagnosis rather than a wall of 403s.
try {
  if (!RESCORE) await api('videos', { part: 'snippet', id: 'dQw4w9WgXcQ' })
} catch (err) {
  console.error(`Key rejected: ${err.reason}\n`)
  console.error('Run `npm run yt:check` for the exact links to fix it.')
  process.exit(1)
}

// ---- run ----
const overrides = existsSync(OVERRIDES_PATH)
  ? JSON.parse(readFileSync(OVERRIDES_PATH, 'utf8'))
  : {}

const roads = (ONLY_ROAD ? [ONLY_ROAD] : ['within-you', 'for-fun'])
const docs = Object.fromEntries(
  roads.map((r) => [r, JSON.parse(readFileSync(`src/data/${r}-songs.json`, 'utf8'))]),
)

// Demote anything already stored at low confidence — it must not play.
let demoted = 0
for (const road of roads) {
  for (const chapter of docs[road].chapters) {
    for (const song of chapter.songs) {
      if (song.youtubeConfidence === 'low' && song.youtubeId) {
        song.youtubeCandidate = song.youtubeId
        song.youtubeId = null
        demoted++
      }
    }
  }
}
if (demoted) console.log(`demoted ${demoted} low-confidence match(es) to review-only.\n`)

const pending = []
for (const road of roads) {
  for (const chapter of docs[road].chapters) {
    for (const song of chapter.songs) {
      if (overrides[song.trackId]) {
        song.youtubeId = overrides[song.trackId]
        song.youtubeConfidence = 'manual'
        continue
      }
      if (!FORCE && !RESCORE && (song.youtubeId || song.youtubeCandidate)) continue
      if (RESCORE && !cache[song.trackId]) continue
      pending.push({ road, chapter: chapter.slug, song })
    }
  }
}

const budget = RESCORE ? pending.length : LIMIT
console.log(RESCORE
  ? `re-scoring ${pending.length} cached track(s) — no API calls, no quota.\n`
  : `${pending.length} track(s) still to resolve; doing up to ${LIMIT} this run.\n`)
let done = 0, quotaHit = false
const tally = { high: 0, medium: 0, low: 0, none: 0 }

for (const item of pending.slice(0, budget)) {
  const { song } = item
  try {
    const { best } = await resolveTrack(song)
    const conf = confidenceOf(best)
    tally[conf]++
    song.youtubeConfidence = conf
    song.youtubeTitle = best?.ytTitle ?? null
    song.youtubeChannel = best?.channel ?? null
    song.youtubeDelta = best?.delta ?? null
    if (best && (conf === 'high' || conf === 'medium')) {
      song.youtubeId = best.videoId
      delete song.youtubeCandidate
    } else {
      // A low-confidence guess is worse than a preview: it plays a cover, a compilation
      // or the wrong cut. Keep it as a reviewable candidate, never as playback.
      song.youtubeId = null
      song.youtubeCandidate = best?.videoId ?? null
    }
    done++
    const mark = { high: 'ok  ', medium: 'med ', low: 'LOW ', none: 'MISS' }[conf]
    console.log(`${mark} ${song.title} — ${song.artist}`)
    if (conf !== 'high' && best) {
      console.log(`       -> ${best.ytTitle} [${best.channel}] Δ${best.delta}s score ${best.score}`)
    }
  } catch (err) {
    if (/quota/i.test(err.reason ?? err.message)) {
      console.error(`\nDaily quota reached after ${done} track(s). Re-run tomorrow — progress is saved.`)
      quotaHit = true
      break
    }
    console.error(`ERR  ${song.title}: ${err.message}`)
  }
  if (!RESCORE) await sleep(120)
}
saveCache()

for (const road of roads) {
  writeFileSync(`src/data/${road}-songs.json`, JSON.stringify(docs[road], null, 2) + '\n')
}

const remaining = pending.length - done
console.log(`\nresolved ${done} — high ${tally.high}, medium ${tally.medium}, low ${tally.low}, none ${tally.none}`)
console.log(remaining > 0
  ? `${remaining} left. Re-run tomorrow (free quota is 100 searches/day), or raise your quota.`
  : 'All tracks resolved.')
if (!quotaHit && remaining === 0) console.log('Review the uncertain ones: npm run yt:report')
