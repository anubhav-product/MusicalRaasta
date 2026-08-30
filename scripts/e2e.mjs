// Drives a real browser through both roads: deep links, the immersive player, the
// scroll-up queue, auto-advance, Continue flow, back/forward, and reduced motion.
import puppeteer from 'puppeteer-core'

const BASE = process.env.BASE ?? 'http://localhost:5188'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

let failures = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
  if (!ok) failures++
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: [
    '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--window-size=1440,900',
    '--autoplay-policy=no-user-gesture-required', '--mute-audio',
  ],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

const url = () => page.url().replace(BASE, '')
const scrollTo = async (frac) => {
  await page.evaluate((f) => window.scrollTo(0, (document.body.scrollHeight - innerHeight) * f), frac)
  await sleep(900)
}
// Playback alternates between two <audio> elements to crossfade, so always inspect the
// one actually producing sound rather than whichever is first in the DOM.
const audio = () => page.evaluate(() => {
  const els = [...document.querySelectorAll('audio')]
  const a = els.find((x) => !x.paused && x.currentTime > 0) ?? els.find((x) => !x.paused) ?? els[0]
  return a ? { src: a.src, paused: a.paused, t: a.currentTime, dur: a.duration, count: els.length } : null
})
const visibleText = (sel) => page.$eval(sel, (e) => {
  const s = getComputedStyle(e)
  return s.visibility === 'hidden' || Number(s.opacity) < 0.05 ? '' : e.textContent.trim()
}).catch(() => null)

// ---------- landing ----------
await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' })
check('landing shows both roads', (await page.$$('a[href="/within-you"], a[href="/for-fun"]')).length >= 2)
await Promise.all([
  page.waitForFunction(() => location.pathname === '/within-you', { timeout: 8000 }),
  page.click('a[href="/within-you"]'),
])
check('fork -> road', url() === '/within-you', url())

await page.waitForSelector('a[href="/within-you/nostalgic-classics"]', { visible: true })
await Promise.all([
  page.waitForFunction(() => location.pathname === '/within-you/nostalgic-classics', { timeout: 8000 }),
  page.evaluate(() => document.querySelector('a[href="/within-you/nostalgic-classics"]').click()),
])
await sleep(1600)
check('road -> chapter', url() === '/within-you/nostalgic-classics', url())

// ---------- immersive default state ----------
check('chapter opens on the title card',
  (await visibleText('h1')) === 'Nostalgic Classics')
check('song list is not on screen', (await page.$('[role="dialog"][aria-label="Queue"]')) === null)
check('no embed iframes anywhere', (await page.$$('iframe')).length === 0)

// ---------- autoplay ----------
const a0 = await audio()
check('a track is loaded', !!a0?.src, a0?.src?.slice(-28))
check('it is playing on arrival', a0 && !a0.paused)

// ---------- scroll reveals the player, hides the title ----------
await scrollTo(0.35)
check('title card yields on scroll', !(await visibleText('h1')))
const track = await page.$eval('h2', (e) => e.textContent.trim()).catch(() => null)
check('player is on screen', !!track, track)
check('artwork rendered', (await page.$$('img[src*="mzstatic"]')).length > 0)
const railed = await page.$$eval('[data-frame]', (els) => els.map((e) => Number(e.style.opacity || 0)))
check('backdrop advanced with scroll', railed.slice(1).some((o) => o > 0.05))

// ---------- transport ----------
await page.click('button[aria-label="Next track"]')
await sleep(1200)
const track2 = await page.$eval('h2', (e) => e.textContent.trim())
check('next advances the queue', track2 !== track, `${track} -> ${track2}`)

// ---------- scroll up reveals the queue ----------
await page.evaluate(() => {
  for (let i = 0; i < 14; i++) window.dispatchEvent(new WheelEvent('wheel', { deltaY: -40, bubbles: true }))
})
await sleep(900)
const sheet = await page.$('[role="dialog"][aria-label="Queue"]')
check('scrolling up raises the queue', !!sheet)
const rows = await page.$$eval('[role="dialog"] ol li', (n) => n.length)
check('queue lists the chapter', rows === 35, `${rows} rows`)

// pick a track from the queue
await page.evaluate(() => document.querySelectorAll('[role="dialog"] ol li button')[7].click())
await sleep(1300)
check('queue closes after picking', (await page.$('[role="dialog"][aria-label="Queue"]')) === null)
const track3 = await page.$eval('h2', (e) => e.textContent.trim())
check('picked track is playing', track3 !== track2, track3)

// ---------- crossfade + auto-advance ----------
const before = track3
// Nudge the active clip to just before the crossfade threshold.
await page.evaluate(() => {
  const els = [...document.querySelectorAll('audio')]
  const a = els.find((x) => !x.paused) ?? els[0]
  if (a && Number.isFinite(a.duration)) a.currentTime = Math.max(0, a.duration - 3)
})
// During the blend both elements should be audible at once.
let blended = false
for (let i = 0; i < 40 && !blended; i++) {
  blended = await page.evaluate(() => {
    const playing = [...document.querySelectorAll('audio')].filter((x) => !x.paused)
    return playing.length === 2 && playing.every((x) => x.volume > 0)
  })
  await sleep(100)
}
check('clips crossfade into each other', blended)
await sleep(3200)
const track4 = await page.$eval('h2', (e) => e.textContent.trim())
check('queue auto-advances when a track ends', track4 !== before, `${before} -> ${track4}`)
check('only one clip is left playing',
  await page.evaluate(() => [...document.querySelectorAll('audio')].filter((x) => !x.paused).length === 1))

// ---------- YouTube backend (only when tracks have resolved video ids) ----------
await page.goto(`${BASE}/within-you/nostalgic-classics`, { waitUntil: 'networkidle2' })
await sleep(1800)
await scrollTo(0.35)
const ytBtn = await page.$$eval('button', (bs) => {
  const b = bs.find((x) => /play full songs$/i.test(x.textContent.trim()))
  if (b) b.click()
  return !!b
})
if (ytBtn) {
  // the IFrame API replaces #yt-mount with its own iframe
  await page.waitForFunction(
    () => !!document.querySelector('#yt-stage iframe[src*="youtube"]'), { timeout: 20000 },
  ).catch(() => {})
  const ytFrame = await page.$('#yt-stage iframe')
  check('youtube player mounts', !!ytFrame)
  check('youtube stage is visible (required by their terms)',
    await page.evaluate(() => {
      const el = document.querySelector('#yt-stage')
      if (!el) return false
      const s = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 150 && r.height > 80
    }))
  await sleep(2000)
  check('switches to full songs on YouTube',
    await page.evaluate(() => document.body.innerText.includes('Full songs · YouTube')))

  // The label alone proves nothing — the clock has to move, and it has to be showing a
  // full-length track rather than a 30-second clip.
  const elapsed = () => page.evaluate(() => {
    const t = [...document.querySelectorAll('span')]
      .map((e) => e.textContent.trim()).filter((x) => /^\d+:\d\d$/.test(x))
    const secs = (x) => { const [m, s] = x.split(':').map(Number); return m * 60 + s }
    return { first: t[0] ? secs(t[0]) : null, last: t[1] ? secs(t[1]) : null }
  })
  const t0 = await elapsed()
  await sleep(6000)
  const t1 = await elapsed()
  check('the full song actually plays', t1.first > t0.first, `${t0.first}s -> ${t1.first}s`)
  check('it is a full-length track, not a 30s clip', (t1.last ?? 0) > 60, `${t1.last}s long`)
  check('preview audio stops when YouTube takes over',
    await page.evaluate(() => [...document.querySelectorAll('audio')].every((a) => a.paused)))
  // back to previews
  await page.$$eval('button', (bs) => {
    const b = bs.find((x) => /back to previews/i.test(x.textContent.trim()))
    if (b) b.click()
  })
  await sleep(1500)
  check('can return to previews',
    await page.evaluate(() => !document.body.innerText.includes('Full songs · YouTube')))
} else {
  console.log('SKIP  youtube backend — no resolved video ids in the data')
}

// ---------- end of chapter ----------
await page.goto(`${BASE}/within-you/nostalgic-classics`, { waitUntil: 'networkidle2' })
await sleep(1500)
await scrollTo(1)
const outro = await page.$$eval('a[href="/within-you/ghazals-soul"]', (a) =>
  a.some((el) => Number(getComputedStyle(el.closest('div[style]') ?? el).opacity) > 0.5))
check('the way onward appears at the end', outro)
await Promise.all([
  page.waitForFunction(() => location.pathname === '/within-you/ghazals-soul', { timeout: 9000 }),
  page.evaluate(() => document.querySelector('a[href="/within-you/ghazals-soul"]').click()),
])
await sleep(1400)
check('Continue advances the road', url() === '/within-you/ghazals-soul', url())
check('arrives at the top', (await page.evaluate(() => window.scrollY)) < 40)
const a2 = await audio()
check('next chapter loads its own queue', a2 && !a2.paused && a2.src !== a0.src,
  `${a0?.src?.slice(-18)} -> ${a2?.src?.slice(-18)}`)

// ---------- history ----------
await page.goBack({ waitUntil: 'domcontentloaded' })
await sleep(1100)
check('back returns to the previous stop', url() === '/within-you/nostalgic-classics', url())
await page.goForward({ waitUntil: 'domcontentloaded' })
await sleep(1100)
check('forward returns', url() === '/within-you/ghazals-soul', url())

// ---------- deep link + reload ----------
await page.goto(`${BASE}/within-you/shared-earphones`, { waitUntil: 'networkidle2' })
await sleep(1300)
check('deep link works', (await visibleText('h1')) === 'Shared Earphones')
await page.reload({ waitUntil: 'networkidle2' })
await sleep(1300)
check('survives reload', url() === '/within-you/shared-earphones')

// ---------- the loud road ----------
await page.goto(`${BASE}/for-fun/bollywood-dance-anthems`, { waitUntil: 'networkidle2' })
await sleep(1500)
check('for-fun deep link', (await visibleText('h1'))?.toLowerCase() === 'bollywood dance anthems')
check('loud road has its own face',
  /anton/i.test(await page.$eval('h1', (e) => getComputedStyle(e).fontFamily)))
const cutBefore = await page.$$eval('[data-frame]', (e) => e.map((x) => Number(x.style.opacity || 0)))
await scrollTo(0.3)
const cutAfter = await page.$$eval('[data-frame]', (e) => e.map((x) => Number(x.style.opacity || 0)))
check('loud road cuts rather than blends',
  cutBefore.join() !== cutAfter.join() && cutAfter.filter((o) => o > 0.5).length === 1)

await page.goto(`${BASE}/for-fun/end`, { waitUntil: 'networkidle2' })
await sleep(800)
check('end page has Buy Me a Coffee', (await page.$$('a[href*="buymeacoffee"]')).length > 0)

// ---------- fallback ----------
await page.goto(`${BASE}/within-you/nope`, { waitUntil: 'networkidle2' })
await sleep(900)
check('unknown chapter falls back to the map', url() === '/within-you', url())

// ---------- reduced motion ----------
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
await page.goto(`${BASE}/within-you/heartbreak-longing`, { waitUntil: 'networkidle2' })
await sleep(1200)
const rm1 = await page.$$eval('[data-frame]', (e) => e.map((x) => Number(x.style.opacity || 0)))
await scrollTo(0.5)
const rm2 = await page.$$eval('[data-frame]', (e) => e.map((x) => Number(x.style.opacity || 0)))
check('reduced motion: no image cycling', rm1.join() === rm2.join() && rm2[0] === 1)
check('reduced motion: content still renders',
  (await page.$eval('h1', (e) => e.textContent.trim())) === 'Heartbreak & Longing')

const real = errors.filter((e) => !/favicon|404 \(Not Found\)|ERR_BLOCKED|autoplay/i.test(e))
check('no console/page errors', real.length === 0, real.slice(0, 2).join(' | '))

await browser.close()
console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`)
process.exit(failures ? 1 : 0)
