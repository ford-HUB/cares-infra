import { Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LANDING_DISPLAY, LANDING_MOTION, LANDING_SLAB } from '../../constants/landing-bulletin'
import { LANDING_VIDEO } from '../../constants/landing-home'
import { usePlayWhenVisible } from '../../hooks/use-play-when-visible'
import { useReveal } from '../../hooks/use-reveal'
import { LandingReveal } from './ui/landing-reveal'

/** The heading, word by word: once it scrolls into view each word bounces in, one after
 *  another. Under reduced motion the words are simply shown. */
function BouncingHeading() {
  const { heading } = LANDING_VIDEO
  const { ref, visible } = useReveal<HTMLHeadingElement>(0.6)
  const words = [
    ...heading.before.split(' ').map((text) => ({ text, accent: false })),
    { text: heading.accent, accent: true },
    ...heading.after.split(' ').map((text) => ({ text, accent: false })),
  ]

  return (
    <h2
      ref={ref}
      aria-label={`${heading.before} ${heading.accent} ${heading.after}`}
      className={`${LANDING_SLAB} mt-4 text-3xl leading-tight font-extrabold text-balance text-[var(--cares-primary)] sm:text-[2.75rem]`}
    >
      {words.map(({ text, accent }, index) => (
        <span key={text}>
          <span
            aria-hidden
            style={{
              animationDelay: `${LANDING_MOTION.wordBounceStartMs + index * LANDING_MOTION.wordBounceStepMs}ms`,
            }}
            className={cn(
              'inline-block',
              accent && 'text-green-600 italic',
              visible ? 'motion-safe:animate-landing-word-bounce' : 'motion-safe:opacity-0',
            )}
          >
            {text}
          </span>{' '}
        </span>
      ))}
    </h2>
  )
}

/** Home-page video: the heading on top, then the video at full width, edge to edge
 *  with no outer margin. The video keeps its own height. Shows a poster until
 *  `LANDING_VIDEO.src` is set. */
export function LandingVideo() {
  const { src, poster, title, placeholder, description, visibleRatio } = LANDING_VIDEO
  const videoRef = usePlayWhenVisible(visibleRatio)

  return (
    <section className="w-full overflow-clip bg-emerald-50 pb-10 sm:pb-12">
      <LandingReveal className="mx-auto max-w-2xl px-6 py-16 text-center sm:py-20">
        {/* Rule, outlined play badge, rule. */}
        <div aria-hidden className="flex items-center justify-center gap-4 text-[var(--cares-primary)]">
          <span className="h-0.5 w-20 rounded-full bg-gradient-to-r from-transparent via-green-700 to-[var(--cares-primary)] sm:w-32" />
          <span className="flex h-8 w-10 items-center justify-center rounded-md border-2 border-current">
            <Play className="h-3.5 w-3.5 translate-x-px" fill="currentColor" />
          </span>
          <span className="h-0.5 w-20 rounded-full bg-gradient-to-l from-transparent via-green-700 to-[var(--cares-primary)] sm:w-32" />
        </div>
        <BouncingHeading />
        <p
          className={`${LANDING_DISPLAY} mt-3 text-[14px] leading-relaxed font-medium text-pretty text-neutral-700 sm:text-[15px]`}
        >
          {description}
        </p>
      </LandingReveal>

      <LandingReveal className="relative w-full bg-black">
        {src ? (
          <video
            ref={videoRef}
            src={src}
            poster={poster}
            title={title}
            controls
            loop
            playsInline
            preload="none"
            className="block h-auto w-full"
          />
        ) : (
          <>
            <img src={poster} alt="" className="block h-auto w-full" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--cares-primary)]/75 text-white">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/40">
                <Play className="h-7 w-7 translate-x-0.5" fill="currentColor" aria-hidden />
              </span>
              <p className="text-sm font-medium">{placeholder}</p>
            </div>
          </>
        )}
      </LandingReveal>
    </section>
  )
}
