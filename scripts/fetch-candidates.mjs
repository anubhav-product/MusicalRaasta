// Pulls Unsplash search candidates for a chapter, filters for orientation + palette fit,
// and writes a candidate manifest + thumbnail contact sheet for visual review.
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const CHAPTERS = JSON.parse(process.env.CHAPTER_SPEC)
const WORK = process.env.WORK ?? '/tmp/curation'

const srgbToLab = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
  const r = lin((n >> 16) & 255), g = lin((n >> 8) & 255), b = lin(n & 255)
  let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047
  let y = r * 0.2126 + g * 0.7152 + b * 0.0722
  let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  ;[x, y, z] = [f(x), f(y), f(z)]
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)]
}
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function search(query, page = 1) {
  const url = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=30&page=${page}&orientation=landscape`
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (!res.ok) { console.error('  ! fail', query, res.status); return [] }
  const json = await res.json()
  return json.results ?? []
}

for (const ch of CHAPTERS) {
  const dir = `${WORK}/${ch.slug}`
  // Clear any previous pool first: thumbnails are keyed by candidate index, so keeping
  // stale t*.jpg files next to a fresh candidates.json makes the contact sheet lie.
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  const seen = new Map()
  for (const q of ch.queries) {
    for (const page of [1, 2]) {
      const results = await search(q, page)
      for (const p of results) {
        if (seen.has(p.id)) continue
        if (p.width / p.height < 1.2) continue
        // Unsplash+ premium assets are served tiled with a visible watermark that is
        // invisible at thumbnail size and obvious at full resolution. Never usable.
        if (/plus\.unsplash\.com|premium_photo/.test(p.urls.raw)) continue
        seen.set(p.id, {
          id: p.id,
          color: p.color,
          alt: p.alt_description ?? p.description ?? '',
          user: p.user?.name ?? '',
          query: q,
          raw: p.urls.raw,
        })
      }
      await sleep(120)
    }
    process.stderr.write('.')
  }
  const targets = ch.palette.map(srgbToLab)
  const scored = [...seen.values()]
    .map((c) => ({ ...c, score: Math.min(...targets.map((t) => dist(srgbToLab(c.color), t))) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, ch.take ?? 36)
  writeFileSync(`${dir}/candidates.json`, JSON.stringify(scored, null, 2))
  console.error(`\n${ch.slug}: ${seen.size} unique -> ${scored.length} shortlisted`)

  // fetch thumbs
  for (let i = 0; i < scored.length; i++) {
    const f = `${dir}/t${String(i).padStart(2, '0')}.jpg`
    if (existsSync(f)) continue
    const u = `${scored[i].raw}&w=400&h=260&fit=crop&fm=jpg&q=70`
    execFileSync('curl', ['-sL', '--max-time', '30', '-o', f, u])
  }
}
