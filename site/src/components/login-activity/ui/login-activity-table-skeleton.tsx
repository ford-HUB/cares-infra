import { Skeleton } from '@/components/ui/skeleton'
import {
  LOGIN_ACTIVITY_COLUMNS,
  LOGIN_CELL_BASE,
  LOGIN_CELL_BORDER,
  LOGIN_GUTTER_CELL,
} from '../../../constants/login-activity'

interface LoginActivityTableSkeletonProps {
  /** Same row count the loaded table will render, so the swap causes no jump. */
  rows: number
}

/** Column-shaped placeholders — the account cell mirrors the name + email pairing. */
function CellContent({
  columnKey,
}: {
  columnKey: (typeof LOGIN_ACTIVITY_COLUMNS)[number]['key']
}) {
  if (columnKey === 'outcome') {
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
export function LoginActivityTableSkeleton({ rows }: LoginActivityTableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, index) => (
        <tr key={`skeleton-${index}`} aria-hidden className="odd:bg-gray-50/40">
          <td className={`${LOGIN_GUTTER_CELL} ${LOGIN_CELL_BASE} px-0`} />
          {LOGIN_ACTIVITY_COLUMNS.map((column) => (
            <td key={column.key} className={`${LOGIN_CELL_BORDER} ${LOGIN_CELL_BASE}`}>
              <CellContent columnKey={column.key} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
