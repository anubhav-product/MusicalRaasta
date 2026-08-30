/**
 * Builds a local index of official-channel uploads, without using search.list.
 *
 * search.list is capped at 100 calls/day, which is what makes resolving 547 songs take a
 * week. channels.list, playlistItems.list and videos.list draw from a separate 10,000
 * unit/day pool, and every one of them costs 1 unit — so paging an entire label's uploads
 * is cheap. Harvest the labels these songs actually live on, then match offline.
 *
 *   YOUTUBE_API_KEY=... node scripts/harvest-youtube.mjs [--budget 6000]
 *
 * Resumable: it records each channel's page token and picks up where it stopped.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'

const KEY = process.env.YOUTUBE_API_KEY
if (!KEY) { console.error('Set YOUTUBE_API_KEY (see .env).'); process.exit(1) }

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d }
const BUDGET = Number(arg('budget', 6000))
const INDEX = '.cache/youtube-index.json'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// The channels this catalogue actually lives on: the big Indian labels, plus the
// international majors for the English tracks.
const HANDLES = [
  'tseries', 'SonyMusicIndia', 'ZeeMusicCompany', 'TipsOfficial', 'saregamamusic',
  'ShemarooFilmiGaane', 'VenusMovies', 'UltraBollywood', 'TimesMusicIndia',
  'SpeedRecords', 'WhiteHillMusic', 'AdityaMusic', 'YRF', 'ErosNowMusic',
  'SonyMusicSouthVevo', 'believemusicindia', 'Coke_Studio', 'MuzikOne',
]

let units = 0
async function api(path, params) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  url.searchParams.set('key', KEY)
  const res = await fetch(url)
  units++
  const body = await res.json()
  if (!res.ok) {
    const reason = body?.error?.errors?.[0]?.reason ?? res.status
    const e = new Error(`${path}: ${reason}`); e.reason = reason; throw e
  }
  return body
}

mkdirSync('.cache', { recursive: true })
const index = existsSync(INDEX) ? JSON.parse(readFileSync(INDEX, 'utf8')) : { channels: {}, videos: {} }
const save = () => writeFileSync(INDEX, JSON.stringify(index))

for (const handle of HANDLES) {
  if (units >= BUDGET) { console.log('\nbudget reached.'); break }

  let ch = index.channels[handle]
  if (!ch) {
    try {
      const r = await api('channels', { part: 'contentDetails,snippet,statistics', forHandle: `@${handle}` })
      const it = r.items?.[0]
      if (!it) { console.log(`${handle.padEnd(22)} not found`); index.channels[handle] = { missing: true }; continue }
      ch = {
        title: it.snippet.title,
        uploads: it.contentDetails.relatedPlaylists.uploads,
        total: Number(it.statistics?.videoCount ?? 0),
        page: null,
        done: false,
      }
      index.channels[handle] = ch
    } catch (e) {
      console.log(`${handle.padEnd(22)} ${e.reason}`)
      if (/quota|rateLimit/i.test(e.reason)) break
      continue
    }
  }
  if (ch.missing || ch.done) { console.log(`${handle.padEnd(22)} ${ch.missing ? 'skip' : 'already harvested'}`); continue }

  let added = 0
  process.stdout.write(`${handle.padEnd(22)} ${ch.title} (${ch.total} videos) `)
  while (units < BUDGET) {
    let page
    try {
      page = await api('playlistItems', {
        part: 'snippet', playlistId: ch.uploads, maxResults: '50',
        ...(ch.page ? { pageToken: ch.page } : {}),
      })
    } catch (e) {
      if (/quota|rateLimit/i.test(e.reason)) { console.log(` stopped: ${e.reason}`); save(); process.exit(0) }
      console.log(` error: ${e.reason}`); break
    }
    for (const it of page.items ?? []) {
      const id = it.snippet?.resourceId?.videoId
      if (!id || index.videos[id]) continue
      index.videos[id] = [it.snippet.title, ch.title]
      added++
    }
    ch.page = page.nextPageToken ?? null
    if (!ch.page) { ch.done = true; break }
    if (added % 1000 === 0) { save(); process.stdout.write('.') }
    await sleep(60)
  }
  save()
  console.log(` +${added} (${units} units used)`)
}

save()
console.log(`\nindexed ${Object.keys(index.videos).length} videos across ${Object.values(index.channels).filter((c) => !c.missing).length} channels`)
console.log(`units used this run: ${units} (daily pool is 10,000; search.list is untouched)`)
