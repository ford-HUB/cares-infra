import type { ReactNode } from 'react'
import { tierForRank } from '../../../constants/ranking'
import type { RankingTier } from '../../../types/ranking'
import { RankFrame } from './rank-frame'

interface RankTierFrameProps {
  rank: number
  /** The saved ladder — the tier a standing falls into is read off it. */
  tiers: RankingTier[]
  /** `sm` keeps only the rings for table rows. */
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

/**
 * The badge frame around a ranked avatar. Which ornament and colours it wears comes
 * from the tier the standing falls into, so Customization drives every board at once.
 */
export function RankTierFrame({ rank, tiers, size = 'lg', children }: RankTierFrameProps) {
  const tier = tierForRank(rank, tiers)

  return (
    <RankFrame appearance={tier} size={size} title={`${tier.label} — rank ${rank}`}>
      {children}
    </RankFrame>
  )
}
