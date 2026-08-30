// Flags any downloaded image that came from an Unsplash+ premium (watermarked) asset.
import { readdirSync, existsSync, readFileSync } from 'node:fs'

const roots = ['src/assets/images/within-you', 'src/assets/images/for-fun']
const works = ['/tmp/curation', '/tmp/curation-ff', '/tmp/curation-ff2']
let bad = 0, checked = 0, unknown = 0

for (const root of roots) {
  if (!existsSync(root)) continue
  for (const slug of readdirSync(root)) {
    const credFile = `${root}/${slug}/credits.json`
    if (!existsSync(credFile)) { console.log(`?? ${root}/${slug}: no credits.json`); continue }
    const creds = JSON.parse(readFileSync(credFile, 'utf8'))
    const pool = works
      .map((w) => `${w}/${slug}/candidates.json`)
      .filter(existsSync)
      .flatMap((f) => JSON.parse(readFileSync(f, 'utf8')))
    const byId = Object.fromEntries(pool.map((c) => [c.id, c.raw]))
    for (const c of creds) {
      checked++
      const raw = byId[c.id]
      if (!raw) { unknown++; console.log(`?? ${slug}/${c.file} ${c.id}: not in any candidate pool`); continue }
      if (/plus\.unsplash\.com|premium_photo/.test(raw)) {
        bad++
        console.log(`XX PREMIUM/WATERMARKED  ${slug}/${c.file}  ${c.id}`)
      }
    }
  }
}
console.log(`\nchecked ${checked} images — ${bad} premium/watermarked, ${unknown} unresolved`)
process.exit(bad > 0 ? 1 : 0)
