/**
 * Lists every match that is not high confidence, so you can eyeball the uncertain ones
 * instead of trusting the scorer. Writes youtube-review.html — open it, play each
 * candidate next to the track it is supposed to be, and paste the ids you want to change
 * into src/data/youtube-overrides.json.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const roads = ['within-you', 'for-fun']
const OVERRIDES = 'src/data/youtube-overrides.json'
const overrides = existsSync(OVERRIDES) ? JSON.parse(readFileSync(OVERRIDES, 'utf8')) : {}

const rows = []
const tally = { high: 0, medium: 0, low: 0, none: 0, manual: 0, unresolved: 0 }

for (const road of roads) {
  const doc = JSON.parse(readFileSync(`src/data/${road}-songs.json`, 'utf8'))
  for (const chapter of doc.chapters) {
    for (const song of chapter.songs) {
      const conf = overrides[song.trackId] ? 'manual' : (song.youtubeConfidence ?? 'unresolved')
      tally[conf] = (tally[conf] ?? 0) + 1
      if (conf === 'high' || conf === 'manual') continue
      rows.push({ road, chapter: chapter.name, ...song, conf })
    }
  }
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

const html = `<!doctype html><meta charset="utf-8"><title>YouTube match review</title>
<style>
 body{font:14px/1.5 system-ui;margin:0;background:#0f0f12;color:#eee}
 header{padding:24px 28px;border-bottom:1px solid #2a2a32;position:sticky;top:0;background:#0f0f12}
 h1{margin:0 0 6px;font-size:19px} .sub{color:#9a9aa8}
 table{border-collapse:collapse;width:100%} td{padding:12px 14px;border-bottom:1px solid #22222a;vertical-align:top}
 .t{font-weight:600} .a{color:#9a9aa8;font-size:12px}
 .low{color:#ff8f6b} .medium{color:#ffd166} .none{color:#ff6b6b}
 code{background:#1c1c24;padding:2px 6px;border-radius:4px;font-size:12px}
 iframe{border:0;border-radius:8px}
 .why{color:#8a8a98;font-size:12px;margin-top:4px}
</style>
<header>
 <h1>YouTube match review</h1>
 <div class="sub">
   high ${tally.high ?? 0} · manual ${tally.manual ?? 0} · medium ${tally.medium ?? 0} ·
   low ${tally.low ?? 0} · none ${tally.none ?? 0} · unresolved ${tally.unresolved ?? 0}
   &nbsp;—&nbsp; ${rows.length} need a look
 </div>
 <div class="sub">To correct one, add <code>"trackId": "videoId"</code> to
   <code>src/data/youtube-overrides.json</code>, then re-run <code>npm run yt:resolve</code>.</div>
</header>
<table>
${rows.map((r) => `<tr>
 <td style="width:300px">
   <div class="t">${esc(r.title)}</div>
   <div class="a">${esc(r.artist)}</div>
   <div class="a">${esc(r.road)} · ${esc(r.chapter)}</div>
   <div class="why"><code>${esc(r.trackId)}</code></div>
 </td>
 <td style="width:220px">
   <div class="${r.conf}">${r.conf.toUpperCase()}</div>
   <div class="why">wants ${r.durationMs ? Math.round(r.durationMs / 1000) : '?'}s${
     r.youtubeDelta != null ? ` · off by ${r.youtubeDelta}s` : ''}</div>
   <div class="why">${esc(r.youtubeChannel ?? '—')}</div>
   <div class="why">${esc(r.youtubeTitle ?? 'no candidate')}</div>
 </td>
 <td>${r.youtubeId
   ? `<iframe width="320" height="180" src="https://www.youtube.com/embed/${esc(r.youtubeId)}" allowfullscreen loading="lazy"></iframe>`
   : `<a href="https://www.youtube.com/results?search_query=${encodeURIComponent(`${r.title} ${r.artist}`)}" target="_blank">search YouTube →</a>`}
 </td>
</tr>`).join('\n')}
</table>`

writeFileSync('youtube-review.html', html)
console.log(`high ${tally.high ?? 0} · manual ${tally.manual ?? 0} · medium ${tally.medium ?? 0} · low ${tally.low ?? 0} · none ${tally.none ?? 0} · unresolved ${tally.unresolved ?? 0}`)
console.log(`${rows.length} need review -> youtube-review.html`)
