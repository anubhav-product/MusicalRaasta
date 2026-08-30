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
        description: 'Somebody older than you played these first, on a Sunday morning, while you were still too young to care. Now four bars come on in a shop somewhere and you are eight again in the back of a car that no longer exists — and you could not explain to anyone standing near you why your throat has gone tight.',
        palette: ['#2a1c10', '#c98a4b', '#eddcba'],
      },
      {
        csvSlug: 'ghazals-soul', slug: 'ghazals-soul', name: 'Ghazals & Soul',
        kicker: 'Stop two',
        description: 'Past two, the house finally quiet, and you are not sad exactly — you just do not want to be spoken to. These are for the version of you that nobody else gets to meet: the one who sits in the dark and lets a single held note say the thing you have never once managed to say out loud.',
        palette: ['#171426', '#8e6aa8', '#e2d3c4'],
      },
      {
        csvSlug: 'heartbreak-longing', slug: 'heartbreak-longing', name: 'Heartbreak & Longing',
        kicker: 'Stop three',
        description: 'You have opened the chat and closed it again without typing anything. You know exactly what this song is going to do to you, and you are going to play it anyway, because tonight the only thing that helps is something that hurts in the same shape. Nobody gets over it in a straight line. This stop is not going to ask you to.',
        palette: ['#0e141b', '#3f6c8c', '#b6cddc'],
      },
      {
        csvSlug: 'sweet-romantic', slug: 'sweet-romantic', name: 'Sweet & Romantic',
        kicker: 'Stop four',
        description: 'Not the confession and not the wedding — the Tuesday. Someone asleep on your shoulder on a late bus, or laughing far too hard at something that was not funny, and you catching yourself thinking: oh. It is this. The ordinary, enormous fact of a person being there.',
        palette: ['#2b1a1a', '#d08b6a', '#f6ddc6'],
      },
      {
        csvSlug: 'peppy-celebratory', slug: 'peppy-celebratory', name: 'Peppy & Celebratory',
        kicker: 'Stop five',
        description: 'You said you were not going to dance. Then somebody’s cousin put this on, the whole room went up on the same beat, and there you were — off-step, sweating, completely happy. Play it too loud; that is the correct volume.',
        palette: ['#39190a', '#e2892a', '#ffd894'],
      },
      {
        csvSlug: 'modern-crossover', slug: 'shared-earphones', name: 'Shared Earphones',
        kicker: 'Last stop',
        description: 'Somebody pulled out an earphone, handed you one side, and said just listen to this bit. You have kept the song longer than you kept them. Everything here arrived through another person — a hostel corridor, an aux cable, a bus seat — and still carries a little of whoever passed it on.',
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
        description: 'Four seconds in, the whole floor knows what is coming and the whole floor does the same step. You never actually decide to dance to these — you look up at some point and find that you already are.',
        palette: ['#2b0413', '#ff2e88', '#ffd166'], tempo: 'fast',
      },
      {
        csvSlug: 'punjabi-hip-hop-trap', slug: 'punjabi-hip-hop-trap', name: 'Punjabi Hip-Hop & Trap',
        kicker: 'Stop two',
        description: 'The songs you put on to walk into a room like you own the building. Nothing about your day has actually changed, but the bass is doing something to your posture, and for the next four minutes you are a slightly more dangerous person.',
        palette: ['#0b0b10', '#c9a227', '#ece6d8'], tempo: 'fast',
      },
      {
        csvSlug: 'haryanvi-desi-bass', slug: 'haryanvi-desi-bass', name: 'Haryanvi & Desi Bass',
        kicker: 'Stop three',
        description: 'Raw, dusty, and completely unbothered about whether you approve. A speaker far too big for the vehicle carrying it, red earth on both sides of the road, and the specific joy of music that was never once trying to be tasteful.',
        palette: ['#1a0d06', '#d4441e', '#f0b44a'], tempo: 'fast',
      },
      {
        csvSlug: 'international-bangers', slug: 'international-bangers', name: 'International Bangers',
        kicker: 'Stop four',
        description: 'You do not know the words. You have never known the words. It has not mattered a single time — you and a room full of strangers land on the same beat at the same instant, and that turns out to be the whole language.',
        palette: ['#04101c', '#00d0ff', '#ff3ba7'], tempo: 'fast',
      },
      {
        csvSlug: 'bass-drops-electronic', slug: 'bass-drops-electronic', name: 'Bass Drops & Electronic',
        kicker: 'Stop five',
        description: 'The long climb where every hand goes up before anything has actually happened. Thirty seconds of held breath, and then the floor disappears and takes the entire week you had with it.',
        palette: ['#070417', '#7c3aed', '#5eff9f'], tempo: 'fast',
      },
      {
        csvSlug: 'open-road-cruise', slug: 'open-road-cruise', name: 'Open Road & Cruise',
        kicker: 'Last stop',
        description: 'Ears ringing, voices gone, one hand out of the window. The part of the night that nobody plans and everybody remembers — coming down slowly, together, while the sky starts giving up on being dark.',
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
