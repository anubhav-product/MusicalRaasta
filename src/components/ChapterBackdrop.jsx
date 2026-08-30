import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js'

gsap.registerPlugin(ScrollTrigger)

/**
 * A full-screen, scroll-driven image stage. The page holds a tall empty scroll track and
 * everything visible is fixed on top of it, so scrolling advances the imagery rather than
 * moving any content — the chapter is a place you stand in, not a document you read.
 *
 * Two motion languages share the geometry but nothing about their timing:
 *   drift — continuous cross-dissolve with an unwinding Ken Burns and a palette morph.
 *   cut   — frames hold, then hard-cut on a step boundary with a zoom-punch and a flash.
 */
export default function ChapterBackdrop({ images, palette, mode = 'drift', onProgress, children }) {
  const trackRef = useRef(null)
  const stackRef = useRef(null)
  const tintRef = useRef(null)
  const flashRef = useRef(null)
  const reduced = usePrefersReducedMotion()

  useLayoutEffect(() => {
    const track = trackRef.current
    const stack = stackRef.current
    if (!track || !stack) return

    const frames = Array.from(stack.querySelectorAll('[data-frame]'))
    if (!frames.length) return

    if (reduced) {
      frames.forEach((el, i) => {
        el.style.opacity = i === 0 ? '1' : '0'
        el.style.transform = 'none'
      })
      onProgress?.(0)
      return
    }

    const ctx = gsap.context(() => {
      const n = frames.length
      const [deep, signature, light] = palette

      // Images occupy the middle of the scroll; the ends belong to the title and outro.
      const IMG_FROM = 0.1
      const IMG_TO = 0.9
      const imgProgress = (p) => gsap.utils.clamp(0, 1, (p - IMG_FROM) / (IMG_TO - IMG_FROM))

      if (mode === 'cut') {
        frames.forEach((el, i) => gsap.set(el, { opacity: i === 0 ? 1 : 0, scale: 1 }))
        let currentFrame = -1
        const cutTo = (i) => {
          frames.forEach((el, j) => gsap.set(el, { opacity: j === i ? 1 : 0 }))
          gsap.fromTo(frames[i], { scale: 1.09 },
            { scale: 1, duration: 0.28, ease: 'power4.out', overwrite: true })
          if (flashRef.current) {
            gsap.fromTo(flashRef.current, { opacity: 0.3 },
              { opacity: 0, duration: 0.16, ease: 'power2.out', overwrite: true })
          }
        }
        ScrollTrigger.create({
          trigger: track,
          start: 'top top',
          end: 'bottom bottom',
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            onProgress?.(self.progress)
            const i = Math.min(n - 1, Math.floor(imgProgress(self.progress) * n))
            if (i !== currentFrame) { currentFrame = i; cutTo(i) }
            if (tintRef.current) {
              tintRef.current.style.background =
                self.progress < 0.5
                  ? `linear-gradient(180deg, ${deep}e0 0%, ${deep}55 34%, ${signature}55 100%)`
                  : `linear-gradient(180deg, ${deep}e0 0%, ${signature}4d 34%, ${deep}f2 100%)`
            }
          },
        })
        return
      }

      frames.forEach((el, i) => {
        gsap.set(el, {
          opacity: i === 0 ? 1 : 0,
          scale: 1.16,
          xPercent: i % 2 === 0 ? -2.5 : 2.5,
          yPercent: i % 3 === 0 ? 1.5 : -1.5,
        })
      })

      ScrollTrigger.create({
        trigger: track,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.7,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress
          onProgress?.(p)
          const pos = imgProgress(p) * (n - 1)
          frames.forEach((el, i) => {
            const d = Math.abs(pos - i)
            const local = gsap.utils.clamp(0, 1, 1 - d)
            gsap.set(el, {
              opacity: local,
              scale: 1.16 - 0.14 * gsap.utils.clamp(0, 1, pos - i + 1),
              xPercent: (i % 2 === 0 ? -2.5 : 2.5) * (1 - local * 0.85),
              yPercent: (i % 3 === 0 ? 1.5 : -1.5) * (1 - local * 0.85),
            })
          })
          if (tintRef.current) {
            const mid = 1 - Math.abs(p - 0.5) * 2
            tintRef.current.style.background = `linear-gradient(180deg, ${deep}e6 0%, ${deep}4d ${22 + mid * 10}%, ${signature}${mid > 0.5 ? '4d' : '33'} ${62 + mid * 8}%, ${deep}f2 100%)`
            tintRef.current.style.boxShadow = `inset 0 0 ${180 + mid * 120}px ${light}${mid > 0.6 ? '22' : '11'}`
          }
        },
      })
    }, track)

    return () => ctx.revert()
  }, [images, palette, mode, reduced, onProgress])

  const deep = palette?.[0] ?? '#14100c'
  const signature = palette?.[1] ?? '#c98a4b'
  // Enough scroll track to give every frame room to land, and to make reaching the end
  // of a chapter feel like distance covered.
  // How far you travel to cross one stop. At 55vh an image this was 550vh — five and a
  // half screens of scrolling per chapter, twelve chapters over, just to reach Continue.
  // 32vh keeps the imagery moving at a cinematic rate and cuts the effort by about 40%.
  const trackVh = Math.max(260, (images.length || 6) * 32)

  return (
    <div ref={trackRef} className="relative" style={{ height: `${trackVh}vh` }}>
      {/*
        Sticky, not fixed. The page-transition wrapper animates transform/filter, which
        makes it a containing block for fixed descendants — a fixed stage would then size
        itself to this whole scroll track instead of the viewport. Sticky is immune.
      */}
      <div className="sticky top-0 h-svh overflow-hidden">
        <div ref={stackRef} className="absolute inset-0">
          {(images.length ? images : [null]).map((src, i) => (
            <div
              key={src || 'fallback'}
              data-frame
              className="absolute inset-0 will-change-transform"
              style={{ opacity: i === 0 ? 1 : 0 }}
            >
              {src ? (
                <img
                  src={src}
                  alt=""
                  loading={i < 2 ? 'eager' : 'lazy'}
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className="h-full w-full"
                  style={{ background: `linear-gradient(160deg, ${deep}, ${signature})` }}
                />
              )}
            </div>
          ))}
        </div>
        <div
          ref={tintRef}
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, ${deep}d9 0%, ${deep}40 26%, ${signature}2b 66%, ${deep}ed 100%)`,
          }}
        />
        <div
          ref={flashRef}
          className="absolute inset-0 opacity-0"
          style={{ background: signature, mixBlendMode: 'screen' }}
          aria-hidden
        />
        {/* everything the reader actually sees, pinned over the stage */}
        <div className="pointer-events-none absolute inset-0 z-10">{children}</div>
      </div>
    </div>
  )
}
