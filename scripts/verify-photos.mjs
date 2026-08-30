// Authoritative watermark check: asks Unsplash about each downloaded photo id directly,
// instead of trusting a local candidate pool that may have been overwritten.
import { readdirSync, existsSync, readFileSync } from 'node:fs'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let bad = [], checked = 0

for (const roadId of ['within-you', 'for-fun']) {
  const root = `src/assets/images/${roadId}`
  if (!existsSync(root)) continue
  for (const slug of readdirSync(root).sort()) {
    const f = `${root}/${slug}/credits.json`
    if (!existsSync(f)) continue
    for (const c of JSON.parse(readFileSync(f, 'utf8'))) {
      checked++
      let raw = ''
      for (let attempt = 0; attempt < 3 && !raw; attempt++) {
        try {
          const res = await fetch(`https://unsplash.com/napi/photos/${c.id}`, {
            headers: { accept: 'application/json' },
          })
          if (res.ok) raw = (await res.json())?.urls?.raw ?? ''
          else await sleep(400)
        } catch { await sleep(400) }
      }
      if (!raw) { console.log(`??  ${roadId}/${slug}/${c.file} ${c.id} — lookup failed`); continue }
      if (/plus\.unsplash\.com|premium_photo/.test(raw)) {
        bad.push({ roadId, slug, file: c.file, id: c.id })
        console.log(`XX  ${roadId}/${slug}/${c.file}  ${c.id}  PREMIUM`)
      }
      await sleep(90)
    }
  }
}
console.log(`\nchecked ${checked} — ${bad.length} premium/watermarked`)
if (bad.length) {
  const bySlug = {}
  for (const b of bad) (bySlug[`${b.roadId}/${b.slug}`] ??= []).push(b.file)
  console.log(JSON.stringify(bySlug, null, 2))
}
process.exit(bad.length ? 1 : 0)
