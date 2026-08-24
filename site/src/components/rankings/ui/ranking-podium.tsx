import { Skeleton } from '@/components/ui/skeleton'
import {
  RANKING_MEDAL_FALLBACK,
  RANKING_MEDAL_STYLES,
  RANKING_PODIUM_HEIGHTS,
  RANKING_PODIUM_ORDER,
  formatPoints,
  tierForRank,
} from '../../../constants/ranking'
import type { RankingLeader, RankingTier } from '../../../types/ranking'
import { UserAvatar } from '../../portal/ui/user-avatar'
import { RankTierFrame } from './rank-tier-frame'

/**
 * The podium takes one display name for either board — a volunteer's full name or a
 * donor's, organisation included — so the avatar initials come from splitting it.
 */
function avatarNames(name: string): { firstName: string; lastName: string } {
  const [firstName = '', ...rest] = name.trim().split(/\s+/)
  return { firstName, lastName: rest.join(' ') }
}

interface RankingPodiumProps {
  /** Top three of the active board, already mapped to a board-agnostic shape. */
  leaders: RankingLeader[]
  tiers: RankingTier[]
  loading: boolean
}

export function RankingPodium({ leaders, tiers, loading }: RankingPodiumProps) {
  return (
    <div className="border-t border-gray-100 pt-5">
      <p className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
        Top Three
      </p>

      <div className="mt-5 flex items-end justify-center gap-3 sm:gap-6">
        {RANKING_PODIUM_ORDER.map((rank) => {
          const leader = leaders.find((entry) => entry.rank === rank)

          return (
            <div key={rank} className="flex w-32 flex-col items-center sm:w-40">
              {loading ? (
                <>
                  <Skeleton aria-hidden className="mb-2 h-3.5 w-24" />
                  <Skeleton aria-hidden className="mb-2 h-16 w-16 rounded-full" />
                </>
              ) : (
                <>
                  <p className="max-w-full truncate text-center text-[13px] font-medium text-gray-900">
                    {leader?.name ?? '—'}
                  </p>
                  <p className="text-[11px] text-gray-500">{leader?.subtitle ?? ''}</p>

                  {/* The frame is the rank badge — richer the higher the standing. */}
                  {leader && (
                    <>
                      <span className="mt-3">
                        <RankTierFrame rank={rank} tiers={tiers}>
                          <UserAvatar {...avatarNames(leader.name)} size="lg" />
                        </RankTierFrame>
                      </span>
                      {/* The label is tinted with the tier's own colour, so a
                          recolour in Customization carries through here too. */}
                      <span
                        style={{ color: tierForRank(rank, tiers).colorTo }}
                        className="mt-1 text-[11px] font-semibold tracking-wider uppercase"
                      >
                        {tierForRank(rank, tiers).label}
                      </span>
                    </>
                  )}
                </>
              )}

              <div
                className={`mt-2 flex w-full flex-col items-center justify-center rounded-t-lg border border-b-0 ${
                  RANKING_PODIUM_HEIGHTS[rank]
                } ${RANKING_MEDAL_STYLES[rank] ?? RANKING_MEDAL_FALLBACK} border-transparent`}
              >
                <span className="text-lg font-semibold">{rank}</span>
                {!loading && leader && (
                  <span className="text-[11px] font-medium">
                    {formatPoints(leader.points)}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
