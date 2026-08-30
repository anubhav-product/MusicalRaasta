// Aggregates the per-chapter credits.json files into a single CREDITS.md.
import { readdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { getRoadTitles } from './road-titles.mjs'

const titles = getRoadTitles()
const lines = ['# Photo credits', '', 'All chapter backdrops are from [Unsplash](https://unsplash.com), used under the [Unsplash License](https://unsplash.com/license). Unsplash+ premium assets are excluded — see `scripts/audit-images.mjs`.', '']

for (const roadId of ['within-you', 'for-fun']) {
  const root = `src/assets/images/${roadId}`
  if (!existsSync(root)) continue
  lines.push(`## ${titles[roadId] ?? roadId}`, '')
  for (const slug of readdirSync(root).sort()) {
    const f = `${root}/${slug}/credits.json`
    if (!existsSync(f)) continue
    lines.push(`### ${titles[`${roadId}/${slug}`] ?? slug}`, '')
    for (const c of JSON.parse(readFileSync(f, 'utf8'))) {
      lines.push(`- \`${c.file}\` — ${c.photographer || 'Unknown'} · [${c.id}](${c.source})`)
    }
    lines.push('')
  }
}
writeFileSync('CREDITS.md', lines.join('\n'))
console.log(`CREDITS.md written (${lines.length} lines)`)
