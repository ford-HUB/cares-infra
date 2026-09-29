import { Skeleton } from '@/components/ui/skeleton'
import { RANKING_CELL_BASE, RANKING_CELL_BORDER } from '../../../constants/ranking'

interface RankingTableSkeletonProps {
  rows: number
  columns: number
}

/**
 * Renders into the table's existing `<tbody>`, so the header and column widths stay
 * put while the standings load.
 */
export function RankingTableSkeleton({ rows, columns }: RankingTableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <tr key={`skeleton-${row}`} aria-hidden className="odd:bg-gray-50/40">
          <td className={`${RANKING_CELL_BASE} w-20`}>
            <Skeleton className="h-7 w-7 rounded-full" />
          </td>
          {Array.from({ length: columns }, (_, column) => (
            <td
              key={`skeleton-${row}-${column}`}
              className={`${RANKING_CELL_BORDER} ${RANKING_CELL_BASE}`}
            >
              <Skeleton className="h-3.5 w-4/5" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
