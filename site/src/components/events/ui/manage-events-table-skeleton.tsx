import { Skeleton } from '@/components/ui/skeleton'
import {
  EVENT_CELL_BASE,
  EVENT_CELL_BORDER,
  EVENT_COLUMNS,
  EVENT_GUTTER_CELL,
} from '../../../constants/manage-events'

interface ManageEventsTableSkeletonProps {
  /** Same row count the loaded table will render, so the swap causes no jump. */
  rows: number
}

/** Column-shaped placeholders — organizer and event name mirror their avatar/thumbnail. */
function CellContent({ columnKey }: { columnKey: (typeof EVENT_COLUMNS)[number]['key'] }) {
  if (columnKey === 'actions') {
    return <Skeleton className="ml-auto h-5 w-5 rounded-md" />
  }

  if (columnKey === 'organizer') {
    return (
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
        <Skeleton className="h-3.5 w-20" />
      </div>
    )
  }

  if (columnKey === 'title') {
    return (
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
        <Skeleton className="h-3.5 w-28" />
      </div>
    )
  }

  if (columnKey === 'status') {
    return <Skeleton className="h-5 w-16 rounded-full" />
  }

  return <Skeleton className="h-3.5 w-4/5" />
}

/**
 * Renders into the table's existing `<tbody>`, so the header, borders, and column
 * widths above it stay exactly where they are while rows load.
 */
export function ManageEventsTableSkeleton({ rows }: ManageEventsTableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, index) => (
        <tr key={`skeleton-${index}`} aria-hidden className="odd:bg-gray-50/40">
          <td className={`${EVENT_GUTTER_CELL} ${EVENT_CELL_BASE} px-0`} />
          {EVENT_COLUMNS.map((column) => (
            <td
              key={column.key}
              className={`${EVENT_CELL_BORDER} ${EVENT_CELL_BASE} ${
                column.key === 'actions' ? 'px-2 text-right' : ''
              }`}
            >
              <CellContent columnKey={column.key} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
