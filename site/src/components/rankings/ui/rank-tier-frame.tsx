import type { ReactNode } from 'react'
import { tierForRank } from '../../../constants/ranking'
import type { RankingTier } from '../../../types/ranking'
import { RankFrame } from './rank-frame'

interface RankTierFrameProps {
  rank: number
  tiers: RankingTier[]
  /** `sm` keeps only the rings, for table rows. */
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

/** Ornament and colours come from the standing's tier, so Customization drives every board. */
export function RankTierFrame({ rank, tiers, size = 'lg', children }: RankTierFrameProps) {
  const tier = tierForRank(rank, tiers)

  return (
    <RankFrame appearance={tier} size={size} title={`${tier.label} — rank ${rank}`}>
      {children}
    </RankFrame>
  )
}
