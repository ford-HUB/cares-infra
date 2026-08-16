import { Skeleton } from '@/components/ui/skeleton'
import {
  USER_CELL_BASE,
  USER_CELL_BORDER,
  USER_COLUMNS,
  USER_GUTTER_CELL,
} from '../../../constants/manage-users'

interface ManageUsersTableSkeletonProps {
  /** Same row count the loaded table will render, so the swap causes no jump. */
  rows: number
}

/** Column-shaped placeholders — the name cell mirrors the avatar + label pairing. */
function CellContent({ columnKey }: { columnKey: (typeof USER_COLUMNS)[number]['key'] }) {
  if (columnKey === 'actions') {
    return <Skeleton className="ml-auto h-5 w-5 rounded-md" />
  }

  if (columnKey === 'name') {
    return (
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
        <Skeleton className="h-3.5 w-32" />
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
export function ManageUsersTableSkeleton({ rows }: ManageUsersTableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, index) => (
        <tr key={`skeleton-${index}`} aria-hidden className="odd:bg-gray-50/40">
          <td className={`${USER_GUTTER_CELL} ${USER_CELL_BASE} px-0`} />
          {USER_COLUMNS.map((column) => (
            <td
              key={column.key}
              className={`${USER_CELL_BORDER} ${USER_CELL_BASE} ${
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
