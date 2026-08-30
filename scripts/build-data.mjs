// Converts the two source CSV exports into the structured road JSON the app consumes.
// Chapter identity (display name, blurb, palette) lives here, not in the CSVs.
import { readFileSync, writeFileSync } from 'node:fs'

function parseCsv(text) {
  const rows = []
  let row = [], field = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else { quoted = false }
      } else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows.filter((r) => r.some((f) => f.trim() !== ''))
}

const ROADS = [
  {
    id: 'within-you',
    title: 'Within You',
    tagline: 'the slow road',
    csv: '/tmp/wy.csv',
    out: 'src/data/within-you-songs.json',
    chapters: [
      {
        csvSlug: 'nostalgic-classics', slug: 'nostalgic-classics', name: 'Nostalgic Classics',
        kicker: 'Stop one',
        description: 'Golden-era voices carried on tape hiss and warm sepia — songs older than the people who love them, playing from a room down the hall.',
        palette: ['#2a1c10', '#c98a4b', '#eddcba'],
      },
      {
        csvSlug: 'ghazals-soul', slug: 'ghazals-soul', name: 'Ghazals & Soul',
        kicker: 'Stop two',
        description: 'The hour after midnight, when the music stops asking for anything. Ink-blue courtyards, one held note, a devotion with no address on it.',
        palette: ['#171426', '#8e6aa8', '#e2d3c4'],
      },
      {
        csvSlug: 'heartbreak-longing', slug: 'heartbreak-longing', name: 'Heartbreak & Longing',
        kicker: 'Stop three',
        description: 'The long stretch of the road where it rains the whole way. Everything is grey-blue and slightly out of reach, and you play it anyway.',
        palette: ['#0e141b', '#3f6c8c', '#b6cddc'],
      },
      {
        csvSlug: 'sweet-romantic', slug: 'sweet-romantic', name: 'Sweet & Romantic',
        kicker: 'Stop four',
        description: 'The light comes back low and gold. Nothing dramatic happens — only the ordinary, enormous fact of someone being there.',
        palette: ['#2b1a1a', '#d08b6a', '#f6ddc6'],
      },
      {
        csvSlug: 'peppy-celebratory', slug: 'peppy-celebratory', name: 'Peppy & Celebratory',
        kicker: 'Stop five',
        description: 'Marigold, loudspeakers, dust in the sun. The songs you cannot sit still through, played too loud, on purpose.',
        palette: ['#39190a', '#e2892a', '#ffd894'],
      },
      {
        csvSlug: 'modern-crossover', slug: 'shared-earphones', name: 'Shared Earphones',
        kicker: 'Last stop',
        description: 'Borrowed songs — the ones that arrived through someone else’s speaker. Hostel corridors, car aux cables, one earphone each. Not nostalgia for a time before you: nostalgia for the one that was yours.',
        palette: ['#0b1024', '#5f6ee0', '#cfd8f5'],
      },
    ],
  },
  {
    id: 'for-fun',
    title: 'For Fun',
    tagline: 'the loud road',
    csv: '/Users/Hi/Downloads/for-fun-final.csv',
    out: 'src/data/for-fun-songs.json',
    chapters: [
      {
        csvSlug: 'bollywood-dance-anthems', slug: 'bollywood-dance-anthems', name: 'Bollywood Dance Anthems',
        kicker: 'Stop one',
        description: 'Floor filled in four seconds flat. Mirrorball magenta, gold sequins, the drop everyone already knows by heart.',
        palette: ['#2b0413', '#ff2e88', '#ffd166'], tempo: 'fast',
      },
      {
        csvSlug: 'punjabi-hip-hop-trap', slug: 'punjabi-hip-hop-trap', name: 'Punjabi Hip-Hop & Trap',
        kicker: 'Stop two',
        description: 'Chrome, cold gold, tinted glass. Slower on the surface and heavier underneath — swagger with the bass turned all the way up.',
        palette: ['#0b0b10', '#c9a227', '#ece6d8'], tempo: 'fast',
      },
      {
        csvSlug: 'haryanvi-desi-bass', slug: 'haryanvi-desi-bass', name: 'Haryanvi & Desi Bass',
        kicker: 'Stop three',
        description: 'Raw, dusty and completely unbothered. Red earth, sodium light, a speaker box far too big for the vehicle carrying it.',
        palette: ['#1a0d06', '#d4441e', '#f0b44a'], tempo: 'fast',
      },
      {
        csvSlug: 'international-bangers', slug: 'international-bangers', name: 'International Bangers',
        kicker: 'Stop four',
        description: 'The universal language of a strobe light. Cyan and magenta, hands up, no translation required.',
        palette: ['#04101c', '#00d0ff', '#ff3ba7'], tempo: 'fast',
      },
      {
        csvSlug: 'bass-drops-electronic', slug: 'bass-drops-electronic', name: 'Bass Drops & Electronic',
        kicker: 'Stop five',
        description: 'Lasers, fog, and the long climb before the floor disappears. Violet and acid green at 128 BPM.',
        palette: ['#070417', '#7c3aed', '#5eff9f'], tempo: 'fast',
      },
      {
        csvSlug: 'open-road-cruise', slug: 'open-road-cruise', name: 'Open Road & Cruise',
        kicker: 'Last stop',
        description: 'The breather. Windows down, one hand out, the sun going amber on an empty highway. Still loud — just no longer in a hurry.',
        palette: ['#1c1408', '#e0913c', '#f4dfb4'], tempo: 'slow',
      },
    ],
  },
]

for (const road of ROADS) {
  const rows = parseCsv(readFileSync(road.csv, 'utf8'))
  const header = rows[0].map((h) => h.trim())
  const idx = Object.fromEntries(header.map((h, i) => [h, i]))

  const bucket = new Map(road.chapters.map((c) => [c.csvSlug, []]))
  for (const r of rows.slice(1)) {
    const key = r[idx.chapter_slug].trim()
    if (!bucket.has(key)) throw new Error(`${road.id}: unknown chapter slug ${key}`)
    bucket.get(key).push({
      title: r[idx.title].trim(),
      artist: r[idx.artist].trim(),
      album: r[idx.album]?.trim() || null,
      appleMusicEmbed: r[idx.apple_music_embed].trim(),
    })
  }

  const json = {
    road: road.id,
    title: road.title,
    tagline: road.tagline,
    chapters: road.chapters.map(({ csvSlug, palette, ...c }, i) => ({
      ...c,
      order: i + 1,
      suggestedPalette: palette,
      songs: bucket.get(csvSlug),
    })),
  }
  writeFileSync(road.out, JSON.stringify(json, null, 2) + '\n')
  const total = json.chapters.reduce((n, c) => n + c.songs.length, 0)
  console.log(`\n${road.title} -> ${road.out}`)
  console.log(json.chapters.map((c) => `  ${c.order}. ${c.name} (${c.slug}) — ${c.songs.length}`).join('\n'))
  console.log(`  total: ${total}`)
}
