import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PlayerContext } from './context.js'
import { authorize, hasDeveloperToken, restoreSession } from './appleMusic.js'
import { hasYouTube, loadYouTubeApi } from './youtube.js'
import YouTubeStage from './YouTubeStage.jsx'

// How long before a clip ends to begin blending the next one in.
const CROSSFADE_S = 2.4
const RAMP_MS = 60

/**
 * Playback for the whole journey. A single engine outlives route changes, so sound
 * carries from stop to stop instead of restarting.
 *
 * Two backends:
 *   'preview' — 30s clips from the public iTunes API, played through a pair of <audio>
 *               elements that crossfade into each other, so a queue of clips reads as a
 *               continuous mix rather than 30 seconds of music and a hard stop.
 *   'youtube' — full-length songs through the YouTube IFrame player. Asks nothing of the
 *               listener; video ids are resolved offline into the song data.
 *   'apple'   — MusicKit streams the full-length track. Needs a developer token and the
 *               listener's own Apple Music subscription; any failure falls back to preview.
 */
export function PlayerProvider({ children }) {
  const aRef = useRef(null)
  const bRef = useRef(null)
  const activeRef = useRef('a')
  const fadeRef = useRef(null)
  const handoffRef = useRef(null)

  const [queue, setQueue] = useState([])
  const [queueKey, setQueueKey] = useState(null)
  const [index, setIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(30)
  const [needsGesture, setNeedsGesture] = useState(false)

  const [backend, setBackend] = useState('preview')
  const [upgrading, setUpgrading] = useState(false)
  const [upgradeError, setUpgradeError] = useState(null)
  const musicRef = useRef(null)
  const ytRef = useRef(null)
  const [ytReady, setYtReady] = useState(false)
  const [ytMountId, setYtMountId] = useState(null)
  const backendRef = useRef('preview')
  // Pausing the preview elements while handing over to another backend fires 'pause',
  // which would otherwise be read as the listener choosing to stop.
  const switchingRef = useRef(false)
  useEffect(() => { backendRef.current = backend }, [backend])

  const current = queue[index] ?? null
  const queueRef = useRef(queue)
  const indexRef = useRef(index)
  useEffect(() => { queueRef.current = queue }, [queue])
  useEffect(() => { indexRef.current = index }, [index])

  const el = (which) => (which === 'a' ? aRef.current : bRef.current)
  const activeEl = () => el(activeRef.current)
  const idleEl = () => el(activeRef.current === 'a' ? 'b' : 'a')

  const attempt = useCallback((audio) => {
    if (!audio) return
    const p = audio.play()
    if (p?.catch) {
      p.then(() => setNeedsGesture(false)).catch((err) => {
        if (err?.name === 'NotAllowedError') setNeedsGesture(true)
      })
    }
  }, [])

  const cancelFade = useCallback(() => {
    if (fadeRef.current) { clearInterval(fadeRef.current); fadeRef.current = null }
    handoffRef.current = null
    const idle = idleEl()
    if (idle) { idle.pause(); idle.volume = 1 }
    const act = activeEl()
    if (act) act.volume = 1
  }, [])

  /** Blend the clip that is ending into the next one, then adopt it as the active track. */
  const beginCrossfade = useCallback((toIndex) => {
    const from = activeEl()
    const to = idleEl()
    const track = queueRef.current[toIndex]
    if (!from || !to || !track?.previewUrl) return

    handoffRef.current = toIndex
    to.src = track.previewUrl
    to.volume = 0
    to.currentTime = 0
    attempt(to)

    const started = performance.now()
    fadeRef.current = setInterval(() => {
      const t = Math.min(1, (performance.now() - started) / (CROSSFADE_S * 1000))
      // equal-power curve so the blend holds its loudness through the middle
      from.volume = Math.max(0, Math.cos((t * Math.PI) / 2))
      to.volume = Math.min(1, Math.sin((t * Math.PI) / 2))
      if (t >= 1) {
        clearInterval(fadeRef.current)
        fadeRef.current = null
        from.pause()
        from.volume = 1
        to.volume = 1
        activeRef.current = activeRef.current === 'a' ? 'b' : 'a'
        handoffRef.current = null
        setIndex(toIndex)
        setProgress(0)
      }
    }, RAMP_MS)
  }, [attempt])

  const loadQueue = useCallback((key, tracks, { autoplay = true, startAt = 0 } = {}) => {
    setQueueKey((prevKey) => {
      if (prevKey === key) return prevKey
      cancelFade()
      setQueue(tracks)
      setIndex(startAt)
      setProgress(0)
      if (autoplay) setIsPlaying(true)
      return key
    })
  }, [cancelFade])

  const playAt = useCallback((i) => {
    cancelFade()
    const music = musicRef.current
    if (music && backendRef.current === 'apple') music.changeToMediaAtIndex(i).catch(() => {})
    setIndex(i)
    setProgress(0)
    setIsPlaying(true)
  }, [cancelFade])

  const next = useCallback(() => {
    cancelFade()
    const music = musicRef.current
    if (music && backendRef.current === 'apple') { music.skipToNextItem().catch(() => {}); return }
    setIndex((i) => (queueRef.current.length ? (i + 1) % queueRef.current.length : 0))
    setProgress(0)
    setIsPlaying(true)
  }, [cancelFade])

  const prev = useCallback(() => {
    cancelFade()
    const music = musicRef.current
    if (music && backendRef.current === 'apple') { music.skipToPreviousItem().catch(() => {}); return }
    const audio = activeEl()
    // Standard transport behaviour: restart the track unless you're near its start.
    if (audio && audio.currentTime > 3) { audio.currentTime = 0; setProgress(0); return }
    setIndex((i) => (queueRef.current.length ? (i - 1 + queueRef.current.length) % queueRef.current.length : 0))
    setProgress(0)
    setIsPlaying(true)
  }, [cancelFade])

  const nextRef = useRef(null)
  useEffect(() => { nextRef.current = next }, [next])

  const toggle = useCallback(() => {
    setNeedsGesture(false)
    setIsPlaying((p) => !p)
  }, [])

  const seek = useCallback((fraction) => {
    if (backendRef.current === 'youtube') {
      const player = ytRef.current
      try {
        const d = player?.getDuration?.() ?? 0
        player?.seekTo?.(Math.max(0, Math.min(1, fraction)) * d, true)
      } catch { /* not ready */ }
      return
    }
    const music = musicRef.current
    if (music && backendRef.current === 'apple') {
      music.seekToTime(Math.max(0, Math.min(1, fraction)) * (music.currentPlaybackDuration || 0)).catch(() => {})
      return
    }
    const audio = activeEl()
    if (!audio || !Number.isFinite(audio.duration)) return
    cancelFade()
    audio.currentTime = Math.max(0, Math.min(1, fraction)) * audio.duration
    setProgress(audio.currentTime)
  }, [cancelFade])

  // Point the active element at the current track. Skipped when a crossfade already put
  // it there, and while MusicKit is driving.
  useEffect(() => {
    if (backend !== 'preview') return
    const audio = activeEl()
    if (!audio || !current?.previewUrl) return
    if (audio.src !== current.previewUrl) {
      audio.volume = 1
      audio.src = current.previewUrl
      audio.load()
    }
    if (isPlaying) attempt(audio)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.previewUrl, backend])

  useEffect(() => {
    const music = musicRef.current
    if (backend === 'apple' && music) {
      if (isPlaying) music.play().catch(() => setNeedsGesture(true))
      else music.pause()
      return
    }
    if (backend !== 'preview') {
      // Another backend is producing the sound; make sure these are not also playing.
      cancelFade()
      aRef.current?.pause()
      bRef.current?.pause()
      return
    }
    const audio = activeEl()
    if (!audio || !current?.previewUrl) return
    if (isPlaying) attempt(audio)
    else { audio.pause(); if (fadeRef.current) cancelFade() }
  }, [isPlaying, current?.previewUrl, attempt, backend, cancelFade])

  // Progress, the crossfade trigger, and the end-of-clip safety net.
  useEffect(() => {
    if (backend !== 'preview') return
    const nodes = [aRef.current, bRef.current].filter(Boolean)
    const onTime = (e) => {
      if (e.target !== activeEl()) return
      setProgress(e.target.currentTime)
      const d = e.target.duration
      if (!Number.isFinite(d) || handoffRef.current !== null) return
      const q = queueRef.current
      if (q.length < 2) return
      if (d - e.target.currentTime <= CROSSFADE_S) {
        beginCrossfade((indexRef.current + 1) % q.length)
      }
    }
    const onMeta = (e) => {
      if (e.target !== activeEl()) return
      setDuration(Number.isFinite(e.target.duration) ? e.target.duration : 30)
    }
    // If a clip runs out before the blend completes, or a source is dead, keep moving.
    const onEnded = (e) => { if (e.target === activeEl() && handoffRef.current === null) next() }
    const onError = (e) => { if (e.target === activeEl()) next() }
    const onPlay = (e) => { if (e.target === activeEl() && !switchingRef.current) setIsPlaying(true) }
    const onPause = (e) => {
      if (switchingRef.current) return
      if (e.target === activeEl() && handoffRef.current === null && !fadeRef.current) setIsPlaying(false)
    }
    for (const n of nodes) {
      n.addEventListener('timeupdate', onTime)
      n.addEventListener('loadedmetadata', onMeta)
      n.addEventListener('ended', onEnded)
      n.addEventListener('error', onError)
      n.addEventListener('play', onPlay)
      n.addEventListener('pause', onPause)
    }
    return () => {
      for (const n of nodes) {
        n.removeEventListener('timeupdate', onTime)
        n.removeEventListener('loadedmetadata', onMeta)
        n.removeEventListener('ended', onEnded)
        n.removeEventListener('error', onError)
        n.removeEventListener('play', onPlay)
        n.removeEventListener('pause', onPause)
      }
    }
  }, [backend, beginCrossfade, next])

  useEffect(() => () => cancelFade(), [cancelFade])

  // ---- Apple Music backend ----
  useEffect(() => {
    if (!hasDeveloperToken()) return
    let cancelled = false
    restoreSession().then((music) => {
      if (!cancelled && music) { musicRef.current = music; setBackend('apple') }
    })
    return () => { cancelled = true }
  }, [])

  const enableFullSongs = useCallback(async () => {
    if (!hasDeveloperToken()) {
      setUpgradeError('This site has no Apple Music developer token configured.')
      return false
    }
    setUpgrading(true)
    setUpgradeError(null)
    switchingRef.current = true
    try {
      const music = await authorize()
      musicRef.current = music
      cancelFade()
      aRef.current?.pause()
      bRef.current?.pause()
      setBackend('apple')
      setIsPlaying(true)
      return true
    } catch (err) {
      setUpgradeError(err?.message ?? 'Apple Music sign-in was cancelled.')
      setBackend('preview')
      return false
    } finally {
      setUpgrading(false)
      switchingRef.current = false
    }
  }, [cancelFade])

  const disableFullSongs = useCallback(() => {
    const music = musicRef.current
    if (music) { try { music.stop() } catch { /* already stopped */ } }
    setBackend('preview')
  }, [])

  useEffect(() => {
    const music = musicRef.current
    if (backend !== 'apple' || !music || !queue.length) return
    let cancelled = false
    const ids = queue.map((t) => t.trackId).filter(Boolean)
    ;(async () => {
      try {
        await music.setQueue({ songs: ids, startWith: Math.min(index, ids.length - 1) })
        if (!cancelled && isPlaying) await music.play()
      } catch {
        if (!cancelled) { setUpgradeError('Apple Music could not load this chapter.'); setBackend('preview') }
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend, queueKey])

  useEffect(() => {
    const music = musicRef.current
    if (backend !== 'apple' || !music) return
    const onItem = () => {
      const i = music.nowPlayingItemIndex
      if (typeof i === 'number' && i >= 0) setIndex(i)
      setDuration(music.currentPlaybackDuration || 30)
    }
    const onState = () => {
      const States = window.MusicKit?.PlaybackStates ?? {}
      setIsPlaying(music.playbackState === States.playing)
    }
    const onTime = () => {
      setProgress(music.currentPlaybackTime || 0)
      setDuration(music.currentPlaybackDuration || 30)
    }
    music.addEventListener('nowPlayingItemDidChange', onItem)
    music.addEventListener('playbackStateDidChange', onState)
    music.addEventListener('playbackTimeDidChange', onTime)
    return () => {
      music.removeEventListener('nowPlayingItemDidChange', onItem)
      music.removeEventListener('playbackStateDidChange', onState)
      music.removeEventListener('playbackTimeDidChange', onTime)
    }
  }, [backend])

  // ---- YouTube backend ----
  const youtubeAvailable = hasYouTube(queue)

  /** Attach the IFrame player to a mount point the UI provides, and take over playback. */
  const enableYouTube = useCallback(async (mountId) => {
    if (!mountId) return false
    setUpgrading(true)
    setUpgradeError(null)
    switchingRef.current = true
    try {
      const YT = await loadYouTubeApi()
      cancelFade()
      aRef.current?.pause()
      bRef.current?.pause()

      await new Promise((resolve, reject) => {
        ytRef.current = new YT.Player(mountId, {
          host: 'https://www.youtube-nocookie.com',
          playerVars: { playsinline: 1, rel: 0, modestbranding: 1, origin: window.location.origin },
          events: {
            onReady: () => { setYtReady(true); resolve() },
            onError: () => {
              // A blocked or removed video must not stall the queue.
              setTimeout(() => nextRef.current?.(), 250)
            },
            onStateChange: (e) => {
              const S = window.YT.PlayerState
              if (e.data === S.ENDED) nextRef.current?.()
              if (e.data === S.PLAYING) setIsPlaying(true)
              if (e.data === S.PAUSED) setIsPlaying(false)
            },
          },
        })
        setTimeout(() => reject(new Error('YouTube player timed out')), 12000)
      })

      setYtMountId(mountId)
      setBackend('youtube')
      // Asking for full songs is an explicit request to hear them.
      setIsPlaying(true)
      return true
    } catch (err) {
      setUpgradeError(err?.message ?? 'Could not start the YouTube player.')
      setBackend('preview')
      return false
    } finally {
      setUpgrading(false)
      switchingRef.current = false
    }
  }, [cancelFade])

  // Full songs are the default wherever they exist. Autoplay is allowed because the
  // click that navigated here counts as user activation; on a cold deep-link load the
  // player falls back to a tap-to-start, exactly as the preview backend does.
  const autoTried = useRef(new Set())
  useEffect(() => {
    if (!youtubeAvailable || backend !== 'preview' || upgrading) return
    if (!queueKey || autoTried.current.has(queueKey)) return
    autoTried.current.add(queueKey)
    enableYouTube('yt-mount')
  }, [youtubeAvailable, backend, upgrading, queueKey, enableYouTube])

  const disableYouTube = useCallback(() => {
    try { ytRef.current?.stopVideo?.() } catch { /* player already gone */ }
    // Remember the choice for this chapter so the auto-upgrade does not undo it.
    if (queueKey) autoTried.current.add(queueKey)
    setBackend('preview')
  }, [queueKey])

  // Load whichever track is current into the YouTube player.
  useEffect(() => {
    if (backend !== 'youtube' || !ytReady) return
    const player = ytRef.current
    if (!player?.loadVideoById) return
    if (!current?.youtubeId) { next(); return }
    try {
      player.loadVideoById(current.youtubeId)
      if (!isPlaying) player.pauseVideo?.()
    } catch { /* player torn down mid-navigation */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend, ytReady, current?.youtubeId])

  useEffect(() => {
    if (backend !== 'youtube' || !ytReady) return
    const player = ytRef.current
    try {
      if (isPlaying) player?.playVideo?.()
      else player?.pauseVideo?.()
    } catch { /* not ready yet */ }
  }, [backend, ytReady, isPlaying])

  // Poll the player for progress; the IFrame API has no timeupdate event.
  useEffect(() => {
    if (backend !== 'youtube' || !ytReady) return
    const id = setInterval(() => {
      const player = ytRef.current
      try {
        const d = player?.getDuration?.() ?? 0
        if (d > 0) setDuration(d)
        setProgress(player?.getCurrentTime?.() ?? 0)
      } catch { /* transient */ }
    }, 400)
    return () => clearInterval(id)
  }, [backend, ytReady])

  // OS media keys and the lock screen.
  useEffect(() => {
    if (!('mediaSession' in navigator) || !current) return
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: current.title,
      artist: current.artist,
      album: current.album ?? '',
      artwork: current.artwork ? [{ src: current.artwork, sizes: '600x600', type: 'image/jpeg' }] : [],
    })
    navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true))
    navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false))
    navigator.mediaSession.setActionHandler('nexttrack', next)
    navigator.mediaSession.setActionHandler('previoustrack', prev)
  }, [current, next, prev])

  const value = useMemo(
    () => ({
      queue, queueKey, index, current, isPlaying, progress, duration, needsGesture,
      loadQueue, playAt, next, prev, toggle, seek,
      fraction: duration ? progress / duration : 0,
      backend,
      fullSongs: backend === 'apple' || backend === 'youtube',
      canOfferFullSongs: hasDeveloperToken(),
      upgrading, upgradeError, enableFullSongs, disableFullSongs,
      youtubeAvailable, enableYouTube, disableYouTube, ytMountId,
    }),
    [queue, queueKey, index, current, isPlaying, progress, duration, needsGesture,
     loadQueue, playAt, next, prev, toggle, seek,
     backend, upgrading, upgradeError, enableFullSongs, disableFullSongs,
     youtubeAvailable, enableYouTube, disableYouTube, ytMountId],
  )

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <YouTubeStage />
      <audio ref={aRef} preload="auto" />
      <audio ref={bRef} preload="auto" />
    </PlayerContext.Provider>
  )
}
