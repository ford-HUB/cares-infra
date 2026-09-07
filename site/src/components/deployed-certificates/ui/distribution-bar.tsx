import { cn } from '@/lib/utils'
import { formatNumber, formatPercent } from '../../../constants/formatting'
import { DISTRIBUTION_BEHIND_THRESHOLD } from '../../../constants/deployed-certificates'

interface DistributionBarProps {
  /** Certificates released to a participant. */
  distributed: number
  /** Of those, the ones the recipient has opened. */
  claimed: number
  /** The whole: every participant the deployment covers. */
  participants: number
  /** A paused or scheduled run is not behind, it simply hasn't started. */
  behindMatters?: boolean
  size?: 'sm' | 'lg'
}

/**
 * One participant roster, split three ways: opened, delivered but unopened, and still
 * waiting. Nesting `claimed` inside `distributed` keeps the reader from adding two
 * numbers to work out whether the sheets actually landed.
 */
export function DistributionBar({
  distributed,
  claimed,
  participants,
  behindMatters = true,
  size = 'sm',
}: DistributionBarProps) {
  const share = participants > 0 ? distributed / participants : 0
  const behind = behindMatters && share < DISTRIBUTION_BEHIND_THRESHOLD
  const width = (value: number) =>
    participants > 0 ? `${(value / participants) * 100}%` : '0%'

  return (
    <div className={size === 'lg' ? 'space-y-2' : 'space-y-1.5'}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] tracking-wider text-gray-500 uppercase">Distributed</p>
        <p className="flex items-baseline gap-1.5">
          <span
            className={cn(
              'font-semibold text-gray-900 tabular-nums',
              size === 'lg' ? 'text-lg leading-tight' : 'text-[13px]',
            )}
          >
            {formatNumber(distributed)}
          </span>
          <span className="text-[11px] text-gray-400 tabular-nums">
            of {formatNumber(participants)}
          </span>
        </p>
      </div>

      <div
        className={cn(
          'flex gap-0.5 overflow-hidden rounded-full bg-gray-100',
          size === 'lg' ? 'h-2' : 'h-1.5',
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-500',
            behind ? 'bg-amber-500' : 'bg-emerald-500',
          )}
          style={{ width: width(claimed) }}
        />
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-500',
            behind ? 'bg-amber-200' : 'bg-emerald-200',
          )}
          style={{ width: width(Math.max(distributed - claimed, 0)) }}
        />
      </div>

      <div className="flex items-center justify-between gap-2 text-[11px] text-gray-400 tabular-nums">
        <span>{formatNumber(claimed)} opened</span>
        <span className={behind ? 'text-amber-600' : undefined}>
          {formatPercent(share)} of participants
        </span>
      </div>
    </div>
  )
}
