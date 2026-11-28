import type { CSSProperties } from 'react'
import {
  LANDING_BANNER_SERIF,
  LANDING_DISPLAY,
  LANDING_MOTION,
} from '../../../constants/landing-bulletin'
import { useReveal } from '../../../hooks/use-reveal'

interface LandingBannerTitleProps {
  title: string
  accent?: string
  description: string
}

const delay = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` })

const GOLD = 'bg-gradient-to-r from-yellow-100 via-yellow-200 to-amber-300'
const SHIMMER =
  'bg-[linear-gradient(110deg,transparent_40%,rgba(255,255,255,0.85)_50%,transparent_60%)] bg-[length:250%_100%] bg-no-repeat'

export function LandingBannerTitle({ title, accent, description }: LandingBannerTitleProps) {
  const { ref, visible } = useReveal<HTMLDivElement>(0.4)
  const words = title.split(' ')
  const accentAt = words.length * LANDING_MOTION.bannerWordStepMs + LANDING_MOTION.bannerAccentGapMs
  const play = (animation: string, hidden = 'motion-safe:opacity-0') =>
    visible ? animation : hidden

  return (
    <div ref={ref}>
      <h2
        aria-label={[title, accent].filter(Boolean).join(' ')}
        className={`${LANDING_BANNER_SERIF} mx-auto max-w-3xl text-3xl leading-tight font-bold text-balance sm:text-[2.75rem]`}
      >
        {words.map((word, index) => (
          <span key={`${word}-${index}`}>
            {index > 0 && ' '}
            {/* Slack below (cancelled by the negative margin) keeps descenders unclipped. */}
            <span aria-hidden className="-mb-[0.15em] inline-block overflow-hidden pb-[0.15em] align-bottom">
              <span
                style={delay(index * LANDING_MOTION.bannerWordStepMs)}
                className={`inline-block ${play('motion-safe:animate-landing-mask-rise')}`}
              >
                {word}
              </span>
            </span>
          </span>
        ))}
        {accent && (
          <>
            {' '}
            <em
              aria-hidden
              style={delay(accentAt)}
              className={`relative inline-block ${GOLD} bg-clip-text pr-1 text-transparent italic ${play('motion-safe:animate-landing-soft-rise')}`}
            >
              {accent}
              <span
                style={delay(accentAt + LANDING_MOTION.bannerShimmerAfterAccentMs)}
                className={`pointer-events-none absolute inset-0 pr-1 ${SHIMMER} bg-clip-text text-transparent ${play('motion-safe:animate-landing-shimmer', '')}`}
              >
                {accent}
              </span>
            </em>
          </>
        )}
      </h2>
      <span
        aria-hidden
        style={delay(accentAt + LANDING_MOTION.bannerLineAfterAccentMs)}
        className={`mx-auto mt-5 block h-0.5 w-16 rounded-full bg-lime-400 ${play('motion-safe:animate-landing-line-grow', 'motion-safe:scale-x-0')}`}
      />
      <p
        style={delay(accentAt + LANDING_MOTION.bannerTextAfterAccentMs)}
        className={`${LANDING_DISPLAY} mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed font-medium text-pretty text-white sm:text-base ${play('motion-safe:animate-landing-soft-rise')}`}
      >
        {description}
      </p>
    </div>
  )
}
