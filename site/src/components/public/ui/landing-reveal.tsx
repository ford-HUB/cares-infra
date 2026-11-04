import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useReveal } from '../../../hooks/use-reveal'
import { LANDING_MOTION } from '../../../constants/landing-bulletin'

interface LandingRevealProps {
  children: ReactNode
  className?: string
  /** Position in a staggered group; each step adds LANDING_MOTION.staggerMs. */
  index?: number
  /** Delay between steps; defaults to LANDING_MOTION.staggerMs. */
  staggerMs?: number
  as?: 'div' | 'li'
}

/** Fades and lifts its children in the first time they scroll into view. Under
 *  reduced motion the content is simply shown. */
export function LandingReveal({
  children,
  className,
  index = 0,
  staggerMs = LANDING_MOTION.staggerMs,
  as = 'div',
}: LandingRevealProps) {
  const { ref, visible } = useReveal<HTMLDivElement & HTMLLIElement>()
  const Tag = as

  return (
    <Tag
      ref={ref}
      style={{
        transitionDelay: visible ? `${index * staggerMs}ms` : undefined,
        transitionDuration: `${LANDING_MOTION.revealMs}ms`,
      }}
      className={cn(
        'motion-safe:transition-[opacity,translate] motion-safe:ease-out',
        visible ? 'opacity-100 translate-y-0' : 'motion-safe:translate-y-6 motion-safe:opacity-0',
        className,
      )}
    >
      {children}
    </Tag>
  )
}
