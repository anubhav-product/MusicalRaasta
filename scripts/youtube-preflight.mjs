/**
 * Checks the API key can actually call YouTube, and explains precisely what to fix if not.
 * A raw 403 from Google does not say which of the two settings is wrong.
 */
const KEY = process.env.YOUTUBE_API_KEY
if (!KEY) {
  console.error('No YOUTUBE_API_KEY. Put it in .env as YOUTUBE_API_KEY=... (that file is git-ignored).')
  process.exit(1)
}

const res = await fetch(
  `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=dQw4w9WgXcQ&key=${KEY}`,
)
const body = await res.json()

if (res.ok) {
  console.log('Key works — YouTube Data API v3 is reachable.')
  console.log('Next: npm run yt:resolve')
  process.exit(0)
}

const info = body.error?.details?.find((d) => d['@type']?.includes('ErrorInfo'))
const reason = info?.reason ?? body.error?.errors?.[0]?.reason ?? `HTTP ${res.status}`
const project = info?.metadata?.consumer?.split('/')?.[1] ?? null
const q = project ? `?project=${project}` : ''

console.error(`Key rejected: ${reason}\n`)
if (reason === 'API_KEY_SERVICE_BLOCKED' || reason === 'SERVICE_DISABLED') {
  console.error('The key exists but is not allowed to call YouTube.\n')
  console.error('  STEP 1 — is the API actually on for this project? Open:')
  console.error(`     https://console.cloud.google.com/apis/dashboard${q}`)
  console.error('     Look at the "Enabled APIs & services" table.')
  console.error('     If "YouTube Data API v3" is NOT listed, that is the problem — enable it:')
  console.error(`     https://console.cloud.google.com/apis/library/youtube.googleapis.com${q}\n`)
  console.error('  STEP 2 — only if it IS listed, the key restriction is at fault:')
  console.error(`     https://console.cloud.google.com/apis/credentials${q}`)
  console.error('     -> click the key -> API restrictions -> "Don\'t restrict key" -> SAVE\n')
  console.error(`  Note: your keys live in project ${project ?? 'unknown'}. If the console shows a`)
  console.error('  different project name at the top, you are editing the wrong project.\n')
  console.error('  Allow ~2 minutes, then: npm run yt:check')
} else if (reason === 'API_KEY_HTTP_REFERRER_BLOCKED' || reason === 'API_KEY_IP_ADDRESS_BLOCKED') {
  console.error('The key has an Application restriction (website/IP). This script runs from your')
  console.error('machine, not a browser, so set Application restrictions to "None".')
  console.error(`  https://console.cloud.google.com/apis/credentials${q}`)
} else if (reason === 'quotaExceeded' || reason === 'RATE_LIMIT_EXCEEDED') {
  console.error('Daily quota is spent. Re-run tomorrow — the resolver saves its progress.')
} else {
  console.error(JSON.stringify(body.error, null, 2).slice(0, 900))
}
process.exit(1)
