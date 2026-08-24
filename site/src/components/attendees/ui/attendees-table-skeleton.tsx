import { Skeleton } from '@/components/ui/skeleton'
import {
  ATTENDEE_CELL_BASE,
  ATTENDEE_CELL_BORDER,
  ATTENDEE_COLUMNS,
  ATTENDEE_GUTTER_CELL,
} from '../../../constants/attendees'

interface AttendeesTableSkeletonProps {
  /** Same row count the loaded table will render, so the swap causes no jump. */
  rows: number
}

/** Column-shaped placeholders — the volunteer cell mirrors the avatar + label pairing. */
function CellContent({
  columnKey,
}: {
  columnKey: (typeof ATTENDEE_COLUMNS)[number]['key']
}) {
  if (columnKey === 'name') {
    return (
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
        <Skeleton className="h-3.5 w-32" />
      </div>
    )
  }

  if (columnKey === 'status') {
    return <Skeleton className="h-5 w-20 rounded-full" />
  }

  return <Skeleton className="h-3.5 w-4/5" />
}

/**
 * Renders into the table's existing `<tbody>`, so the header, borders, and column
 * widths above it stay exactly where they are while rows load.
 */
export function AttendeesTableSkeleton({ rows }: AttendeesTableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, index) => (
        <tr key={`skeleton-${index}`} aria-hidden className="odd:bg-gray-50/40">
          <td className={`${ATTENDEE_GUTTER_CELL} ${ATTENDEE_CELL_BASE} px-0`} />
          {ATTENDEE_COLUMNS.map((column) => (
            <td
              key={column.key}
              className={`${ATTENDEE_CELL_BORDER} ${ATTENDEE_CELL_BASE}`}
            >
              <CellContent columnKey={column.key} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
