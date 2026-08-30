// Downloads the curated picks for one chapter at full resolution.
//   PICKS="3,7,11,..." WORK=/tmp/curation node scripts/download-picks.mjs <slug> <destDir>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const [slug, dest] = process.argv.slice(2)
const WORK = process.env.WORK ?? '/tmp/curation'
const picks = process.env.PICKS.split(',').map((s) => Number(s.trim()))
if (picks.length !== 10) throw new Error(`expected 10 picks, got ${picks.length}`)

const candidates = JSON.parse(readFileSync(`${WORK}/${slug}/candidates.json`, 'utf8'))
mkdirSync(dest, { recursive: true })

const credits = []
picks.forEach((idx, i) => {
  const c = candidates[idx]
  if (!c) throw new Error(`no candidate at index ${idx}`)
  const file = `${dest}/${String(i + 1).padStart(2, '0')}.jpg`
  const url = `${c.raw}&w=1920&h=1280&fit=crop&crop=entropy&fm=jpg&q=86`
  execFileSync('curl', ['-sL', '--max-time', '60', '-o', file, url])
  credits.push({ file: `${String(i + 1).padStart(2, '0')}.jpg`, id: c.id, color: c.color, photographer: c.user, alt: c.alt, source: `https://unsplash.com/photos/${c.id}` })
  console.log(`${file}  <- ${c.id} ${c.color} ${c.user}`)
})
writeFileSync(`${dest}/credits.json`, JSON.stringify(credits, null, 2) + '\n')
