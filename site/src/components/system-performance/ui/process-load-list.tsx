import { formatNumber } from '../../../constants/formatting'
import {
  CPU_BAND_COLOR,
  PROCESS_OWNER_LABELS,
  formatPercentPoints,
} from '../../../constants/system-performance'
import type { ProcessLoad } from '../../../types/system-performance'

interface ProcessLoadListProps {
  processes: ProcessLoad[]
  /** Total busy CPU, so each row can say what share of the work it is doing. */
  busyPercent: number
}

/**
 * Who is spending the CPU. Each row is drawn as a share of busy time rather than an
 * absolute number, because "24 % of the host" only means something once you know the
 * host is 62 % busy — the bar answers both at once.
 */
export function ProcessLoadList({ processes, busyPercent }: ProcessLoadListProps) {
  const ranked = [...processes].sort((a, b) => b.cpuPercent - a.cpuPercent)

  return (
    <div>
      <p className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
        What is spending it
      </p>

      <ul className="mt-3 space-y-2.5">
        {ranked.map((process) => {
          const share = busyPercent > 0 ? process.cpuPercent / busyPercent : 0
          return (
            <li key={process.id} className="space-y-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-[13px] text-gray-700">
                  {process.name}
                </span>
                <span className="shrink-0 text-[13px] font-semibold text-gray-900 tabular-nums">
                  {formatPercentPoints(process.cpuPercent)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${Math.min(100, share * 100)}%`,
                    backgroundColor: CPU_BAND_COLOR.user,
                  }}
                />
              </div>
              <p className="text-[11px] text-gray-400 tabular-nums">
                {PROCESS_OWNER_LABELS[process.owner]} ·{' '}
                {formatNumber(process.memoryMb)} MB · {process.threads} threads
              </p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
