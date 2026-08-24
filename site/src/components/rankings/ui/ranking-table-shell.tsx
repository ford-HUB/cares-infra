import type { ReactNode } from 'react'
import {
  RANKING_CELL_BORDER,
  RANKING_ROW_COUNT,
} from '../../../constants/ranking'
import { RankingTableSkeleton } from './ranking-table-skeleton'

interface RankingTableShellProps {
  columns: readonly { key: string; label: string; width: string }[]
  loading: boolean
  /** True once rows exist — an empty board after loading is the empty state. */
  isEmpty: boolean
  emptyMessage: string
  children: ReactNode
}

/**
 * Table chrome shared by both boards: the rank gutter, the sticky header built from
 * the board's own columns, and the loading/empty states.
 */
export function RankingTableShell({
  columns,
  loading,
  isEmpty,
  emptyMessage,
  children,
}: RankingTableShellProps) {
  return (
    <div aria-busy={loading}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] table-fixed border-separate border-spacing-0">
          <thead className="sticky top-0 z-20">
            <tr>
              <th
                scope="col"
                className="h-9 w-20 border-b border-gray-200 bg-gray-50 px-3 text-left text-[11px] font-semibold tracking-wider text-gray-500 uppercase"
              >
                Rank
              </th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`${column.width} h-9 border-b border-gray-200 bg-gray-50 px-3 text-left text-[11px] font-semibold tracking-wider text-gray-500 uppercase`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading && (
              <RankingTableSkeleton
                rows={RANKING_ROW_COUNT}
                columns={columns.length}
              />
            )}

            {!loading && isEmpty && (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className={`${RANKING_CELL_BORDER} h-32 text-center text-sm text-gray-500`}
                >
                  {emptyMessage}
                </td>
              </tr>
            )}

            {!loading && !isEmpty && children}
          </tbody>
        </table>
      </div>
    </div>
  )
}
