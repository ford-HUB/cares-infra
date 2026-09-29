import { Skeleton } from '@/components/ui/skeleton'
import {
  LIVE_ATTENDANCE_COLUMNS,
  LIVE_CELL_BASE,
  LIVE_CELL_BORDER,
  LIVE_GUTTER_CELL,
} from '../../../constants/attendance'

interface AttendanceTableSkeletonProps {
  /** Same row count the loaded table will render, so the swap causes no jump. */
  rows: number
}

/** Column-shaped placeholders — each cell mirrors the real cell's content shape. */
function CellContent({
  columnKey,
}: {
  columnKey: (typeof LIVE_ATTENDANCE_COLUMNS)[number]['key']
}) {
  if (columnKey === 'name') {
    return (
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
        <Skeleton className="h-3.5 w-32" />
      </div>
    )
  }

  if (columnKey === 'state') {
    return <Skeleton className="h-5 w-24 rounded-full" />
  }

  if (columnKey === 'coverage') {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-1.5 flex-1 rounded-full" />
        <Skeleton className="h-3 w-9 shrink-0" />
      </div>
    )
  }

  return <Skeleton className="h-3.5 w-4/5" />
}

/**
 * Renders into the table's existing `<tbody>`, so the header, borders, and column
 * widths above it stay exactly where they are while rows load.
 */
export function AttendanceTableSkeleton({ rows }: AttendanceTableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, index) => (
        <tr key={`skeleton-${index}`} aria-hidden className="odd:bg-gray-50/40">
          <td className={`${LIVE_GUTTER_CELL} ${LIVE_CELL_BASE} px-0`} />
          {LIVE_ATTENDANCE_COLUMNS.map((column) => (
            <td key={column.key} className={`${LIVE_CELL_BORDER} ${LIVE_CELL_BASE}`}>
              <CellContent columnKey={column.key} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
