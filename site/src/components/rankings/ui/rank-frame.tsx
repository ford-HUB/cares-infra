import { useId, type ReactNode } from 'react'
import type { RankFrameAppearance } from '../../../types/ranking'
import { RankFrameArt } from './rank-frame-designs'

interface RankFrameProps {
  /** Design and colours only — no standing, so previews can render it directly. */
  appearance: RankFrameAppearance
  /** `sm` drops the ornaments outside the ring; `md` is the customization preview. */
  size?: 'sm' | 'md' | 'lg'
  title?: string
  children?: ReactNode
}

const FRAME_SIZE = { sm: 'h-9 w-9', md: 'h-14 w-14', lg: 'h-16 w-16' }

/** A frame drawn from an appearance. `RankTierFrame` is this plus a tier lookup. */
export function RankFrame({ appearance, size = 'lg', title, children }: RankFrameProps) {
  const uid = useId()
  const gradientId = `frame-${uid}`
  const glowId = `glow-${uid}`

  return (
    <span
      title={title}
      className={`relative inline-flex shrink-0 items-center justify-center ${FRAME_SIZE[size]}`}
    >
      <svg
        aria-hidden
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full overflow-visible"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={appearance.colorFrom} />
            <stop offset="100%" stopColor={appearance.colorTo} />
          </linearGradient>
          <radialGradient id={glowId}>
            <stop offset="60%" stopColor={appearance.colorFrom} stopOpacity="0" />
            <stop offset="100%" stopColor={appearance.colorFrom} stopOpacity="0.35" />
          </radialGradient>
        </defs>

        <RankFrameArt
          design={appearance.frame}
          fill={`url(#${gradientId})`}
          glow={`url(#${glowId})`}
          detailed={size !== 'sm'}
        />
      </svg>

      <span className="relative">{children}</span>
    </span>
  )
}
