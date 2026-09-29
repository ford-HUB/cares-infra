import { Skeleton } from '@/components/ui/skeleton'
import {
  ACTIVE_SESSIONS_COLUMNS,
  SESSION_CELL_BASE,
  SESSION_CELL_BORDER,
  SESSION_GUTTER_CELL,
} from '../../../constants/active-sessions'

interface ActiveSessionsTableSkeletonProps {
  /** Same row count the loaded table will render, so the swap causes no jump. */
  rows: number
}

/** Column-shaped placeholders — the account cell mirrors the name + email pairing. */
function CellContent({
  columnKey,
}: {
  columnKey: (typeof ACTIVE_SESSIONS_COLUMNS)[number]['key']
}) {
  if (columnKey === 'actions') {
    return <Skeleton className="h-6 w-16 rounded-lg" />
  }

  if (columnKey === 'device') {
    return <Skeleton className="h-5 w-24 rounded-full" />
  }

  if (columnKey === 'account') {
    return (
      <div className="flex flex-col gap-1">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-2.5 w-40" />
      </div>
    )
  }

  return <Skeleton className="h-3.5 w-4/5" />
}

/**
 * Renders into the table's existing `<tbody>`, so the header, borders, and column
 * widths above it stay exactly where they are while rows load.
 */
export function ActiveSessionsTableSkeleton({
  rows,
}: ActiveSessionsTableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, index) => (
        <tr key={`skeleton-${index}`} aria-hidden className="odd:bg-gray-50/40">
          <td className={`${SESSION_GUTTER_CELL} ${SESSION_CELL_BASE} px-0`} />
          {ACTIVE_SESSIONS_COLUMNS.map((column) => (
            <td key={column.key} className={`${SESSION_CELL_BORDER} ${SESSION_CELL_BASE}`}>
              <CellContent columnKey={column.key} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
