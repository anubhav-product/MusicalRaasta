// Generates small variants of every chapter backdrop.
//
// The full-size images are 1920x1280 because they are used full-bleed behind a chapter,
// where anything smaller shows. Most places on the site are not that: the landing-page
// moodboard, the pinboard tiles and the end page's row of stops all render a photograph
// a few hundred pixels wide, and serving 380 KB into a 170 px tile made the landing page
// pull ~22 MB. These are 640 px wide, ~40 KB, and indistinguishable at those sizes.
//
//   node scripts/build-thumbs.mjs
import { readdirSync, mkdirSync, existsSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const SRC = 'src/assets/images'
const OUT = 'src/assets/thumbs'
const WIDTH = 640

let made = 0, bytes = 0
for (const road of readdirSync(SRC)) {
  for (const slug of readdirSync(`${SRC}/${road}`)) {
    const dir = `${OUT}/${road}/${slug}`
    mkdirSync(dir, { recursive: true })
    for (const file of readdirSync(`${SRC}/${road}/${slug}`)) {
      if (!file.endsWith('.jpg')) continue
      const from = `${SRC}/${road}/${slug}/${file}`
      const to = `${dir}/${file}`
      if (existsSync(to) && statSync(to).mtimeMs > statSync(from).mtimeMs) continue
      execFileSync('sips', ['-Z', String(WIDTH), '--setProperty', 'formatOptions', '78',
        from, '--out', to], { stdio: 'ignore' })
      made++
      bytes += statSync(to).size
    }
  }
}
console.log(`${made} thumbnails at ${WIDTH}px — ${(bytes / 1048576).toFixed(1)} MB total`)
