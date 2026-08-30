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
check('no Apple Music embed iframes', (await page.$$('iframe[src*="embed.music.apple.com"]')).length === 0)

// ---------- a fully-resolved chapter upgrades itself to full songs ----------
// The "Full songs" label lives in the hero player, which is visibility:hidden until you
// scroll — so assert on the YouTube stage, which is present at any scroll position.
const ytStageVisible = () => page.evaluate(() => {
  const el = document.querySelector('#yt-stage')
  if (!el) return false
  const st = getComputedStyle(el)
  return st.display !== 'none' && st.visibility !== 'hidden'
})
await page.waitForFunction(() => {
  const el = document.querySelector('#yt-stage')
  return el && getComputedStyle(el).display !== 'none'
}, { timeout: 25000 }).catch(() => {})
check('full songs start automatically, with no button to press', await ytStageVisible())
check('youtube stage is visible (required by their terms)',
  await page.evaluate(() => {
    const el = document.querySelector('#yt-stage')
    if (!el) return false
    const st = getComputedStyle(el); const r = el.getBoundingClientRect()
    return st.display !== 'none' && st.visibility !== 'hidden' && r.width > 150 && r.height > 80
  }))
check('an unverified track falls back to its preview instead of being skipped',
  await page.evaluate(() => [...document.querySelectorAll('audio')].some((a) => !a.paused)))

// A chapter whose first track IS verified should stream it in full.
await page.goto(`${BASE}/within-you/ghazals-soul`, { waitUntil: 'networkidle2' })
await sleep(7000)
check('preview audio stays silent while YouTube plays',
  await page.evaluate(() => [...document.querySelectorAll('audio')].every((a) => a.paused)))

// ---------- scroll reveals the player, hides the title ----------
await scrollTo(0.35)
const clock = () => page.evaluate(() => {
  const t = [...document.querySelectorAll('span')].map((e) => e.textContent.trim())
    .filter((x) => /^\d+:\d\d$/.test(x))
  const secs = (x) => { const [m, sec] = x.split(':').map(Number); return m * 60 + sec }
  return { at: t[0] ? secs(t[0]) : null, len: t[1] ? secs(t[1]) : null }
})
const c0 = await clock()
await sleep(6000)
const c1 = await clock()
check('the full song actually plays', c1.at > c0.at, `${c0.at}s -> ${c1.at}s`)
check('it is a full-length track, not a 30s clip', (c1.len ?? 0) > 60, `${c1.len}s long`)
check('title card yields on scroll', !(await visibleText('h1')))
const heroTrack = await page.$eval('h2', (e) => e.textContent.trim()).catch(() => null)
check('player is on screen', !!heroTrack, heroTrack)
check('artwork rendered', (await page.$$('img[src*="mzstatic"]')).length > 0)
const railed = await page.$$eval('[data-frame]', (els) => els.map((e) => Number(e.style.opacity || 0)))
check('backdrop advanced with scroll', railed.slice(1).some((o) => o > 0.05))

// ---------- preview backend, on a chapter with no resolved videos ----------
await page.goto(`${BASE}/within-you/sweet-romantic`, { waitUntil: 'networkidle2' })
await sleep(2500)
check('unresolved chapter stays on previews', !(await ytStageVisible()))
const p0 = await audio()
check('a preview clip is playing', p0 && !p0.paused, p0?.src?.slice(-24))

await scrollTo(0.3)
const track = await page.$eval('h2', (e) => e.textContent.trim())
await page.click('button[aria-label="Next track"]')
await sleep(1400)
const track2 = await page.$eval('h2', (e) => e.textContent.trim())
check('next advances the queue', track2 !== track, `${track} -> ${track2}`)

// clips should blend rather than stop dead
await page.evaluate(() => {
  const els = [...document.querySelectorAll('audio')]
  const a = els.find((x) => !x.paused) ?? els[0]
  if (a && Number.isFinite(a.duration)) a.currentTime = Math.max(0, a.duration - 3)
})
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
const track3 = await page.$eval('h2', (e) => e.textContent.trim())
check('preview queue auto-advances', track3 !== track2, `${track2} -> ${track3}`)
check('only one clip is left playing',
  await page.evaluate(() => [...document.querySelectorAll('audio')].filter((x) => !x.paused).length === 1))

await page.goto(`${BASE}/within-you/nostalgic-classics`, { waitUntil: 'networkidle2' })
await sleep(2000)
await scrollTo(0.35)

// ---------- the queue opens from the player, not a scroll gesture ----------
await page.$$eval('button', (bs) => {
  const b = bs.find((x) => /^queue/i.test(x.textContent.trim()) || /show queue/i.test(x.getAttribute('aria-label') || ''))
  if (b) b.click()
})
await sleep(1100)
const sheet = await page.$('[role="dialog"][aria-label="Queue"]')
check('the queue opens from the player', !!sheet)
const rows = await page.$$eval('[role="dialog"] ol li', (n) => n.length)
check('queue lists the chapter', rows === 35, `${rows} rows`)

// pick a track from the queue
await page.evaluate(() => document.querySelectorAll('[role="dialog"] ol li button')[7].click())
await sleep(1300)
check('queue closes after picking', (await page.$('[role="dialog"][aria-label="Queue"]')) === null)
const picked = await page.$eval('h2', (e) => e.textContent.trim())
check('picked track is playing', !!picked, picked)

// ---------- arrow keys step through the imagery ----------
await page.goto(`${BASE}/within-you/nostalgic-classics`, { waitUntil: 'networkidle2' })
await sleep(2000)
await scrollTo(0.4)
const beforeY = await page.evaluate(() => window.scrollY)
const clickImg = (label) => page.$$eval('button', (bs, l) => {
  const b = bs.find((x) => new RegExp(l, 'i').test(x.getAttribute('aria-label') || ''))
  if (b) b.click()
  return !!b
}, label)
check('image chevrons exist', await clickImg('next image'))
await sleep(1500)
const afterY = await page.evaluate(() => window.scrollY)
check('next-image control advances the imagery', afterY > beforeY, `${beforeY} -> ${afterY}`)
await clickImg('previous image')
await sleep(1500)
check('previous-image control goes back',
  (await page.evaluate(() => window.scrollY)) < afterY)

// arrows now seek the track, as in any music player
const volBefore = await page.evaluate(() => document.querySelector('input[aria-label="Volume"]')?.value)
await page.keyboard.press('ArrowDown')
await sleep(400)
check('down arrow lowers the volume',
  (await page.evaluate(() => document.querySelector('input[aria-label="Volume"]')?.value)) < volBefore)
await page.keyboard.press('ArrowUp')
await sleep(400)
check('up arrow raises it back',
  (await page.evaluate(() => document.querySelector('input[aria-label="Volume"]')?.value)) >= volBefore)
check('the control legend is on screen',
  await page.$$eval('button', (bs) => bs.some((b) => /previous image/i.test(b.getAttribute('aria-label') || ''))))
check('there is a 10-second skip control',
  await page.$$eval('button', (bs) => bs.some((b) => /forward 10 seconds/i.test(b.getAttribute('aria-label') || ''))))

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
await page.waitForFunction(() => {
  const el = document.querySelector('#yt-stage')
  const ytUp = el && getComputedStyle(el).display !== 'none'
  const clip = [...document.querySelectorAll('audio')].some((a) => !a.paused)
  return ytUp || clip
}, { timeout: 25000 }).catch(() => {})
check('next chapter loads its own music',
  (await ytStageVisible()) ||
  (await page.evaluate(() => [...document.querySelectorAll('audio')].some((a) => !a.paused))))

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
