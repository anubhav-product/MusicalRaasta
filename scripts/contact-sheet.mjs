// Builds a contact sheet from a chapter's candidate thumbnails for visual review.
// Tiles are laid out left-to-right, top-to-bottom in a fixed grid, so a tile's
// candidate index is (row * COLS + col), counting from 0 in the top-left.
//   WORK=/tmp/curation node scripts/contact-sheet.mjs <slug> <outPng>
import { readdirSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const [slug, out] = process.argv.slice(2)
const WORK = process.env.WORK ?? '/tmp/curation'
const COLS = Number(process.env.COLS ?? 6)
const dir = `${WORK}/${slug}`

const thumbs = readdirSync(dir).filter((f) => /^t\d+\.jpg$/.test(f)).sort()
const meta = JSON.parse(readFileSync(`${dir}/candidates.json`, 'utf8'))
const W = 300, H = 195

const inputs = thumbs.flatMap((f) => ['-i', `${dir}/${f}`])
const scaled = thumbs.map((_, i) => `[${i}:v]scale=${W}:${H},setsar=1[v${i}]`).join(';')
const chain = thumbs.map((_, i) => `[v${i}]`).join('')
const layout = thumbs.map((_, i) => `${(i % COLS) * W}_${Math.floor(i / COLS) * H}`).join('|')

execFileSync('ffmpeg', ['-y', ...inputs, '-filter_complex',
  `${scaled};${chain}xstack=inputs=${thumbs.length}:layout=${layout}:fill=black[out]`,
  '-map', '[out]', '-frames:v', '1', out], { stdio: ['ignore', 'ignore', 'inherit'] })

const rows = Math.ceil(thumbs.length / COLS)
console.log(`sheet: ${out}`)
console.log(`grid: ${COLS} cols x ${rows} rows, index = row*${COLS} + col (0-based, top-left first)\n`)
thumbs.forEach((f, i) => {
  const c = meta[i]
  console.log(`${String(i).padStart(2)}  r${Math.floor(i / COLS)}c${i % COLS}  ${c.color}  ${(c.alt || '').slice(0, 64)}`)
})
