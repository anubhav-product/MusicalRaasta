/**
 * YouTube IFrame Player API loader.
 *
 * This is the only route to full-length songs that asks nothing of the listener — no
 * subscription, no sign-in. Resolution of each track to a video id happens offline
 * (scripts/resolve-youtube.mjs) and is baked into the song data, so the site itself needs
 * no API key at runtime; embedding is free and unauthenticated.
 *
 * YouTube's terms require the player stay visible, so the app renders it as the artwork
 * panel rather than hiding it.
 */
const SRC = 'https://www.youtube.com/iframe_api'

let apiPromise = null

export function loadYouTubeApi() {
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve, reject) => {
    if (window.YT?.Player) { resolve(window.YT); return }

    const timeout = setTimeout(() => reject(new Error('YouTube player failed to load')), 12000)
    // The API calls this global exactly once when it is ready.
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timeout)
      if (typeof previous === 'function') previous()
      resolve(window.YT)
    }

    if (!document.querySelector(`script[src="${SRC}"]`)) {
      const el = document.createElement('script')
      el.src = SRC
      el.async = true
      el.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('YouTube API blocked')) })
      document.head.appendChild(el)
    }
  }).catch((err) => { apiPromise = null; throw err })
  return apiPromise
}

/**
 * Only treat a chapter as playable in full when EVERY track has a resolved video.
 * A partly-resolved chapter would silently skip the songs that have none, which is a
 * worse experience than playing the whole chapter as previews until resolution finishes.
 */
export const hasYouTube = (queue) => queue.length > 0 && queue.every((t) => t.youtubeId)
