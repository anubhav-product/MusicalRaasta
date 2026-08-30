/**
 * Optional Apple Music (MusicKit JS) backend — the only way to play FULL songs.
 *
 * The preview backend plays 30-second clips because that is all the public iTunes API
 * exposes. Full playback is possible, but Apple gates it on two things this code cannot
 * supply for you:
 *
 *   1. A developer token — a JWT signed with a MusicKit private key from a paid Apple
 *      Developer account. Put it in .env as VITE_MUSICKIT_TOKEN.
 *   2. Each listener signing in with their own active Apple Music subscription.
 *
 * With both, MusicKit streams the full catalogue track and manages the queue itself. With
 * neither, nothing here runs and the app stays on previews.
 */
const TOKEN = import.meta.env.VITE_MUSICKIT_TOKEN ?? ''
const SRC = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js'

export const hasDeveloperToken = () => Boolean(TOKEN)

let instancePromise = null

/** Loads and configures MusicKit once. Resolves to the instance, or throws. */
export function getMusicKit() {
  if (!TOKEN) return Promise.reject(new Error('No MusicKit developer token configured'))
  if (instancePromise) return instancePromise

  instancePromise = new Promise((resolve, reject) => {
    const done = async () => {
      try {
        await window.MusicKit.configure({
          developerToken: TOKEN,
          app: { name: 'Two roads, one playlist', build: '1.0.0' },
        })
        resolve(window.MusicKit.getInstance())
      } catch (err) {
        reject(err)
      }
    }

    if (window.MusicKit) { done(); return }

    const existing = document.querySelector(`script[src="${SRC}"]`)
    if (existing) {
      existing.addEventListener('load', done, { once: true })
      existing.addEventListener('error', () => reject(new Error('MusicKit failed to load')), { once: true })
      return
    }
    const el = document.createElement('script')
    el.src = SRC
    el.async = true
    el.addEventListener('load', done, { once: true })
    el.addEventListener('error', () => reject(new Error('MusicKit failed to load')), { once: true })
    document.head.appendChild(el)
  }).catch((err) => {
    instancePromise = null
    throw err
  })

  return instancePromise
}

/** Prompts the listener to sign in to their own Apple Music account. */
export async function authorize() {
  const music = await getMusicKit()
  if (!music.isAuthorized) await music.authorize()
  return music
}

export async function restoreSession() {
  if (!TOKEN) return null
  try {
    const music = await getMusicKit()
    return music.isAuthorized ? music : null
  } catch {
    return null
  }
}
