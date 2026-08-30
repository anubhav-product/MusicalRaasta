import { createPortal } from 'react-dom'
import { usePlayer } from './context.js'

/**
 * The YouTube player, kept as small and quiet as it is allowed to be.
 *
 * YouTube's terms require the video player to be visible rather than used as a hidden
 * audio source, so this cannot be removed while full songs are streaming from them. What
 * it can be is unobtrusive: a small corner chip rather than a panel, with its controls
 * moved into the player UI where they belong.
 */
export default function YouTubeStage() {
  const { backend, upgrading, ytActive } = usePlayer()
  const mounted = backend === 'youtube' || upgrading

  const stage = (
    <div
      id="yt-stage"
      aria-label="Now playing video"
      className="fixed bottom-[4.25rem] left-3 z-[45] w-[8.5rem] overflow-hidden rounded-lg border border-white/12 bg-black shadow-lg transition-opacity duration-500 sm:left-5 sm:w-[10.5rem]"
      style={{
        display: mounted ? 'block' : 'none',
        // Dim while a preview clip is covering an unverified track, so it never looks
        // like the video is the thing you are hearing.
        opacity: ytActive ? 0.9 : 0.35,
      }}
    >
      <div className="aspect-video w-full">
        <div id="yt-mount" className="h-full w-full" />
      </div>
    </div>
  )

  return typeof document === 'undefined' ? stage : createPortal(stage, document.body)
}
