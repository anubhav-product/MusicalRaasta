// Enriches both road JSONs with a playable preview stream, artwork and duration.
//
// Apple Music embed iframes are cross-origin: the page cannot autoplay them, know when a
// track ends, or advance a queue. The public iTunes Lookup API exposes a 30s preview MP3
// for the same track ids that are already in the embed URLs, and those play in a native
// <audio> element the app fully controls. The embed URL is kept for the "open in Apple
// Music" affordance so the full track is always one tap away.
import { readFileSync, writeFileSync } from 'node:fs'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const idOf = (embed) => embed?.match(/\/song\/(\d+)/)?.[1] ?? null

const roads = ['within-you', 'for-fun']
const allIds = new Set()
const docs = {}

for (const r of roads) {
  const doc = JSON.parse(readFileSync(`src/data/${r}-songs.json`, 'utf8'))
  docs[r] = doc
  for (const c of doc.chapters) for (const s of c.songs) {
    const id = idOf(s.appleMusicEmbed)
    if (id) allIds.add(id)
  }
}

const ids = [...allIds]
console.log(`looking up ${ids.length} unique track ids`)
const meta = new Map()

for (let i = 0; i < ids.length; i += 120) {
  const batch = ids.slice(i, i + 120)
  let ok = false
  for (let attempt = 0; attempt < 3 && !ok; attempt++) {
    try {
      const res = await fetch(
        `https://itunes.apple.com/lookup?id=${batch.join(',')}&country=in&entity=song`,
      )
      if (!res.ok) { await sleep(1200); continue }
      const json = JSON.parse(await res.text())
      for (const r of json.results ?? []) {
        if (r.wrapperType !== 'track' && r.kind !== 'song') continue
        meta.set(String(r.trackId), {
          previewUrl: r.previewUrl ?? null,
          artwork: r.artworkUrl100
            ? r.artworkUrl100.replace(/\/\d+x\d+bb\.jpg$/, '/600x600bb.jpg')
            : null,
          durationMs: r.trackTimeMillis ?? null,
          trackViewUrl: r.trackViewUrl ?? null,
        })
      }
      ok = true
    } catch { await sleep(1200) }
  }
  process.stderr.write(`  ${Math.min(i + 120, ids.length)}/${ids.length}\r`)
  await sleep(320)
}
console.error()

let withPreview = 0, total = 0, missing = []
for (const r of roads) {
  for (const c of docs[r].chapters) {
    for (const s of c.songs) {
      total++
      const id = idOf(s.appleMusicEmbed)
      const m = id ? meta.get(id) : null
      s.trackId = id
      s.previewUrl = m?.previewUrl ?? null
      s.artwork = m?.artwork ?? null
      s.durationMs = m?.durationMs ?? null
      s.appleMusicUrl = m?.trackViewUrl ?? s.appleMusicEmbed
      if (s.previewUrl) withPreview++
      else missing.push(`${r}/${c.slug}: ${s.title} — ${s.artist}`)
    }
  }
  writeFileSync(`src/data/${r}-songs.json`, JSON.stringify(docs[r], null, 2) + '\n')
}

console.log(`\n${withPreview}/${total} tracks have a playable preview`)
if (missing.length) {
  console.log(`\n${missing.length} without preview:`)
  console.log(missing.slice(0, 25).join('\n'))
}
