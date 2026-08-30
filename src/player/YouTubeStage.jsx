import { createPortal } from 'react-dom'
import { usePlayer } from './context.js'

/**
 * The visible YouTube player.
 *
 * YouTube's terms require the video player be shown rather than used as a hidden audio
 * source, so it lives here as a small persistent card instead of being tucked away. It is
 * mounted for the life of the page — the IFrame API replaces #yt-mount with its own
 * iframe, and re-creating that on every scroll position or route change would cut the
 * song off, so visibility is toggled rather than the element itself.
 */
export default function YouTubeStage() {
  const { backend, upgrading, disableYouTube } = usePlayer()
  const active = backend === 'youtube'

  const stage = (
    <div
      id="yt-stage"
      className="fixed bottom-[4.5rem] left-4 z-[45] w-[15rem] overflow-hidden rounded-xl border border-white/15 bg-black shadow-2xl sm:left-6 sm:w-[19rem]"
      style={{
        // kept in the DOM at all times; only shown once the player is live
        display: active || upgrading ? 'block' : 'none',
      }}
    >
      <div className="aspect-video w-full">
        <div id="yt-mount" className="h-full w-full" />
      </div>
      {active && (
        <button
          type="button"
          onClick={disableYouTube}
          className="w-full border-t border-white/10 py-1.5 text-[9px] tracking-[0.2em] uppercase text-white/45 transition-colors hover:text-white"
        >
          Back to previews
        </button>
      )}
    </div>
  )

  return typeof document === 'undefined' ? stage : createPortal(stage, document.body)
}
