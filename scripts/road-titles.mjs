import { readFileSync } from 'node:fs'

/** Display names for roads and chapters, read straight from the built data. */
export function getRoadTitles() {
  const out = {}
  for (const roadId of ['within-you', 'for-fun']) {
    const data = JSON.parse(readFileSync(`src/data/${roadId}-songs.json`, 'utf8'))
    out[roadId] = data.title
    for (const c of data.chapters) out[`${roadId}/${c.slug}`] = c.name
  }
  return out
}
